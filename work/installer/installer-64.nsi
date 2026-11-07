; ============================================================
;  Sell-Plus 3.3.3 — Instalador Windows 64 bits
;  - Instala en C:\Sell-Plus
;  - NUNCA borra ni sobrescribe db\custom.db (tus datos)
;  - Soporta instalación silenciosa:  Sell-Plus-3.3.3.exe /S
;  - v3.3.1: taskkill sin /T (el árbol podía matar al propio
;    instalador cuando lo lanzaba el actualizador) y limpieza
;    total de la app antes de copiar (la BD nunca se toca).
;  - v3.3.3 PALADÍN: se auto-cachéa en updates\instalador-nuevo.exe
;    para que el Paladín pueda REVERTIR a esta versión si la
;    siguiente falla, y escribe post-actualizacion.flag para que
;    el programa valide sus primeros arranques.
; ============================================================

Unicode true
ManifestDPIAware true

; Datos del SDK NSIS en este entorno (ruta explícita del sandbox)
!addincludedir "/tmp/nsisshare/Include"
!addplugindir "/tmp/nsisshare/Plugins/x86-unicode"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCTO "Sell-Plus"
!define VERSIONA "3.3.3"
!define EXE "Sell-Plus.exe"
!define INSTDIR_DEF "C:\Sell-Plus"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus"
!define ICONO "Sell-Plus.ico"

Name "${PRODUCTO} ${VERSIONA}"
OutFile "Sell-Plus-3.3.3-Instalador-Windows-64bits.exe"
InstallDir "${INSTDIR_DEF}"
InstallDirRegKey HKLM "${REGKEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompress Auto
SetCompressor /SOLID lzma
SetDatablockOptimize On

VIProductVersion "3.3.3.0"
VIAddVersionKey ProductName "${PRODUCTO}"
VIAddVersionKey ProductVersion "${VERSIONA}"
VIAddVersionKey FileVersion "3.3.3.0"
VIAddVersionKey FileDescription "Instalador de Sell-Plus"
VIAddVersionKey LegalCopyright "Sell-Plus"

!define MUI_ICON "${ICONO}"
!define MUI_UNICON "${ICONO}"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir Sell-Plus ahora"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

; ---------- Instalación ----------
Section "Install" SEC01
  SetOutPath "$INSTDIR"

  ; Cerrar Sell-Plus si está abierto.
  ; v3.3.1: SIN /T — con /T el árbol de procesos incluía al propio
  ; instalador cuando lo lanzaba el auto-actualizador, y se mataba
  ; a sí mismo antes de copiar nada. El servidor interno también se
  ; llama Sell-Plus.exe, así que /IM alcanza para detener todo.
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 1500
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 1000

  ; Protección de datos: respaldo preventivo de la base del usuario
  IfFileExists "$INSTDIR\resources\app\db\custom.db" 0 sinBase
    CopyFiles /SILENT "$INSTDIR\resources\app\db\custom.db" "$INSTDIR\resources\app\db\custom.db.respaldo-instalador"
  sinBase:

  ; Limpieza total del programa anterior (v3.3.1: la app se reemplaza
  ; completa para no dejar archivos viejos; la BD y su respaldo viven
  ; en db\ y NUNCA se tocan aquí)
  RMDir /r "$INSTDIR\resources\app\work"
  RMDir /r "$INSTDIR\resources\app\electron"
  RMDir /r "$INSTDIR\resources\app\node_modules"
  RMDir /r "$INSTDIR\resources\app\tools"
  Delete "$INSTDIR\resources\app\actualizacion.descargada.exe"

  ; Archivos del programa (Electron)
  File /r "stage\*.*"

  ; La base de datos de fábrica SOLO se instala si no hay base del usuario
  IfFileExists "$INSTDIR\resources\app\db\custom.db" tieneBase
    Rename "$INSTDIR\resources\app\db\custom.db.fabrica" "$INSTDIR\resources\app\db\custom.db"
  tieneBase:

  ; La dirección de la Central del usuario nunca se pisa si ya existe
  IfFileExists "$INSTDIR\resources\app\db\central-url.txt" tieneUrl
    CopyFiles /SILENT "$INSTDIR\resources\app\db\central-url.txt.fabrica" "$INSTDIR\resources\app\db\central-url.txt"
  tieneUrl:
  Delete "$INSTDIR\resources\app\db\central-url.txt.fabrica"

  ; Icono dentro de la carpeta para los accesos directos
  CopyFiles /SILENT "$INSTDIR\${ICONO}" "$INSTDIR\resources\app\${ICONO}"

  ; ----------------------------------------------------------
  ; v3.3.3 PALADÍN — caché de reversión y bandera de validación
  ; ----------------------------------------------------------
  ; El propio instalador se guarda como "instalador-nuevo.exe".
  ; Si esta versión arranca bien, el Paladín la promueve a
  ; "instalador-estable.exe"; si falla 3 arranques, EJECUTA el
  ; instalador estable anterior y así revierte solo, sin tocar la BD.
  CreateDirectory "$INSTDIR\updates"
  CopyFiles /SILENT "$EXEPATH" "$INSTDIR\updates\instalador-nuevo.exe"

  ; Marca la instalación para que el Paladín valide los primeros arranques
  FileOpen $0 "$INSTDIR\resources\app\db\post-actualizacion.flag" w
  FileWrite $0 "${VERSIONA}"
  FileClose $0

  ; Acceso directo en el escritorio
  SetShellVarContext all
  CreateShortCut "$DESKTOP\Sell-Plus.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${ICONO}"
  CreateDirectory "$SMPROGRAMS\Sell-Plus"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Sell-Plus.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${ICONO}"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Diagnóstico de conexión.lnk" "$INSTDIR\resources\app\tools\Diagnostico-Conexion.bat" "" "$INSTDIR\${ICONO}"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Desinstalar Sell-Plus.lnk" "$INSTDIR\Uninstall.exe"

  ; Registro de desinstalación
  WriteRegStr HKLM "${REGKEY}" "DisplayName" "Sell-Plus — Punto de Venta"
  WriteRegStr HKLM "${REGKEY}" "DisplayVersion" "${VERSIONA}"
  WriteRegStr HKLM "${REGKEY}" "Publisher" "Sell-Plus"
  WriteRegStr HKLM "${REGKEY}" "DisplayIcon" "$INSTDIR\${ICONO}"
  WriteRegStr HKLM "${REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${REGKEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegDWORD HKLM "${REGKEY}" "NoModify" 1
  WriteRegDWORD HKLM "${REGKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${REGKEY}" "EstimatedSize" $0

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; v3.3.1: en instalación silenciosa (desde el auto-actualizador) el
  ; instalador reabre Sell-Plus él mismo, porque el actualizador ya se
  ; cerró para dejarlo trabajar.
  IfSilent abreSilencioso 0
    Goto finSeccion
  abreSilencioso:
    Sleep 800
    Exec '"$INSTDIR\${EXE}"'
  finSeccion:
SectionEnd

; ---------- Desinstalación ----------
Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 800
  SetShellVarContext all
  Delete "$DESKTOP\Sell-Plus.lnk"
  RMDir /r "$SMPROGRAMS\Sell-Plus"

  ; Elimina el programa pero CONSERVA la base de datos y su respaldo
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR\resources\app\work"
  RMDir /r "$INSTDIR\resources\app\electron"
  RMDir /r "$INSTDIR\resources\app\node_modules"
  RMDir /r "$INSTDIR\resources\app\logs"
  RMDir /r "$INSTDIR\resources\app\tools"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\${EXE}"
  Delete "$INSTDIR\${ICONO}"
  Delete "$INSTDIR\resources\app\package.json"

  DeleteRegKey HKLM "${REGKEY}"
SectionEnd
