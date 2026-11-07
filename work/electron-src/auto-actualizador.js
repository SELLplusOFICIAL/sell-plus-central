// ============================================================
//  Sell-Plus 3.3.2 — Auto-Actualizador
//  Revisa la Central cada 15 minutos (y cada 6 h también) y
//  actualiza el programa solo, conservando SIEMPRE tu base de
//  datos (hace respaldo antes de instalar).
//  v3.3.2: coopera con el Paladín — nunca reinstala una versión
//  que fue apartada por fallar repetidamente (version-rechazada.txt).
// ============================================================
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const crypto = require('crypto')

const URL_FABRICA =
  'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'

const CADA_LATIDO = 15 * 60 * 1000 // 15 minutos
const CADA_COMPLETA = 6 * 60 * 60 * 1000 // 6 horas
const MAX_RESPALDOS = 5

/** Comparador numérico de versiones: cmp('3.10.0','3.9.0') = 1 */
function cmpVersiones(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d
  }
  return 0
}

let ctx = null
let temporizadorLatido = null
let temporizadorCompleta = null
let ocupado = false
let ultimaVersionInstalada = ''

function leerCentral() {
  try {
    const v = fs.readFileSync(ctx.urlArchivo, 'utf-8').trim()
    return v || URL_FABRICA
  } catch {
    return URL_FABRICA
  }
}

function alog(linea) {
  try {
    const archivo = path.join(ctx.dbDir, '..', 'logs', 'actualizador.log')
    fs.mkdirSync(path.dirname(archivo), { recursive: true })
    fs.appendFileSync(archivo, `[${new Date().toISOString()}] ${linea}\n`, 'utf-8')
  } catch {}
  if (ctx && typeof ctx.log === 'function') ctx.log('[actualizador] ' + linea)
}

/** Petición GET con timeout */
function pedir(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Sell-Plus-Actualizador/3.3.2' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return pedir(res.headers.location, timeoutMs).then(resolve, reject)
      }
      const trozos = []
      res.on('data', (t) => trozos.push(t))
      res.on('end', () => resolve({ status: res.statusCode, cuerpo: Buffer.concat(trozos) }))
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'))
    })
  })
}

/** Descarga grande a archivo con seguimiento */
function descargar(url, destino, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Sell-Plus-Actualizador/3.3.2' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return descargar(res.headers.location, destino, timeoutMs).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error('HTTP ' + res.statusCode))
      }
      const out = fs.createWriteStream(destino)
      res.pipe(out)
      out.on('finish', () => out.close(() => resolve(destino)))
      out.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout de descarga')))
  })
}

function sha256De(archivo) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const s = fs.createReadStream(archivo)
    s.on('data', (t) => hash.update(t))
    s.on('end', () => resolve(hash.digest('hex')))
    s.on('error', reject)
  })
}

function respaldarBase() {
  try {
    if (!fs.existsSync(ctx.dbPath)) return
    const sello = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const destino = ctx.dbPath + '.respaldo-' + sello
    fs.copyFileSync(ctx.dbPath, destino)
    alog(`Respaldo de la base de datos creado: ${path.basename(destino)}`)

    // Rotar: conserva los últimos MAX_RESPALDOS
    const respaldos = fs
      .readdirSync(ctx.dbDir)
      .filter((f) => f.startsWith('custom.db.respaldo-'))
      .sort()
    while (respaldos.length > MAX_RESPALDOS) {
      const viejo = respaldos.shift()
      try {
        fs.unlinkSync(path.join(ctx.dbDir, viejo))
      } catch {}
    }
  } catch (e) {
    alog('No se pudo respaldar la base: ' + (e && e.message))
  }
}

async function revisar() {
  if (ocupado) return
  ocupado = true
  try {
    const base = leerCentral().replace(/\/$/, '')
    const url = `${base}/api/updates/check?version=${encodeURIComponent(ctx.version)}`
    const { status, cuerpo } = await pedir(url)
    if (status !== 200) {
      alog(`Chequeo: la Central respondió HTTP ${status}`)
      return
    }
    const d = JSON.parse(cuerpo.toString('utf-8'))
    if (!d.hasUpdate) {
      alog(`Chequeo: al día (v${ctx.version}, Central reporta v${d.ultimaVersion || d.version || '?'})`)
      return
    }

    const nueva = d.ultimaVersion || d.version || '?'
    if (nueva === ultimaVersionInstalada) {
      alog(`La v${nueva} ya se instaló en esta sesión; esperando reinicio`)
      return
    }

    // Paladín: nunca reinstalar una versión apartada por fallar repetidamente
    try {
      const rechazadaPath = path.join(ctx.dbDir, 'version-rechazada.txt')
      if (fs.existsSync(rechazadaPath)) {
        const rechazada = fs.readFileSync(rechazadaPath, 'utf-8').trim()
        if (rechazada && cmpVersiones(nueva, rechazada) === 0) {
          alog(`La v${rechazada} fue apartada por el Paladín; no se reinstala sola.`)
          return
        }
        if (rechazada && cmpVersiones(nueva, rechazada) > 0) {
          fs.unlinkSync(rechazadaPath)
          alog(`La v${nueva} supera a la rechazada v${rechazada}; reintento autorizado.`)
        }
      }
    } catch {}

    const urlDescarga = d.url || d.downloadUrl || d.descargaUrl
    if (!urlDescarga) {
      alog(`Hay v${nueva} pero la Central no envió enlace de descarga`)
      return
    }

    alog(`¡Nueva versión detectada: ${nueva}! Descargando…`)
    const destino = path.join(ctx.dbDir, '..', 'actualizacion.descargada.exe')
    await descargar(urlDescarga, destino)

    // Verificación de integridad
    if (d.sha256) {
      const hash = await sha256De(destino)
      if (hash.toLowerCase() !== String(d.sha256).toLowerCase()) {
        alog(`ERROR: la huella no coincide (${hash} != ${d.sha256}). Descarga descartada.`)
        try { fs.unlinkSync(destino) } catch {}
        return
      }
      alog('Huella SHA-256 verificada correctamente')
    }

    const tamano = fs.statSync(destino).size
    if (tamano < 10 * 1024 * 1024) {
      alog('El instalador descargado pesa muy poco; descartado por seguridad')
      try { fs.unlinkSync(destino) } catch {}
      return
    }

    // Protección de datos: respaldo antes de instalar
    respaldarBase()
    ultimaVersionInstalada = nueva
    alog(`Instalando versión ${nueva} en silencio (se reabrirá solo)…`)

    // Cierra la ventana para detener el servidor con limpieza
    try {
      const v = ctx.ventanaGetter && ctx.ventanaGetter()
      if (v) v.close()
    } catch {}

    // v3.3.1: el instalador se lanza DESACOPLADO (detached) para que el
    // taskkill del propio instalador nunca lo mate a él mismo (causaba
    // actualizaciones que se quedaban a medias). Después cerramos Sell-Plus
    // con limpieza; el instalador reabre el programa al terminar.
    setTimeout(() => {
      try {
        const hijo = spawn(destino, ['/S'], {
          detached: true,
          windowsHide: true,
          stdio: 'ignore',
        })
        hijo.unref()
        alog('Instalador lanzado de forma independiente; cerrando Sell-Plus…')
      } catch (e) {
        alog('No se pudo ejecutar el instalador: ' + (e && e.message))
        ocupado = false
        return
      }
      setTimeout(() => {
        require('electron').app.quit()
      }, 1200)
    }, 900)
  } catch (e) {
    alog('Fallo temporal del chequeo: ' + (e && e.message))
  } finally {
    ocupado = false
  }
}

function iniciar(contexto) {
  ctx = contexto
  alog(`Auto-actualizador activo (v${ctx.version}). Central: ${leerCentral()}`)

  // Primer chequeo a los 2 minutos de abrir
  setTimeout(revisar, 2 * 60 * 1000).unref?.()
  // Latido cada 15 minutos
  temporizadorLatido = setInterval(revisar, CADA_LATIDO)
  temporizadorLatido.unref?.()
  // Chequeo completo cada 6 horas
  temporizadorCompleta = setInterval(revisar, CADA_COMPLETA)
  temporizadorCompleta.unref?.()
}

module.exports = { iniciar, revisar }
