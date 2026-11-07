#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera las herramientas de diagnostico de Sell-Plus 3.0.1.

Salidas:
  1. Arbol instalado: Diagnostico-Sell-Plus.bat  (lanzador, doble clic)
  2. Arbol instalado: diagnostico.ps1            (motor del informe, UTF-8 BOM)
  3. download/: Diagnostico-Windows-SellPlus.bat (independiente, pre-instalacion,
     genera informe en el Escritorio, todo en CMD puro + powershell de una linea)
"""
import os

TREE = "/home/z/my-project/work/src/Sell-Plus"
DL = "/home/z/my-project/download"


def crlf(path, text):
    data = text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    print("OK", path, len(data), "bytes")


def utf8bom(path, text):
    with open(path, "wb") as f:
        f.write(b"\xef\xbb\xbf" + text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8"))
    print("OK", path, "(BOM)")


# ----------------------------------------------------------------------------
# 1) Lanzador del diagnostico dentro del programa instalado
# ----------------------------------------------------------------------------
launcher = r"""@echo off
chcp 65001 >nul
title Diagnostico de Sell-Plus
cd /d "%~dp0"
echo ==============================================
echo   DIAGNOSTICO DE SELL-PLUS
echo ==============================================
echo.
echo Generando informe, espera unos segundos...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostico.ps1"
echo.
echo Si se abrio el informe en el Bloc de notas, compartelo en el chat.
echo.
pause
"""
crlf(os.path.join(TREE, "Diagnostico-Sell-Plus.bat"), launcher)

# ----------------------------------------------------------------------------
# 2) Motor del informe (PowerShell). Sin acentos para máxima compatibilidad.
# ----------------------------------------------------------------------------
ps1 = r"""# diagnostico.ps1 - Sell-Plus 3.0.1
# Genera un informe completo en el Escritorio y lo abre en el Bloc de notas.
$ErrorActionPreference = 'Continue'
$desk = [Environment]::GetFolderPath('Desktop')
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$rep = Join-Path $desk ("Informe-Sell-Plus-" + $stamp + ".txt")

function W($t) { Add-Content -LiteralPath $rep -Value $t -Encoding UTF8 }
function HR { W "--------------------------------------------------" }

# Carpeta instalada: registro de Windows o C:\Sell-Plus por defecto
$inst = "C:\Sell-Plus"
try {
  $r = Get-ItemProperty -Path 'HKLM:\Software\Sell-Plus' -ErrorAction SilentlyContinue
  if ($r -and $r.InstallDir) { $inst = $r.InstallDir }
} catch {}

Remove-Item -LiteralPath $rep -ErrorAction SilentlyContinue
W "=================================================="
W "   INFORME DE DIAGNOSTICO - SELL-PLUS 3.0.1"
W "=================================================="
W ("Generado: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
W ("Carpeta del programa: " + $inst)
W ""

W "[1] TU WINDOWS Y TU EQUIPO"
HR
try {
  $os = Get-CimInstance Win32_OperatingSystem
  W ("Edicion:     " + $os.Caption)
  W ("Version:     " + $os.Version + "  (compilacion " + $os.BuildNumber + ")")
  W ("Arquitectura: " + $os.OSArchitecture)
} catch { W "No se pudo leer la version de Windows." }
try {
  $cs = Get-CimInstance Win32_ComputerSystem
  $ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
  W ("RAM total:   " + $ramGB + " GB")
  W ("Equipo:      " + $cs.Manufacturer + " " + $cs.Model)
} catch { W "No se pudo leer la RAM." }
try {
  $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
  W ("Procesador:  " + $cpu)
} catch {}
try {
  $free = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
  W ("Disco C libre: " + $free + " GB")
} catch {}
W ""

W "[2] ANTIVIRUS INSTALADO (importante si el programa no abre)"
HR
try {
  $avs = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop
  foreach ($a in $avs) { W ("- " + $a.displayName) }
} catch { W "No se pudo consultar (o no hay antivirus registrado en el Centro de seguridad)." }
W ""

W "[3] ARCHIVOS DEL PROGRAMA"
HR
$files = @(
  @("Sell-Plus.exe", "$inst\Sell-Plus.exe"),
  @("main.js (interfaz)", "$inst\resources\app\main.js"),
  @("server.js (servidor interno)", "$inst\resources\app\server\server.js"),
  @("compilacion web .next", "$inst\resources\app\server\.next\BUILD_ID"),
  @("base de datos custom.db", "$inst\resources\app\db\custom.db"),
  @("libreria Next.js (node_modules)", "$inst\resources\app\server\node_modules\next\package.json"),
  @("motor de base de datos Prisma", "$inst\resources\app\server\node_modules\.prisma\client\query_engine-windows.dll.node")
)
foreach ($f in $files) {
  if (Test-Path -LiteralPath $f[1]) { W ("[OK]    " + $f[0]) }
  else { W ("[FALTA] " + $f[0] + "  ->  " + $f[1]) }
}
try {
  $ver = (Get-Content -LiteralPath "$inst\version" -ErrorAction Stop | Select-Object -First 1)
  W ("Motor Electron: " + $ver)
} catch { W "Motor Electron: (sin archivo version)" }
W ""

W "[4] ESTADO ACTUAL"
HR
$p = Get-Process -Name "Sell-Plus" -ErrorAction SilentlyContinue
if ($p) { W ("Sell-Plus esta ABIERTO ahora mismo (procesos: " + $p.Count + ")") }
else { W "Sell-Plus no esta abierto en este momento." }
$port = netstat -ano | Select-String ":3000\s"
if ($port) { W "Puerto 3000: en uso:"; foreach ($l in $port) { W ("   " + $l.ToString().Trim()) } }
else { W "Puerto 3000: libre (nadie esta escuchando)." }
try {
  if (Test-Path -LiteralPath "$inst\registro-instalacion.txt") {
    W "Instalacion registrada:"
    Get-Content -LiteralPath "$inst\registro-instalacion.txt" | ForEach-Object { W ("   " + $_) }
  } else { W "(sin registro-instalacion.txt)" }
} catch {}
W ""

W "[5] ULTIMAS 50 LINEAS DEL REGISTRO DEL PROGRAMA"
HR
$log = "$inst\resources\app\db\sellplus-servidor.log"
if (Test-Path -LiteralPath $log) {
  Get-Content -LiteralPath $log -Tail 50 | ForEach-Object { W $_ }
} else {
  W "El programa nunca ha escrito su registro: el servidor interno no llego a arrancar."
}
W ""

W "[6] CAIDAS RECIENTES DE SELL-PLUS EN WINDOWS (ultimos 7 dias)"
HR
try {
  $since = (Get-Date).AddDays(-7)
  $evs = Get-WinEvent -FilterHashtable @{ LogName='Application'; StartTime=$since } -MaxEvents 400 -ErrorAction Stop |
         Where-Object { $_.Message -like '*Sell-Plus*' -and ($_.ProviderName -eq 'Application Error' -or $_.ProviderName -like 'Windows Error Reporting*') }
  if ($evs) {
    foreach ($e in ($evs | Select-Object -First 6)) {
      W ("[" + $e.TimeCreated.ToString('yyyy-MM-dd HH:mm') + "] " + $e.ProviderName)
      ($e.Message -split "`n" | Select-Object -First 8) | ForEach-Object { W ("   " + $_.Trim()) }
      W ""
    }
  } else { W "Windows no registro caidas de Sell-Plus en los ultimos 7 dias." }
} catch { W "No se pudo consultar el registro de eventos de Windows." }
W ""

W "[7] QUE HACER CON ESTE INFORME"
HR
W "Si Sell-Plus sigue fallando: comparte este archivo en el chat"
W "(esta en tu Escritorio, se llama Informe-Sell-Plus-<fecha>.txt)"
W "y la causa exacta saldra de aqui."
W ""
W ("Informe generado en: " + $rep)

try { Start-Process notepad.exe -ArgumentList ('"' + $rep + '"') } catch {}
"""
utf8bom(os.path.join(TREE, "diagnostico.ps1"), ps1)

# ----------------------------------------------------------------------------
# 3) Herramienta independiente de pre-instalacion (solo CMD + powershell 1-liner)
# ----------------------------------------------------------------------------
standalone = r"""@echo off
chcp 65001 >nul
title Diagnostico de Windows para Sell-Plus
setlocal enabledelayedexpansion
set "REP=%USERPROFILE%\Desktop\Informe-Windows-para-Sell-Plus.txt"
set "PS=powershell -NoProfile -Command"

echo ==============================================
echo   DIAGNOSTICO DE WINDOWS PARA SELL-PLUS 3.0.1
echo ==============================================
echo Generando el informe en tu Escritorio...

echo ==============================================            > "%REP%"
echo   INFORME DE WINDOWS PARA INSTALAR SELL-PLUS              >> "%REP%"
echo ==============================================            >> "%REP%"
echo Generado: %DATE% %TIME%                                   >> "%REP%"
echo.                                                         >> "%REP%"
echo [1] WINDOWS DETECTADO                                    >> "%REP%"
echo ---------------------------------------------------      >> "%REP%"
%PS% "$o=Get-CimInstance Win32_OperatingSystem; 'Edicion:      '+$o.Caption; 'Version:      '+$o.Version; 'Arquitectura: '+$o.OSArchitecture" >> "%REP%" 2>&1
echo.                                                         >> "%REP%"
echo [2] EQUIPO                                               >> "%REP%"
echo ---------------------------------------------------      >> "%REP%"
%PS% "$c=Get-CimInstance Win32_ComputerSystem; 'Equipo:  '+$c.Manufacturer+' '+$c.Model; 'RAM:     '+[math]::Round($c.TotalPhysicalMemory/1GB,1)+' GB'" >> "%REP%" 2>&1
%PS% "(Get-CimInstance Win32_Processor | Select-Object -First 1).Name" >> "%REP%" 2>&1
%PS% "'Disco C libre: '+[math]::Round((Get-PSDrive C).Free/1GB,1)+' GB'" >> "%REP%" 2>&1
echo.                                                         >> "%REP%"
echo [3] VEREDICTO PARA SELL-PLUS                             >> "%REP%"
echo ---------------------------------------------------      >> "%REP%"

if "%PROCESSOR_ARCHITECTURE%"=="AMD64" goto es64
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" goto es64
if "%PROCESSOR_ARCHITEW6432%"=="AMD64" goto es64
echo [NO COMPATIBLE] Tu Windows es de 32 bits.                >> "%REP%"
echo Sell-Plus 3.0 necesita Windows de 64 bits:               >> "%REP%"
echo su motor de base de datos (Prisma) solo existe           >> "%REP%"
echo para 64 bits. No hay instalador de 32 bits posible.      >> "%REP%"
goto mostrar

:es64
echo [COMPATIBLE] Tu Windows es de 64 bits.                   >> "%REP%"
echo Puedes instalar:                                         >> "%REP%"
echo   Sell-Plus-3.0.1-Instalador-Windows-64bits.exe          >> "%REP%"
echo Se instala en C:\Sell-Plus y crea el icono en el         >> "%REP%"
echo Escritorio automaticamente.                              >> "%REP%"
echo.                                                         >> "%REP%"
echo Si el programa abre y se cierra solo, o no abre:         >> "%REP%"
echo 1) Dentro de la carpeta C:\Sell-Plus esta el icono       >> "%REP%"
echo    "Diagnostico Sell-Plus": genera el informe tecnico.   >> "%REP%"
echo 2) Comparte ese informe en el chat.                      >> "%REP%"

:mostrar
echo.
echo ==============================================
echo   INFORME GENERADO EN TU ESCRITORIO:
echo   %REP%
echo ==============================================
echo.
type "%REP%"
echo.
start notepad "%REP%"
echo Listo. El informe quedo guardado en el Escritorio.
pause
"""
crlf(os.path.join(DL, "Diagnostico-Windows-SellPlus.bat"), standalone)

print("Herramientas de diagnostico generadas.")
