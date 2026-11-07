#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera el Supervisor de Sell-Plus (bat CRLF, ASCII) dentro del árbol instalado."""
import os

TREE = "/home/z/my-project/work/src/Sell-Plus"

def crlf(path, text):
    data = text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    print("OK", path, len(data), "bytes")

supervisor = r"""@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Supervisor de Sell-Plus
set "SP=%~dp0"
set "REP=%USERPROFILE%\Desktop\Reporte-Sell-Plus.txt"
set "LOG=%SP%resources\app\db\sellplus-servidor.log"
set "REG=%SP%registro-instalacion.txt"

echo ============================================== > "%REP%"
echo    SUPERVISOR DE SELL-PLUS 3.0 - REPORTE       >> "%REP%"
echo ============================================== >> "%REP%"
echo Generado: %DATE% ^| %TIME%                      >> "%REP%"
echo Windows: %PROCESSOR_ARCHITECTURE%               >> "%REP%"
echo Carpeta del programa: %SP%                      >> "%REP%"

echo.                                               >> "%REP%"
echo [1] IDENTIFICACION DEL PROGRAMA                 >> "%REP%"
echo ---------------------------------------------- >> "%REP%"
set "EV=desconocida"
if exist "%SP%version" (set /p EV=<"%SP%version")
echo Motor Electron: %EV%                            >> "%REP%"
echo Producto: Sell-Plus 3.0 - Punto de Venta        >> "%REP%"
if exist "%SP%Sell-Plus.exe" (echo [OK] Sell-Plus.exe presente >> "%REP%") else (echo [FALTA] Sell-Plus.exe >> "%REP%")

echo.                                               >> "%REP%"
echo [2] ARCHIVOS CLAVE                              >> "%REP%"
echo ---------------------------------------------- >> "%REP%"
if exist "%SP%resources\app\main.js" (echo [OK] main.js >> "%REP%") else (echo [FALTA] main.js >> "%REP%")
if exist "%SP%resources\app\server\server.js" (echo [OK] server.js (servidor interno) >> "%REP%") else (echo [FALTA] server.js >> "%REP%")
if exist "%SP%resources\app\server\.next\BUILD_ID" (echo [OK] compilacion web (.next) >> "%REP%") else (echo [FALTA] compilacion web (.next) >> "%REP%")
if exist "%SP%resources\app\db\custom.db" (echo [OK] base de datos custom.db >> "%REP%") else (echo [FALTA] base de datos custom.db >> "%REP%")
if exist "%SP%resources\app\server\node_modules\.prisma\client\query_engine-windows.dll.node" (echo [OK] motor de base de datos Prisma >> "%REP%") else (echo [FALTA] motor Prisma >> "%REP%")

echo.                                               >> "%REP%"
echo [3] ESTADO ACTUAL                               >> "%REP%"
echo ---------------------------------------------- >> "%REP%"
tasklist /FI "IMAGENAME eq Sell-Plus.exe" 2>nul | find /I "Sell-Plus.exe" >nul
if !errorlevel! equ 0 (
  echo [SI] Sell-Plus esta abierto en este momento. >> "%REP%"
  netstat -ano | find "LISTENING" | findstr /R ":30[0-9][0-9] " >> "%REP%"
) else (
  echo [NO] Sell-Plus no esta abierto ahora mismo. >> "%REP%"
)
if exist "%REG%" (
  echo Fecha de instalacion registrada: >> "%REP%"
  type "%REG%" >> "%REP%"
) else (
  echo [AVISO] No hay registro-instalacion.txt (instalacion anterior o copia manual). >> "%REP%"
)

echo.                                               >> "%REP%"
echo [4] ULTIMAS 20 LINEAS DEL REGISTRO DEL SERVIDOR >> "%REP%"
echo ---------------------------------------------- >> "%REP%"
if exist "%LOG%" (
  powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 20" >> "%REP%"
) else (
  echo El programa nunca ha escrito registro: su servidor interno no ha arrancado. >> "%REP%"
)

echo.                                               >> "%REP%"
echo [5] QUE HACER CON ESTE REPORTE                  >> "%REP%"
echo ---------------------------------------------- >> "%REP%"
echo Si algo fallo: comparte este archivo en el chat >> "%REP%"
echo y la causa exacta saldra de aqui.               >> "%REP%"

type "%REP%"
start notepad "%REP%"
echo.
echo Reprote guardado en: %REP%
pause
"""
# typo "Reprote" corregido abajo en reemplazo directo
supervisor = supervisor.replace("Reprote guardado", "Reporte guardado")
crlf(os.path.join(TREE, "Diagnostico-Sell-Plus.bat"), supervisor)
