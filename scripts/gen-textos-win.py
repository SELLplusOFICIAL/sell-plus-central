#!/usr/bin/env python3
# Genera diagnostico.ps1 con CRLF + BOM (PowerShell friendly) y otros archivos de texto Windows
import pathlib

WORK = pathlib.Path('/home/z/my-project/work')

DIAG = r'''# ============================================
#  DIAGNOSTICO DE SELL-PLUS  (v3.2.0)
#  Clic derecho > "Ejecutar con PowerShell"
# ============================================
$ErrorActionPreference = "SilentlyContinue"
$Verde = "Green"; $Rojo = "Red"; $Amarillo = "DarkYellow"
function OK($t)   { Write-Host "  [OK]   $t" -ForegroundColor $Verde }
function MAL($t)  { Write-Host "  [MAL]  $t" -ForegroundColor $Rojo }
function AVISO($t){ Write-Host "  [AVISO]$t" -ForegroundColor $Amarillo }

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   DIAGNOSTICO DE SELL-PLUS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# [1] Carpeta y ejecutable
Write-Host "[1] Instalacion" -ForegroundColor White
if (Test-Path "C:\Sell-Plus\Sell-Plus.exe") { OK "Sell-Plus.exe presente" } else { MAL "No existe C:\Sell-Plus\Sell-Plus.exe" }
if (Test-Path "C:\Sell-Plus\resources\app") { OK "Carpeta de la aplicacion presente" } else { MAL "Falta resources\app" }

# [2] Base de datos
Write-Host "[2] Base de datos" -ForegroundColor White
$Db = "C:\Sell-Plus\resources\app\db\custom.db"
if (Test-Path $Db) {
  $Tam = (Get-Item $Db).Length / 1KB
  OK ("custom.db presente ({0:N0} KB) - tus datos estan aqui" -f $Tam)
  $Respaldos = Get-ChildItem "C:\Sell-Plus\resources\app\db\custom.db.respaldo-*" 2>$null
  if ($Respaldos) { AVISO ("hay {0} respaldo(s) automatico(s) de versiones anteriores" -f $Respaldos.Count) }
} else { MAL "No se encuentra custom.db" }

# [3] URL de la Central
Write-Host "[3] Central configurada" -ForegroundColor White
$UrlTxt = "C:\Sell-Plus\resources\app\db\central-url.txt"
$Url = "https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai"
if (Test-Path $UrlTxt) {
  $Url = (Get-Content $UrlTxt -Raw).Trim()
  OK "central-url.txt presente"
} else { AVISO "central-url.txt no existe (se usa la URL de fabrica)" }
Write-Host "         URL: $Url" -ForegroundColor Gray

# [4] Conexion a la Central
Write-Host "[4] Conexion con la Central" -ForegroundColor White
try {
  $r = Invoke-WebRequest -Uri "$Url/api/updates/check?version=prueba" -UseBasicParsing -TimeoutSec 15
  if ($r.StatusCode -eq 200) { OK "La Central responde correctamente" } else { AVISO "Respuesta inusual (HTTP $($r.StatusCode))" }
} catch {
  MAL "No se pudo conectar: $($_.Exception.Message)"
  Write-Host "         Revisa tu conexion a internet." -ForegroundColor Gray
}

# [5] Registros de la ultima sesion
Write-Host "[5] Ultimos registros" -ForegroundColor White
$Log = "C:\Sell-Plus\resources\app\logs\sellplus-servidor.log"
if (Test-Path $Log) {
  OK "Registro del servidor:"
  Get-Content $Log -Tail 5 | ForEach-Object { Write-Host "         $_" -ForegroundColor Gray }
} else { AVISO "Aun no hay registro del servidor (la app no se ha abierto)" }
$LogAct = "C:\Sell-Plus\resources\app\logs\actualizador.log"
if (Test-Path $LogAct) {
  OK "Registro del auto-actualizador:"
  Get-Content $LogAct -Tail 5 | ForEach-Object { Write-Host "         $_" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Si algo aparece [MAL], copia esta pantalla" -ForegroundColor Cyan
Write-Host "  y enviasela a tu asistente en el chat." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
pause
'''

LEEME = r'''=====================================================
   SELL-PLUS 3.2.0  —  INSTALACION Y PRIMEROS PASOS
=====================================================

QUE HAY DE NUEVO EN 3.2.0
-------------------------
* INVENTARIOS: Productos, Lotes y Caducidad ahora viven
  juntos en una sola pantalla del Dueño.
  - Cada producto muestra sus lotes, sus fechas de
    caducidad y avisos de "por caducar" o "vencido".
  - Las ventas descuentan primero el lote que antes
    caduca (menos desperdicio).
  - Bitacora de entradas, ventas, mermas y ajustes.
* El resto funciona igual: vender, personas, alertas.

INSTALAR
--------
1. Doble clic en el instalador .exe.
2. Si Windows pregunta, presiona "Si" (permisos).
3. La instalacion conserva tus datos y tu base de datos.
4. Al terminar, abre Sell-Plus desde el escritorio.

ACCESO A LA CENTRAL
-------------------
* En tu escritorio quedan dos iconos:
   - "Sell-Plus" (tu caja)
   - "Central Sell-Plus" (abre tu panel web)
* La Central la puedes abrir desde cualquier navegador,
  tambien en tu celular.

DATOS IMPORTANTES
-----------------
* Tu informacion vive en:
  C:\Sell-Plus\resources\app\db\custom.db
  ESE ARCHIVO NUNCA SE BORRA en las actualizaciones.
* PIN de fabrica: Dueno = 1234, Maria = 1111.
  (Cambialos en la seccion "Personas" cuando quieras.)

¿ALGO SALE MAL?
---------------
* Ejecuta C:\Sell-Plus\diagnostico.ps1
  (clic derecho > Ejecutar con PowerShell)
* Copia lo que muestre y pidelo a tu asistente.

=====================================================
'''

URL_FILE = '\r\n[InternetShortcut]\r\nURL=https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai\r\nIconIndex=0\r\nProp3=19,11\r\n'

def save(name, text, bom=False):
    p = WORK / name
    data = text.replace('\n', '\r\n')
    if bom:
        p.write_bytes(b'\xef\xbb\xbf' + data.encode('utf-8'))
    else:
        p.write_bytes(data.encode('utf-8'))
    print('escrito', p)

save('diagnostico.ps1', DIAG, bom=True)
save('LEEME-INSTALACION.txt', LEEME, bom=True)
(WORK / 'Central-Sell-Plus.url').write_bytes(URL_FILE.encode('utf-8'))
print('escrito', WORK / 'Central-Sell-Plus.url')
