; =====================================================
; Sell-Plus 3.1.0 — Instalador para Windows 64 bits
; v4: Auto-Actualizador integrado. Si la instalación corre
;     en silencio (/S, desde el auto-actualizador) vuelve a
;     abrir Sell-Plus al terminar. La BD siempre se preserva.
; Construido con NSIS 3.11 en Linux
; =====================================================
Unicode true
ManifestDPIAware true
!include "MUI2.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

!define APPNAME "Sell-Plus"
!define APPVER "3.1.0"
!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sell-Plus"
!define PAYLOAD "/home/z/my-project/work/src/Sell-Plus"
!define ICO "/home/z/my-project/work/src/Sell-Plus/resources/app/assets/sellplus.ico"

VIProductVersion "3.1.0.0"
VIAddVersionKey "ProductName" "Sell-Plus"
VIAddVersionKey "FileDescription" "Instalador de Sell-Plus 3.1.0 (Punto de Venta con Auto-Actualizador)"
VIAddVersionKey "ProductVersion" "3.1.0"
VIAddVersionKey "FileVersion" "3.1.0.0"
VIAddVersionKey "CompanyName" "Sell-Plus"
VIAddVersionKey "LegalCopyright" "Sell-Plus"

Name "Sell-Plus ${APPVER}"
BrandingText "Sell-Plus — Punto de Venta"
OutFile "/home/z/my-project/download/Sell-Plus-3.1.0-Instalador-Windows-64bits.exe"
InstallDir "C:\Sell-Plus"
InstallDirRegKey HKLM "Software\Sell-Plus" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
ShowInstDetails show
ShowUnInstDetails show

!define MUI_ICON "${ICO}"
!define MUI_UNICON "${ICO}"
!define MUI_ABORTWARNING
!define MUI_DIRECTORYPAGE_TEXT_TOP "Se recomienda dejar la carpeta predeterminada C:\Sell-Plus. No elijas una carpeta dentro de Program Files (el programa necesita escribir sus datos de ventas alli)."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Sell-Plus.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir Sell-Plus ahora"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP|MB_OK "Este instalador es para Windows de 64 bits.$\n$\nTu Windows es de 32 bits y Sell-Plus 3.1 no puede funcionar en el: su motor de base de datos interno (Prisma) solo existe para Windows de 64 bits.$\n$\nNo se ha instalado nada."
    Abort
  ${EndIf}
  ; Si ya existia una instalacion, preservar la base de datos durante la copia
  ${If} ${FileExists} "$INSTDIR\resources\app\db\custom.db"
    CreateDirectory "$TEMP\SellPlus-DB-Guarda"
    CopyFiles /SILENT "$INSTDIR\resources\app\db\*.*" "$TEMP\SellPlus-DB-Guarda"
  ${EndIf}
FunctionEnd

Function .onVerifyInstDir
  Push $0
  StrLen $0 "$PROGRAMFILES"
  StrCpy $0 "$INSTDIR" $0
  ${If} $0 == "$PROGRAMFILES"
    Pop $0
    Abort
  ${EndIf}
  StrLen $0 "$PROGRAMFILES32"
  StrCpy $0 "$INSTDIR" $0
  ${If} $0 == "$PROGRAMFILES32"
    Pop $0
    Abort
  ${EndIf}
  Pop $0
FunctionEnd

Section "Sell-Plus" SEC01
  SetShellVarContext all
  ; Cerrar Sell-Plus si estuviera abierto
  nsExec::Exec 'taskkill /IM Sell-Plus.exe /F'
  Pop $0
  Sleep 400
  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD}/*"

  ; 1) Devolver la BD si venia de una reinstalacion sobre la misma carpeta
  ${If} ${FileExists} "$TEMP\SellPlus-DB-Guarda\custom.db"
    CopyFiles /SILENT "$TEMP\SellPlus-DB-Guarda\*.*" "$INSTDIR\resources\app\db"
    RMDir /r "$TEMP\SellPlus-DB-Guarda"
    Goto DatosListos
  ${EndIf}
  ; 2) Si hay respaldo de una desinstalacion anterior, ofrecer recuperarlo
  ${If} ${FileExists} "$APPDATA\Sell-Plus-Respaldo-Datos\custom.db"
    MessageBox MB_ICONQUESTION|MB_YESNO "Encontramos una copia de seguridad de tus ventas y productos de una instalacion anterior.$\n$\nQuieres usar esos datos en esta instalacion?" IDYES +2
      Goto DatosListos
    CopyFiles /SILENT "$APPDATA\Sell-Plus-Respaldo-Datos\*.*" "$INSTDIR\resources\app\db"
  ${EndIf}

DatosListos:
  ; Registro de instalación (fecha/hora) que luego lee el Supervisor
  ${GetTime} "" "L" $R1 $R2 $R3 $R4 $R5 $R6 $R7
  FileOpen $R0 "$INSTDIR\registro-instalacion.txt" w
  FileWrite $R0 "Sell-Plus 3.1.0 (con Auto-Actualizador) instalado correctamente.$\r$\n"
  FileWrite $R0 "Fecha: $R1/$R2/$R3   Hora: $R5:$R6:$R7$\r$\n"
  FileWrite $R0 "Carpeta: $INSTDIR$\r$\n"
  FileWrite $R0 "Instalador: Sell-Plus-3.1.0-Instalador-Windows-64bits.exe$\r$\n"
  FileClose $R0

  SetOutPath "$INSTDIR"
  CreateDirectory "$SMPROGRAMS\Sell-Plus"
  CreateShortcut "$DESKTOP\Sell-Plus.lnk" "$INSTDIR\Sell-Plus.exe"
  CreateShortcut "$DESKTOP\Diagnostico Sell-Plus.lnk" "$INSTDIR\Diagnostico-Sell-Plus.bat" "" "${ICO}" 0
  CreateShortcut "$SMPROGRAMS\Sell-Plus\Sell-Plus.lnk" "$INSTDIR\Sell-Plus.exe"
  CreateShortcut "$SMPROGRAMS\Sell-Plus\Diagnostico Sell-Plus.lnk" "$INSTDIR\Diagnostico-Sell-Plus.bat" "" "${ICO}" 0
  CreateShortcut "$SMPROGRAMS\Sell-Plus\Desinstalar Sell-Plus.lnk" "$INSTDIR\Desinstalar.exe"
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKLM "Software\Sell-Plus" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "${UNINST}" "DisplayName" "Sell-Plus 3.1.0 — Punto de Venta"
  WriteRegStr HKLM "${UNINST}" "DisplayVersion" "3.1.0"
  WriteRegStr HKLM "${UNINST}" "Publisher" "Sell-Plus"
  WriteRegStr HKLM "${UNINST}" "DisplayIcon" "$INSTDIR\Sell-Plus.exe"
  WriteRegStr HKLM "${UNINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST}" "UninstallString" "$INSTDIR\Desinstalar.exe"
  WriteRegDWORD HKLM "${UNINST}" "EstimatedSize" 0x00074000
  ; Si la instalación fue silenciosa (aplicada por el Auto-Actualizador),
  ; volver a abrir Sell-Plus automáticamente al terminar.
  ${If} ${Silent}
    Exec '"$INSTDIR\Sell-Plus.exe"'
  ${EndIf}
SectionEnd

Section "Uninstall"
  SetShellVarContext all
  nsExec::Exec 'taskkill /IM Sell-Plus.exe /F'
  Pop $0
  Sleep 400
  ; Resguardar siempre los datos antes de borrar
  ${If} ${FileExists} "$INSTDIR\resources\app\db\custom.db"
    CreateDirectory "$APPDATA\Sell-Plus-Respaldo-Datos"
    CopyFiles /SILENT "$INSTDIR\resources\app\db\*.*" "$APPDATA\Sell-Plus-Respaldo-Datos"
    MessageBox MB_ICONINFORMATION|MB_OK "Se guardo una copia de tus ventas, productos y usuarios en:$\n$APPDATA\Sell-Plus-Respaldo-Datos$\n$\nSi reinstalas Sell-Plus mas adelante, podras recuperarlos."
  ${EndIf}
  Delete "$DESKTOP\Sell-Plus.lnk"
  Delete "$DESKTOP\Supervisor Sell-Plus.lnk"
  Delete "$DESKTOP\Diagnostico Sell-Plus.lnk"
  RMDir /r "$SMPROGRAMS\Sell-Plus"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${UNINST}"
  DeleteRegKey HKLM "Software\Sell-Plus"
SectionEnd
