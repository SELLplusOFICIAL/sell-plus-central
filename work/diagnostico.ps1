# ============================================
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
