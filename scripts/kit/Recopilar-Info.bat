@echo off
rem Lanzador del recopilador de informacion tecnica de Sell-Plus
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Recopilar-Info.ps1"
