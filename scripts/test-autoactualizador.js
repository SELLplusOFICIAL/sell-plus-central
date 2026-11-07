/**
 * Prueba end-to-end del Auto-Actualizador de Sell-Plus (en Linux, con stubs de Electron).
 * Simula: programa v3.0.0 → consulta Central → acepta diálogo → descarga → verifica SHA-256.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const MODULO = '/home/z/my-project/work/src/Sell-Plus/resources/app/auto-actualizador.js';
const CENTRAL = 'http://localhost:3000';

// Apuntar el módulo a Central local (guardando la URL original para restaurarla al final:
// el instalador debe empaquetar SIEMPRE la URL pública, nunca la de prueba)
const dbDir = path.join(path.dirname(MODULO), 'db');
fs.mkdirSync(dbDir, { recursive: true });
const URL_FILE = path.join(dbDir, 'central-url.txt');
const URL_ORIGINAL = fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8') : null;
fs.writeFileSync(URL_FILE, CENTRAL, 'utf8');

// Stub de BrowserWindow (ventana de progreso)
class FakeWin {
  loadURL() {}
  once() {}
  show() {}
  isDestroyed() { return false; }
  destroy() {}
  webContents = { executeJavaScript: async () => undefined };
}

// Stub de dialog: el usuario elige "Sí, instalar ahora" (response 0)
const dialog = {
  async showMessageBox() {
    console.log('[stub] Diálogo mostrado al usuario → elige "Instalar ahora"');
    return { response: 0 };
  },
  showErrorBox() {},
};

const app = new EventEmitter();
app.quit = () => {
  console.log('[stub] app.quit() llamado (el programa se cerraría para instalar)');
  process.env.QUIT_LLAMADO = '1';
};

const log = (msg) => console.log('[programa]', msg);

const auto = require(MODULO);
auto.iniciar({
  app,
  BrowserWindow: FakeWin,
  dialog,
  log,
  getVersion: () => '3.0.0',
  mainWinRef: () => null,
});

const sha = (f) => new Promise((res, rej) => {
  const h = crypto.createHash('sha256');
  const s = fs.createReadStream(f);
  s.on('data', (d) => h.update(d));
  s.on('end', () => res(h.digest('hex')));
  s.on('error', rej);
});

const ES_PEROBA = process.env.PRUEBA === 'interna';
const SHA_ESPERADO = ES_PEROBA
  ? 'f62a36dd83f36006cd5a687197253c2096d21383d5dc512aac413fa32a30d733'
  : '55126d5781d7833df889187880addd11e4e56e0c5169d0888fd7b48e05b3788d';

(async () => {
  console.log('--- Llamando a revisar(true) contra', CENTRAL, '---');
  await auto._internos.revisar(true);
  // Esperar a que el flujo interno termine (descarga + verificación + instalación)
  await new Promise((r) => setTimeout(r, 12000));
  const destino = '/tmp/Sell-Plus-actualizacion-3.1.0.exe';
  if (fs.existsSync(destino)) {
    const huella = await sha(destino);
    const tam = fs.statSync(destino).size;
    console.log('--- RESULTADO ---');
    console.log('Archivo descargado:', destino, tam, 'bytes');
    console.log('SHA-256:', huella);
    console.log('Coincide con el registro de Central:', huella === SHA_ESPERADO ? 'SÍ ✔' : 'NO ✘');
    console.log('app.quit() invocado:', process.env.QUIT_LLAMADO === '1' ? 'SÍ ✔' : 'NO ✘');
  } else {
    console.log('--- FALLO: no se descargó el archivo ---');
  }
  // Restaurar la URL original del paquete (la pública de fábrica)
  try {
    if (URL_ORIGINAL === null) fs.unlinkSync(URL_FILE);
    else fs.writeFileSync(URL_FILE, URL_ORIGINAL, 'utf8');
    console.log('[limpieza] central-url.txt restaurado a la URL de fábrica.');
  } catch (e) {
    console.log('[limpieza][AVISO] No se pudo restaurar central-url.txt:', e.message);
  }
  process.exit(0);
})();
