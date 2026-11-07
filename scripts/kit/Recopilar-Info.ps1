﻿# ============================================================
#  Sell-Plus - Recopilador de informacion tecnica
# ------------------------------------------------------------
#  Este script NO modifica tu programa y NO toca tu base de
#  datos de ventas. Solo COPIA archivos pequenos de
#  configuracion (texto) y genera un ZIP en tu Escritorio
#  para que lo subas al chat.
#  Uso: clic derecho sobre este archivo > "Ejecutar con PowerShell"
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$escritorio = [Environment]::GetFolderPath("Desktop")
$carpeta = Join-Path $escritorio "Sell-Plus-Info"
$zipFinal = Join-Path $escritorio "Sell-Plus-Info.zip"

Write-Host ""
Write-Host "=== Sell-Plus: recopilando informacion tecnica ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $carpeta) { Remove-Item $carpeta -Recurse -Force }
if (Test-Path $zipFinal) { Remove-Item $zipFinal -Force }
New-Item -ItemType Directory -Path $carpeta -Force | Out-Null

# --- 1) Localizar la carpeta de instalacion ---
$raices = @("C:\Sell-Plus", "$env:LOCALAPPDATA\Programs\Sell-Plus", "$env:ProgramFiles\Sell-Plus")
$raiz = $null
foreach ($r in $raices) {
    if (Test-Path $r) { $raiz = $r; break }
}

if (-not $raiz) {
    Write-Host "No encontre la carpeta de Sell-Plus (busque en C:\Sell-Plus)." -ForegroundColor Yellow
    Write-Host "Presiona una tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}
Write-Host ("Instalacion encontrada en: " + $raiz)

# --- 2) Copiar archivos clave de configuracion ---
$clave = Join-Path $carpeta "config"
New-Item -ItemType Directory -Path $clave -Force | Out-Null

$candidatos = @(
    "resources\app\package.json",
    "resources\app\db\central-url.txt",
    "resources\app\auto-actualizador.js",
    "resources\app\diagnostico.ps1"
)
foreach ($c in $candidatos) {
    $origen = Join-Path $raiz $c
    if (Test-Path $origen) {
        Copy-Item $origen -Destination $clave -Force
        Write-Host ("  copiado: " + $c)
    }
}

$appPath = Join-Path $raiz "resources\app"
Get-ChildItem $appPath -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in ".js", ".json", ".txt", ".ps1" } |
    ForEach-Object { Copy-Item $_.FullName -Destination $clave -Force }

# --- 3) Buscar el esquema de la base de datos (schema.prisma) ---
#     Es el archivo que dice exactamente como esta guardada tu
#     informacion. Es de texto y pesa poco. NO copia la base de
#     datos con tus ventas.
$esq = Join-Path $carpeta "esquema"
New-Item -ItemType Directory -Path $esq -Force | Out-Null

$i = 0
Get-ChildItem (Join-Path $raiz "resources") -Recurse -Filter "schema.prisma" -ErrorAction SilentlyContinue |
    Select-Object -First 8 |
    ForEach-Object {
        $i++
        Copy-Item $_.FullName -Destination (Join-Path $esq ("schema-{0}.prisma" -f $i)) -Force
        Write-Host ("  esquema encontrado: " + $_.FullName.Replace($raiz, ""))
    }

$j = 0
Get-ChildItem (Join-Path $raiz "resources") -Recurse -Filter "index.d.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like "*.prisma*" } |
    Select-Object -First 4 |
    ForEach-Object {
        $j++
        Copy-Item $_.FullName -Destination (Join-Path $esq ("cliente-{0}.d.ts" -f $j)) -Force
    }

# --- 4) Mapa de archivos (solo nombres y tamanos, sin contenido) ---
Write-Host "  generando mapa de archivos..."
Get-ChildItem $appPath -Depth 2 -ErrorAction SilentlyContinue |
    Select-Object FullName, Length |
    Out-File (Join-Path $carpeta "mapa-raiz.txt") -Encoding UTF8

Get-ChildItem $appPath -Recurse -Depth 6 -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.next*" } |
    Select-Object FullName, Length |
    Out-File (Join-Path $carpeta "mapa-app.txt") -Encoding UTF8

$nm = Get-ChildItem $appPath -Recurse -Depth 3 -Directory -Filter "node_modules" -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($nm) {
    Get-ChildItem $nm.FullName -Depth 0 -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Name |
        Out-File (Join-Path $carpeta "dependencias.txt") -Encoding UTF8
}

# --- 5) Version del programa ---
$exe = Get-ChildItem $raiz -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
    ("Ejecutable: " + $exe.Name + "  |  Version: " + $exe.VersionInfo.ProductVersion) |
        Out-File (Join-Path $carpeta "version-info.txt") -Encoding UTF8
    Write-Host ("  version del programa: " + $exe.VersionInfo.ProductVersion)
}

# --- 6) Empaquetar todo en un ZIP ---
Compress-Archive -Path (Join-Path $carpeta "*") -DestinationPath $zipFinal -Force
Remove-Item $carpeta -Recurse -Force

Write-Host ""
Write-Host "LISTO." -ForegroundColor Green
Write-Host ("Se creo el archivo: " + $zipFinal)
Write-Host ""
Write-Host "Ahora sube ese ZIP a la conversacion (arrastralo al chat)."
Write-Host ""
Write-Host "Presiona una tecla para cerrar esta ventana..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
