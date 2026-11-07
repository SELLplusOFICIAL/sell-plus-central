#!/usr/bin/env python3
"""Genera la herramienta de diagnóstico de conexión (restaurada de la 3.1.0).
Encodings correctos para Windows:
  - .bat: CRLF, sin BOM (ANSI/UTF-8 sin BOM)
  - .ps1: CRLF, UTF-8 con BOM (para acentos correctos en PowerShell 5.1)
"""
import os

OUT = '/home/z/my-project/work/installer/stage/resources/app/tools'
os.makedirs(OUT, exist_ok=True)

BAT = (
    "@echo off\r\n"
    "title Diagnostico de conexion - Sell-Plus\r\n"
    "cd /d \"%~dp0\"\r\n"
    "powershell -NoProfile -ExecutionPolicy Bypass -File \"%~dp0diagnostico.ps1\"\r\n"
    "pause\r\n"
)

PS1 = r'''# ============================================================
#  Sell-Plus — Diagnóstico de conexión con la Central (v3.3.1)
#  Revisa: archivo de configuración, servidor local y Central.
# ============================================================
$ErrorActionPreference = 'Continue'
$Raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # resources\app
$DirDB = Join-Path $Raiz 'db'
$UrlArchivo = Join-Path $DirDB 'central-url.txt'
$Paquete = Get-Content (Join-Path $Raiz 'package.json') -Raw | ConvertFrom-Json
$Version = $Paquete.version

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '   SELL-PLUS - DIAGNOSTICO DE CONEXION' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "Version instalada: $Version"
Write-Host "Base de datos:     $DirDB\custom.db" -NoNewline
if (Test-Path (Join-Path $DirDB 'custom.db')) { Write-Host '  [OK]' -ForegroundColor Green } else { Write-Host '  [NO ENCONTRADA]' -ForegroundColor Red }

# 1) Dirección de la Central
if (Test-Path $UrlArchivo) {
    $Central = (Get-Content $UrlArchivo -Raw).Trim()
    Write-Host "Central guardada:  $Central"
} else {
    $Central = 'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'
    Write-Host "Central guardada:  (no hay archivo, usando la de fabrica) $Central" -ForegroundColor Yellow
}

# 2) Servidor local del POS
Write-Host ''
Write-Host '[1/3] Probando el servidor local del programa...' -ForegroundColor White
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/sesion' -TimeoutSec 5 -UseBasicParsing
    Write-Host '      Servidor local: EN LINEA' -ForegroundColor Green
} catch {
    Write-Host '      Servidor local: APAGADO (normal si Sell-Plus esta cerrado)' -ForegroundColor Yellow
}

# 3) Central: salud
Write-Host '[2/3] Probando la conexion con la Central...' -ForegroundColor White
try {
    $h = Invoke-RestMethod -Uri "$Central/api/health" -TimeoutSec 15
    Write-Host "      Central: EN LINEA (ultima version publicada: $($h.ultimaVersion))" -ForegroundColor Green
} catch {
    Write-Host '      Central: SIN RESPUESTA ahora mismo.' -ForegroundColor Red
    Write-Host '      Tu software sigue funcionando; reintenta mas tarde o' -ForegroundColor Yellow
    Write-Host '      avisame desde el chat. Esto no borra tus datos.' -ForegroundColor Yellow
    exit 0
}

# 4) Central: chequeo de actualizacion
Write-Host '[3/3] Preguntando si hay actualizaciones...' -ForegroundColor White
try {
    $c = Invoke-RestMethod -Uri "$Central/api/updates/check?version=$Version" -TimeoutSec 15
    if ($c.hasUpdate) {
        Write-Host "      HAY novedad: version $($c.version) disponible." -ForegroundColor Green
        Write-Host '      Abre Sell-Plus y espera: se actualiza solo en ~15 min.' -ForegroundColor Green
    } else {
        Write-Host "      Tu software esta al dia (v$Version)." -ForegroundColor Green
    }
} catch {
    Write-Host '      No se pudo completar el chequeo (falla temporal).' -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Diagnostico terminado. Puedes cerrar esta ventana.' -ForegroundColor Cyan
'''

with open(os.path.join(OUT, 'Diagnostico-Conexion.bat'), 'w', encoding='utf-8', newline='') as f:
    f.write(BAT)
with open(os.path.join(OUT, 'diagnostico.ps1'), 'w', encoding='utf-8-sig', newline='') as f:
    f.write(PS1)

print('Creados:')
for n in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, n)
    with open(p, 'rb') as f:
        head = f.read(3)
    print(f'  {n}  ({os.path.getsize(p)} bytes, BOM={head == b"\\xef\\xbb\\xbf"})')
