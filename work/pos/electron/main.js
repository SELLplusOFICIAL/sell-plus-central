// Sell-Plus — proceso principal de Electron
// Arranca el servidor Next.js local y abre la ventana de la caja.
const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('child_process')
const net = require('net')
const http = require('http')
const path = require('path')
const fs = require('fs')

const APP_DIR = path.join(__dirname, '..')
const DB_DIR = path.join(APP_DIR, 'db')
const DB_PATH = path.join(DB_DIR, 'custom.db')
const DB_FABRICA = path.join(DB_DIR, 'custom.db.fabrica')
const LOGS_DIR = path.join(APP_DIR, 'logs')
const SCHEMA_VERSION_ESPERADA = '2'

let servidor = null
let ventana = null
let puerto = 3000

function loguear(mensaje) {
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
    const linea = `[${new Date().toISOString()}] ${mensaje}`
    fs.appendFileSync(path.join(LOGS_DIR, 'sellplus-servidor.log'), linea + '\n')
  } catch (e) {
    /* no detener la app por un fallo de log */
  }
}

// URL de la Central: prioridad al archivo db/central-url.txt (lo puede actualizar el instalador)
function urlCentral() {
  try {
    const t = fs.readFileSync(path.join(DB_DIR, 'central-url.txt'), 'utf8').trim()
    if (t) return t
  } catch (e) {}
  return 'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'
}

function puertoLibre(p) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(p, '127.0.0.1')
  })
}

// Protección de datos: si la base no es del esquema actual, se respalda y se inicia una nueva.
// El archivo del usuario NUNCA se borra: queda como custom.db.respaldo-<fecha>
function prepararBase() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  let compatible = false
  if (fs.existsSync(DB_PATH)) {
    try {
      const { PrismaClient } = require('@prisma/client')
      const probe = new PrismaClient({ datasources: { db: { url: 'file:' + DB_PATH.replace(/\\/g, '/') } } })
      // La consulta se hace de forma síncrona al arrancar es complicada; se deja marcado
      compatible = null // se valida de forma asíncrona en validarBase()
      probe.$disconnect().catch(() => {})
      global.__probe = probe
    } catch (e) {
      compatible = null
    }
  }
  return compatible
}

async function validarBase() {
  if (!fs.existsSync(DB_PATH)) return true // el instalador ya dejó la base de fábrica
  const probe = global.__probe
  if (!probe) return false
  try {
    const filas = await probe.$queryRawUnsafe(`SELECT valor FROM SellPlusMeta WHERE clave='schemaVersion'`)
    await probe.$disconnect().catch(() => {})
    return filas && filas[0] && String(filas[0].valor) === SCHEMA_VERSION_ESPERADA
  } catch (e) {
    try { await probe.$disconnect() } catch (e2) {}
    return false
  }
}

function respaldarYRestaurarFabrica() {
  const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destino = path.join(DB_DIR, `custom.db.respaldo-${sello}`)
  try {
    fs.copyFileSync(DB_PATH, destino)
    loguear(`Respaldo de la base anterior: ${destino}`)
  } catch (e) {}
  if (fs.existsSync(DB_FABRICA)) {
    try {
      fs.copyFileSync(DB_FABRICA, DB_PATH)
      loguear('Se inició con una base nueva; los datos anteriores quedaron en el respaldo.')
      return
    } catch (e) {}
  }
  // Si por alguna razón no hay base de fábrica, dejar el respaldo como base principal
  try { fs.copyFileSync(destino, DB_PATH) } catch (e) {}
}

async function esperarServidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get({ host: '127.0.0.1', port: puerto, path: '/api/health', timeout: 1500 }, (res) => {
        res.resume()
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function iniciarServidor() {
  const serverJs = path.join(APP_DIR, 'work', 'pos', 'server.js')
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(puerto),
    HOSTNAME: '127.0.0.1',
    DATABASE_URL: 'file:' + DB_PATH.replace(/\\/g, '/'),
  }
  servidor = spawn(process.execPath, [serverJs], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  loguear(`Servidor iniciado en puerto ${puerto}  DB=file:${DB_PATH.replace(/\\/g, '/')}  PID=${servidor.pid}`)
  const adelante = (buf) => String(buf).split('\n').filter(Boolean).forEach((l) => loguear(`[server] ${l}`))
  servidor.stdout.on('data', adelante)
  servidor.stderr.on('data', adelante)
  servidor.on('exit', (codigo) => {
    loguear(`Servidor terminado (codigo ${codigo})`)
    servidor = null
  })
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    autoHideMenuBar: true,
    title: 'Sell-Plus',
    backgroundColor: '#ecfdf5',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  ventana.loadURL(`http://127.0.0.1:${puerto}`)
  ventana.on('closed', () => { ventana = null })
}

app.whenReady().then(async () => {
  loguear('Sell-Plus arrancando…')
  prepararBase()
  const okBase = await validarBase()
  if (!okBase && fs.existsSync(DB_PATH)) {
    respaldarYRestaurarFabrica()
  }
  for (let p = 3000; p <= 3010; p++) {
    if (await puertoLibre(p)) { puerto = p; break }
  }
  iniciarServidor()
  const listo = await esperarServidor()
  if (!listo) {
    dialog.showErrorBox('Sell-Plus', 'El servidor local no respondió. Cierra la aplicación, espera 30 segundos y vuelve a abrirla. Si persiste, ejecuta el diagnóstico (diagnostico.ps1).')
    app.quit()
    return
  }
  loguear(`Servidor listo en http://127.0.0.1:${puerto}`)
  try {
    require('./auto-actualizador').iniciar({
      app,
      version: app.getVersion(),
      urlCentral: urlCentral(),
      APP_DIR,
      loguear,
    })
  } catch (e) {
    loguear('Auto-actualizador no pudo iniciar: ' + String(e))
  }
  crearVentana()
})

app.on('window-all-closed', () => {
  try { if (servidor) servidor.kill() } catch (e) {}
  setTimeout(() => app.quit(), 300)
})

app.on('before-quit', () => {
  try { if (servidor) servidor.kill() } catch (e) {}
})
