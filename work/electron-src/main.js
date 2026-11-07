// ============================================================
//  Sell-Plus 3.3.2 — Proceso principal de Electron
//  Arranca el servidor local (Next.js) y abre la ventana del POS.
//
//  PALADÍN (nuevo en 3.3.2): guardián silencioso que vigila el
//  programa para que ninguna falla lo atore o lo bote:
//   1. Captura errores inesperados y los registra sin cerrar la app.
//   2. Si el servidor local se muere, lo re-levanta solo (hasta 3 veces).
//   3. Monitor de salud cada 30 s: si el servidor se cuelga, lo reinicia.
//   4. Si la base de datos se corrompe, restaura el último respaldo solo.
//   5. Centinela post-actualización: valida cada versión nueva durante
//      sus primeros arranques; si falla 3 veces, revierte sola a la
//      versión estable anterior (rollback) sin tocar tu base de datos.
// ============================================================
const { app, BrowserWindow, Menu, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

const APP_DIR = path.join(__dirname, '..')
const DB_DIR = path.join(APP_DIR, 'db')
const DB_PATH = path.join(DB_DIR, 'custom.db')
const DB_FABRICA = path.join(DB_DIR, 'custom.db.fabrica')
const URL_ARCHIVO = path.join(DB_DIR, 'central-url.txt')
const LOGS_DIR = path.join(APP_DIR, 'logs')
const LOG_SERVIDOR = path.join(LOGS_DIR, 'sellplus-servidor.log')
const LOG_PALADIN = path.join(LOGS_DIR, 'paladin.log')
const POS_DIR = path.join(APP_DIR, 'work', 'pos')
const UPDATES_DIR = path.join(APP_DIR, 'updates')
const FLAG_POST_ACTUALIZACION = path.join(DB_DIR, 'post-actualizacion.flag')
const ESTADO_PALADIN = path.join(DB_DIR, 'paladin-estado.json')
const VERSION_ESTABLE = path.join(DB_DIR, 'ultima-version-estable.txt')
const VERSION_RECHAZADA = path.join(DB_DIR, 'version-rechazada.txt')
const PUERTO = 3000

const URL_FABRICA = 'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'

// --- Umbrales del Paladín ---
const MAX_REINICIOS_SERVIDOR = 3 // por ciclo de una hora
const FALLOS_SALUD_PARA_REINICIAR = 5 // 5 chequeos fallidos (30 s cada uno)
const ARRANQUES_TOLERADOS_POST_ACTUALIZACION = 3

let servidor = null
let ventana = null
let servidorListo = false
let saliendo = false

// --- Estado del Paladín ---
let reiniciosServidor = 0
let ventanaReiniciosServidor = Date.now()
let fallosSaludSeguidos = 0
let bdErrorPrevio = false

let log = () => {}

function logPaladin(linea) {
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
    // Rotación: conserva máximo 256 KB
    try {
      const st = fs.statSync(LOG_PALADIN)
      if (st.size > 256 * 1024) {
        const c = fs.readFileSync(LOG_PALADIN, 'utf-8')
        fs.writeFileSync(LOG_PALADIN, c.slice(-128 * 1024), 'utf-8')
      }
    } catch {}
    fs.appendFileSync(LOG_PALADIN, `[${new Date().toISOString()}] ${linea}\n`, 'utf-8')
  } catch {}
  log('[paladin] ' + linea)
}

// ============================================================
//  PALADÍN 1 — Captura global de errores inesperados
// ============================================================
process.on('uncaughtException', (e) => {
  logPaladin('ERROR inesperado capturado (la app sigue viva): ' + (e && (e.stack || e.message)))
})
process.on('unhandledRejection', (e) => {
  logPaladin('Promesa rechazada capturada (la app sigue viva): ' + (e && (e.reason ? e.reason.message || e.reason : e)))
})

// ============================================================
//  Utilidades base
// ============================================================
function logServidorRecortado() {
  try {
    if (fs.existsSync(LOG_SERVIDOR)) {
      const st = fs.statSync(LOG_SERVIDOR)
      if (st.size > 512 * 1024) {
        const contenido = fs.readFileSync(LOG_SERVIDOR, 'utf-8')
        fs.writeFileSync(LOG_SERVIDOR, contenido.slice(-256 * 1024), 'utf-8')
      }
    }
  } catch {}
}

function prepararArchivos() {
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    // Base de datos: si no existe (instalación nueva), se copia la de fábrica.
    if (!fs.existsSync(DB_PATH) && fs.existsSync(DB_FABRICA)) {
      fs.copyFileSync(DB_FABRICA, DB_PATH)
    }
    // Dirección de la Central: solo se crea si falta (nunca se pisa la del dueño)
    if (!fs.existsSync(URL_ARCHIVO)) {
      fs.writeFileSync(URL_ARCHIVO, URL_FABRICA, 'utf-8')
    }
  } catch (e) {
    log('ERROR preparando archivos: ' + (e && e.message))
  }
}

function urlCentral() {
  try {
    const v = fs.readFileSync(URL_ARCHIVO, 'utf-8').trim()
    return v || URL_FABRICA
  } catch {
    return URL_FABRICA
  }
}

// ============================================================
//  Servidor local
// ============================================================
function iniciarServidor() {
  const dbUrl = 'file:' + DB_PATH.replace(/\\/g, '/')
  log(`Servidor iniciado en puerto ${PUERTO}  DB=${dbUrl}  PID=${process.pid}`)

  servidor = spawn(process.execPath, [path.join(POS_DIR, 'server.js')], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      ELECTRON_NO_ATTACH_CONSOLE: '1',
      DATABASE_URL: dbUrl,
      PORT: String(PUERTO),
      HOSTNAME: '127.0.0.1',
      SELLPLUS_CENTRAL: urlCentral(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  const reenviar = () => (chunk) => {
    const texto = String(chunk)
    for (const linea of texto.split('\n')) {
      if (linea.trim()) log(`[server] ${linea}`)
    }
  }
  servidor.stdout.on('data', reenviar())
  servidor.stderr.on('data', reenviar())

  servidor.on('exit', (codigo) => {
    log(`Servidor terminado (codigo ${codigo})`)
    servidor = null
    if (saliendo) return

    // ========================================================
    //  PALADÍN 2 — Re-levar el servidor solo (hasta 3 veces)
    // ========================================================
    const ahora = Date.now()
    if (ahora - ventanaReiniciosServidor > 60 * 60 * 1000) {
      ventanaReiniciosServidor = ahora
      reiniciosServidor = 0
    }
    if (reiniciosServidor < MAX_REINICIOS_SERVIDOR) {
      reiniciosServidor++
      logPaladin(`El servidor local se detuvo (código ${codigo}). Re-levántandolo solo (intento ${reiniciosServidor}/${MAX_REINICIOS_SERVIDOR})…`)
      setTimeout(async () => {
        try {
          iniciarServidor()
          const ok = await esperarServidor(40)
          if (ok) {
            servidorListo = true
            fallosSaludSeguidos = 0
            logPaladin('Servidor re-levantado con éxito por el Paladín.')
            try {
              if (ventana && !ventana.isDestroyed()) ventana.loadURL(`http://127.0.0.1:${PUERTO}/`)
            } catch {}
          } else {
            logPaladin('El servidor no respondió tras el re-levantamiento automático.')
            avisarServidorCaido()
          }
        } catch (e) {
          logPaladin('Fallo re-levando el servidor: ' + (e && e.message))
          avisarServidorCaido()
        }
      }, 1500)
      return
    }

    logPaladin('Límite de re-levantamientos alcanzado en esta hora.')
    avisarServidorCaido()
  })
}

function avisarServidorCaido() {
  if (ventana && !ventana.isDestroyed() && servidorListo) {
    servidorListo = false
    dialog
      .showMessageBox(ventana, {
        type: 'warning',
        title: 'Sell-Plus',
        message: 'El servidor local se detuvo inesperadamente.',
        detail: 'El Paladín intentó re-levantarlo sin éxito. Cierra y vuelve a abrir Sell-Plus. Tus datos están seguros en la base de datos.',
        buttons: ['Cerrar Sell-Plus'],
        noLink: true,
      })
      .then(() => {
        app.quit()
      })
  }
}

function esperarServidor(intentos = 100) {
  return new Promise((resolve) => {
    let n = 0
    const ciclo = () => {
      n++
      const req = http.get(`http://127.0.0.1:${PUERTO}/`, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) return resolve(true)
        siguiente()
      })
      req.on('error', () => siguiente())
      req.setTimeout(1500, () => req.destroy())
    }
    const siguiente = () => {
      if (n >= intentos) return resolve(false)
      setTimeout(ciclo, 300)
    }
    ciclo()
  })
}

// ============================================================
//  PALADÍN 3 — Monitor de salud + PALADÍN 4 — Base de datos
// ============================================================
function chequearSalud() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PUERTO}/api/salud`, (res) => {
      const trozos = []
      res.on('data', (t) => trozos.push(t))
      res.on('end', () => {
        try {
          const d = JSON.parse(Buffer.concat(trozos).toString('utf-8'))
          resolve({ vivo: res.statusCode === 200, db: d.db || '?' })
        } catch {
          resolve({ vivo: false, db: '?' })
        }
      })
    })
    req.on('error', () => resolve({ vivo: false, db: '?' }))
    req.setTimeout(4000, () => {
      req.destroy()
      resolve({ vivo: false, db: '?' })
    })
  })
}

function restaurarBaseSiCorrupta() {
  try {
    // Elige el respaldo más reciente que el Paladín o el instalador hayan dejado
    const candidatos = fs
      .readdirSync(DB_DIR)
      .filter((f) => f.startsWith('custom.db.respaldo-') || f === 'custom.db.fabrica')
      .sort()
      .reverse()
    if (candidatos.length === 0) {
      logPaladin('BD en error y sin respaldos disponibles; se necesita atención manual.')
      return false
    }
    const elegido = path.join(DB_DIR, candidatos[0])
    // Copia de seguridad de la BD problemática antes de pisarla
    try {
      fs.copyFileSync(DB_PATH, DB_PATH + '.problematica-' + Date.now())
    } catch {}
    fs.copyFileSync(elegido, DB_PATH)
    logPaladin(`BD restaurada automáticamente desde: ${candidatos[0]}`)
    return true
  } catch (e) {
    logPaladin('No se pudo restaurar la BD: ' + (e && e.message))
    return false
  }
}

async function reiniciarServidorPorSalud(motivo) {
  logPaladin(`Paladín reinicia el servidor (${motivo})…`)
  try {
    if (servidor) servidor.kill()
  } catch {}
  await new Promise((r) => setTimeout(r, 1200))
  iniciarServidor()
  const ok = await esperarServidor(40)
  if (ok) {
    servidorListo = true
    fallosSaludSeguidos = 0
    logPaladin('Servidor recuperado tras el reinicio de salud.')
    try {
      if (ventana && !ventana.isDestroyed()) ventana.loadURL(`http://127.0.0.1:${PUERTO}/`)
    } catch {}
  } else {
    logPaladin('El servidor siguió sin responder tras el reinicio de salud.')
  }
}

function iniciarMonitorSalud() {
  setInterval(async () => {
    if (saliendo || !servidor || !servidorListo) return
    const s = await chequearSalud()
    if (s.vivo && s.db === 'ok') {
      if (fallosSaludSeguidos > 0) fallosSaludSeguidos = 0
      if (bdErrorPrevio) {
        bdErrorPrevio = false
        logPaladin('Base de datos recuperada: responde con normalidad.')
      }
      await validarPostActualizacion(true)
      return
    }
    if (s.vivo && s.db === 'error') {
      logPaladin('La base de datos NO responde a consultas (posible corrupción).')
      const restaurada = restaurarBaseSiCorrupta()
      bdErrorPrevio = true
      if (restaurada) {
        await reiniciarServidorPorSalud('restauración de la base de datos')
        try {
          if (ventana && !ventana.isDestroyed()) {
            dialog.showMessageBox(ventana, {
              type: 'info',
              title: 'Sell-Plus · Paladín',
              message: 'Tu base de datos fue restaurada automáticamente.',
              detail: 'El Paladín detectó un problema en la base y la restauró desde el respaldo más reciente. Revisa que todo esté en orden.',
              buttons: ['Entendido'],
              noLink: true,
            })
          }
        } catch {}
      }
      return
    }
    // Servidor vivo como proceso pero sin responder
    fallosSaludSeguidos++
    logPaladin(`Salud fallida (${fallosSaludSeguidos}/${FALLOS_SALUD_PARA_REINICIAR})`)
    if (fallosSaludSeguidos >= FALLOS_SALUD_PARA_REINICIAR) {
      await reiniciarServidorPorSalud('sin respuesta HTTP')
    }
  }, 30 * 1000).unref?.()
}

// ============================================================
//  PALADÍN 5 — Centinela post-actualización (rollback seguro)
// ============================================================
function leerEstadoPaladin() {
  try {
    return JSON.parse(fs.readFileSync(ESTADO_PALADIN, 'utf-8'))
  } catch {
    return { arranquesFallidos: 0 }
  }
}

function guardarEstadoPaladin(estado) {
  try {
    fs.writeFileSync(ESTADO_PALADIN, JSON.stringify(estado, null, 2), 'utf-8')
  } catch {}
}

async function validarPostActualizacion(sano) {
  try {
    if (!fs.existsSync(FLAG_POST_ACTUALIZACION)) return
    const versionNueva = fs.readFileSync(FLAG_POST_ACTUALIZACION, 'utf-8').trim()

    if (sano) {
      // La versión nueva arrancó bien: queda promocionada a estable
      fs.writeFileSync(VERSION_ESTABLE, versionNueva, 'utf-8')
      try {
        const nuevo = path.join(UPDATES_DIR, 'instalador-nuevo.exe')
        const estable = path.join(UPDATES_DIR, 'instalador-estable.exe')
        if (fs.existsSync(nuevo)) {
          fs.copyFileSync(nuevo, estable)
          fs.unlinkSync(nuevo)
        }
      } catch {}
      fs.unlinkSync(FLAG_POST_ACTUALIZACION)
      guardarEstadoPaladin({ arranquesFallidos: 0 })
      logPaladin(`v${versionNueva} validada por el Paladín y promocionada a estable.`)
      return
    }

    // Arranque con problemas durante validación
    const estado = leerEstadoPaladin()
    estado.arranquesFallidos = (estado.arranquesFallidos || 0) + 1
    guardarEstadoPaladin(estado)
    logPaladin(`Arranque problemático ${estado.arranquesFallidos}/${ARRANQUES_TOLERADOS_POST_ACTUALIZACION} de la v${versionNueva}.`)

    if (estado.arranquesFallidos >= ARRANQUES_TOLERADOS_POST_ACTUALIZACION) {
      await revertirAVersionEstable(versionNueva)
    }
  } catch (e) {
    logPaladin('Centinela post-actualización falló: ' + (e && e.message))
  }
}

async function revertirAVersionEstable(versionRechazada) {
  logPaladin(`¡La v${versionRechazada} falló ${ARRANQUES_TOLERADOS_POST_ACTUALIZACION} arranques! Intentando reversión a la versión estable…`)
  try {
    const estable = path.join(UPDATES_DIR, 'instalador-estable.exe')
    const hayEstable = fs.existsSync(estable)
    // Marca la versión rechazada para que el actualizador no la reinstale
    fs.writeFileSync(VERSION_RECHAZADA, versionRechazada, 'utf-8')
    if (!hayEstable) {
      logPaladin('No hay instalador estable en caché para revertir. Se requiere reinstalación manual (la base de datos está segura).')
      try {
        if (ventana && !ventana.isDestroyed()) {
          dialog.showMessageBox(ventana, {
            type: 'warning',
            title: 'Sell-Plus · Paladín',
            message: 'La versión nueva está fallando repetidamente.',
            detail: 'El Paladín la apartó para que no se reinstale sola. Tus datos están seguros. Escríbeme desde la Central para corregirlo.',
            buttons: ['Entendido'],
            noLink: true,
          })
        }
      } catch {}
      return
    }
    logPaladin('Lanzando reversión silenciosa a la última versión estable…')
    const hijo = spawn(estable, ['/S'], { detached: true, windowsHide: true, stdio: 'ignore' })
    hijo.unref()
    setTimeout(() => app.quit(), 1200)
  } catch (e) {
    logPaladin('Reversión falló: ' + (e && e.message))
  }
}

// ============================================================
//  Ventana
// ============================================================
function crearVentana() {
  Menu.setApplicationMenu(null)
  ventana = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b1220',
    title: 'Sell-Plus',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  ventana.loadURL(`http://127.0.0.1:${PUERTO}/`)
  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('closed', () => {
    ventana = null
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore()
      ventana.focus()
    }
  })

  app.whenReady().then(async () => {
    logServidorRecortado()
    prepararArchivos()
    logPaladin('Paladín de pie. Vigilando Sell-Plus v' + app.getVersion() + '…')

    // Centinela: ¿hay una actualización pendiente de validar con historial de fallos?
    const estado = leerEstadoPaladin()
    const hayFlag = fs.existsSync(FLAG_POST_ACTUALIZACION)
    if (hayFlag && (estado.arranquesFallidos || 0) >= ARRANQUES_TOLERADOS_POST_ACTUALIZACION) {
      const versionNueva = fs.readFileSync(FLAG_POST_ACTUALIZACION, 'utf-8').trim()
      await revertirAVersionEstable(versionNueva)
      return
    }

    iniciarServidor()

    // Pequeño arranque del actualizador (módulo aparte)
    try {
      const { iniciar } = require('./auto-actualizador')
      iniciar({
        app,
        dbPath: DB_PATH,
        dbDir: DB_DIR,
        urlArchivo: URL_ARCHIVO,
        log,
        version: app.getVersion(),
        ventanaGetter: () => ventana,
      })
    } catch (e) {
      log('Actualizador no disponible: ' + (e && e.message))
    }

    const ok = await esperarServidor()
    if (!ok) {
      log('El servidor local no respondió a tiempo')
      logPaladin('El servidor local no respondió al arrancar.')
      if (hayFlag) await validarPostActualizacion(false)
      dialog.showMessageBoxSync({
        type: 'error',
        title: 'Sell-Plus',
        message: 'El servidor local tardó demasiado en arrancar.',
        detail: 'Cierra Sell-Plus y vuelve a intentarlo. Si el problema persiste, avísame desde la Central.',
        buttons: ['Cerrar'],
      })
      app.quit()
      return
    }
    servidorListo = true
    crearVentana()
    iniciarMonitorSalud()
    if (hayFlag) await validarPostActualizacion(true)
  })

  app.on('window-all-closed', () => {
    saliendo = true
    try {
      if (servidor) servidor.kill()
    } catch {}
    setTimeout(() => app.quit(), 400)
  })

  app.on('before-quit', () => {
    saliendo = true
    try {
      if (servidor) servidor.kill()
    } catch {}
  })
}
