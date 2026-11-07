; ============================================
;  Sell-Plus 3.2.0 — Instalador Windows 64 bits
;  • Instala en C:\Sell-Plus
;  • PRESERVA custom.db (datos del usuario)
;  • Crea accesos directos (caja + Central)
;  • Soporta instalacion silenciosa /S
; ============================================

!define CENTRAL_URL "https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai"
!define VERSION_APP "3.2.0"

Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma

; Icono del instalador
Icon "icono.ico"

Name "Sell-Plus ${VERSION_APP}"
OutFile "/home/z/my-project/download/Sell-Plus-3.2.0-Instalador-Windows-64bits.exe"
InstallDir "C:\Sell-Plus"
InstallDirRegKey HKLM "Software\Sell-Plus" "InstallDir"
RequestExecutionLevel admin
ShowInstDetails show
ShowUnInstDetails show

Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

; ==================== INSTALAR ====================
Function .onInit
  ; Si la app esta corriendo, cerrarla antes de instalar
  nsExec::Exec 'taskkill /IM Sell-Plus.exe /F'
  Sleep 800
FunctionEnd

Section "Sell-Plus" SEC01
  SetOutPath "$INSTDIR"

  ; ---- Proteger la base de datos del usuario ----
  CreateDirectory "$PLUGINSDIR\dbprotegido"
  IfFileExists "$INSTDIR\resources\app\db\custom.db" 0 sinDb
    CopyFiles /SILENT "$INSTDIR\resources\app\db\*.*" "$PLUGINSDIR\dbprotegido"
  sinDb:

  ; ---- Limpiar la version anterior (excepto la carpeta db, ya respaldada) ----
  RMDir /r "$INSTDIR\resources\app"
  RMDir /r "$INSTDIR\resources\app.old"

  ; ---- Copiar todos los archivos ----
  File /r "staging/*.*"

  ; ---- Restaurar la base de datos del usuario ----
  CreateDirectory "$INSTDIR\resources\app\db"
  IfFileExists "$PLUGINSDIR\dbprotegido\custom.db" 0 usarFabrica
    CopyFiles /SILENT "$PLUGINSDIR\dbprotegido\*.*" "$INSTDIR\resources\app\db"
    Goto dbListo
  usarFabrica:
    CopyFiles /SILENT "$INSTDIR\resources\app\db\custom.db.fabrica" "$INSTDIR\resources\app\db\custom.db"
  dbListo:

  ; ---- URL de la Central (configuracion de fabrica, siempre actualizada) ----
  FileOpen $0 "$INSTDIR\resources\app\db\central-url.txt" w
  FileWrite $0 "${CENTRAL_URL}"
  FileClose $0

  ; ---- Registro para Agregar o quitar programas ----
  WriteRegStr HKLM "Software\Sell-Plus" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Sell-Plus" "Version" "${VERSION_APP}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "DisplayName" "Sell-Plus"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "DisplayVersion" "${VERSION_APP}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "UninstallString" "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "Publisher" "Sell-Plus"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus" "NoRepair" 1

  ; ---- Accesos directos ----
  CreateDirectory "$SMPROGRAMS\Sell-Plus"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Sell-Plus.lnk" "$INSTDIR\Sell-Plus.exe"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Central Sell-Plus.lnk" "$INSTDIR\Central-Sell-Plus.url"
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Diagnostico.lnk" "powershell.exe" "-ExecutionPolicy Bypass -File `"$INSTDIR\diagnostico.ps1`""
  CreateShortCut "$SMPROGRAMS\Sell-Plus\Desinstalar.lnk" "$INSTDIR\Desinstalar.exe"
  CreateShortCut "$DESKTOP\Sell-Plus.lnk" "$INSTDIR\Sell-Plus.exe"
  SetOutPath "$DESKTOP"
  CopyFiles /SILENT "$INSTDIR\Central-Sell-Plus.url" "$DESKTOP\Central Sell-Plus.url"

  WriteUninstaller "$INSTDIR\Desinstalar.exe"
SectionEnd

; ==================== DESINSTALAR ====================
Section "Uninstall"
  nsExec::Exec 'taskkill /IM Sell-Plus.exe /F'
  Sleep 800
  ; La base de datos NO se borra: queda como respaldo por si se vuelve a instalar
  Delete "$DESKTOP\Sell-Plus.lnk"
  Delete "$DESKTOP\Central Sell-Plus.url"
  RMDir /r "$SMPROGRAMS\Sell-Plus"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus"
  DeleteRegKey HKLM "Software\Sell-Plus"
SectionEnd
