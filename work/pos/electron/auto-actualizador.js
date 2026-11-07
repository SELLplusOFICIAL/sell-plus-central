// Sell-Plus — Auto-Actualizador
// • Latido a la Central cada 15 minutos (y al arrancar)
// • Busca actualizaciones al arrancar y cada 6 horas
// • Descarga, verifica SHA-256 y ejecuta el instalador en silencio (los datos se conservan)
const https = require('https')
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execSync } = require('child_process')

const FACTORY_URL = 'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'
const INTERVALO_LATIDO = 15 * 60 * 1000 // 15 minutos
const INTERVALO_CHEQUEO = 6 * 60 * 60 * 1000 // 6 horas
const DEMORA_PRIMER_CHEQUEO = 45 * 1000 // 45 s tras arrancar

let ctx = null
let logPath = null
let instalando = false

function loguear(msg) {
  const linea = `[${new Date().toISOString()}] ${msg}`
  try {
    fs.appendFileSync(logPath, linea + '\n')
  } catch (e) {}
  try {
    if (ctx && ctx.loguear) ctx.loguear('[actualizador] ' + msg)
  } catch (e) {}
}

function getJSON(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'SellPlus-AutoActualizador' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return getJSON(new URL(res.headers.location, url).toString(), timeoutMs).then(resolve, reject)
      }
      let cuerpo = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (cuerpo += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, datos: JSON.parse(cuerpo) })
        } catch (e) {
          resolve({ status: res.statusCode, datos: null })
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('tiempo agotado')) })
  })
}

function descargarArchivo(url, destino, timeoutMs = 15 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'SellPlus-AutoActualizador' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return descargarArchivo(new URL(res.headers.location, url).toString(), destino, timeoutMs).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error('HTTP ' + res.statusCode))
      }
      const archivo = fs.createWriteStream(destino)
      res.pipe(archivo)
      archivo.on('finish', () => archivo.close(() => resolve()))
      archivo.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('tiempo agotado descargando')) })
  })
}

function sha256(ruta) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const s = fs.createReadStream(ruta)
    s.on('data', (d) => hash.update(d))
    s.on('end', () => resolve(hash.digest('hex')))
    s.on('error', reject)
  })
}

async function latido() {
  try {
    const u = `${ctx.urlCentral}/api/heartbeat?version=${encodeURIComponent(ctx.version)}&hostname=${encodeURIComponent(os.hostname())}`
    await getJSON(u, 10000)
    loguear('Latido enviado a la Central')
  } catch (e) {
    loguear('Latido falló: ' + String(e).slice(0, 120))
  }
}

async function checar() {
  if (instalando) return
  try {
    const u = `${ctx.urlCentral}/api/updates/check?version=${encodeURIComponent(ctx.version)}`
    const { status, datos } = await getJSON(u)
    if (status !== 200 || !datos) {
      loguear(`Chequeo sin respuesta útil (HTTP ${status})`)
      return
    }
    const hay = datos.hasUpdate === true || datos.has_update === true || datos.updateAvailable === true
    if (!hay) {
      loguear('Sin actualizaciones (versión ' + ctx.version + ' al día)')
      return
    }
    const descargarUrl =
      datos.downloadUrl || datos.download_url || datos.url ||
      (datos.latest && datos.latest.downloadUrl) || ''
    const suma =
      datos.sha256 || datos.sha256Checksum || datos.checksum ||
      (datos.latest && datos.latest.sha256) || ''
    if (!descargarUrl) {
      loguear('Hay actualización pero la Central no dio URL de descarga')
      return
    }
    loguear(`¡Actualización disponible! Descargando…`)
    instalando = true
    const destino = path.join(os.tmpdir(), 'Sell-Plus-instalador.exe')
    await descargarArchivo(descargarUrl, destino)
    loguear('Descarga completa: ' + fs.statSync(destino).size + ' bytes')
    if (suma) {
      const real = await sha256(destino)
      if (real.toLowerCase() !== String(suma).toLowerCase()) {
        loguear(`SHA-256 NO coincide (esperado ${String(suma).toLowerCase().slice(0, 16)}…, real ${real.slice(0, 16)}…). Se cancela la instalación.`)
        instalando = false
        return
      }
      loguear('SHA-256 verificado, instalador auténtico')
    }
    // Ejecutar el instalador en silencio; NSIS cierra Sell-Plus y reemplaza los archivos
    try { execSync('taskkill /IM Sell-Plus.exe /F', { stdio: 'ignore' }) } catch (e) {}
    spawn(destino, ['/S'], { detached: true, stdio: 'ignore' }).unref()
    loguear('Instalador ejecutado en silencio; la app se cerrará y volverá sola.')
    setTimeout(() => {
      try { ctx.app.exit(0) } catch (e) {}
    }, 1200)
  } catch (e) {
    loguear('Chequeo falló: ' + String(e).slice(0, 160))
    instalando = false
  }
}

function iniciar(contexto) {
  ctx = contexto
  const logsDir = path.join(ctx.APP_DIR, 'logs')
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
  } catch (e) {}
  logPath = path.join(logsDir, 'actualizador.log')
  loguear(`Auto-Actualizador activo — Sell-Plus v${ctx.version} — Central: ${ctx.urlCentral || FACTORY_URL}`)
  setTimeout(latido, 3000)
  setInterval(latido, INTERVALO_LATIDO)
  setTimeout(checar, DEMORA_PRIMER_CHEQUEO)
  setInterval(checar, INTERVALO_CHEQUEO)
}

module.exports = { iniciar }
