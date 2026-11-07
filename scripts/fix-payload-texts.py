# -*- coding: utf-8 -*-
"""Completa los ajustes pendientes (version strings ya aplicados a medias):
- diagnostico.ps1: insertar seccion [4b] conexion con Central
- LEEME-INSTALACION.txt: bloque de novedad 3.1.0 y linea de desinstalacion"""
import io

PS1 = "/home/z/my-project/work/src/Sell-Plus/diagnostico.ps1"
LEEME = "/home/z/my-project/work/src/Sell-Plus/LEEME-INSTALACION.txt"

def read(p):
    with io.open(p, "r", encoding="utf-8-sig", newline="") as f:
        return f.read()

def write(p, text):
    with io.open(p, "w", encoding="utf-8-sig", newline="") as f:
        f.write(text)

def to_crlf(s):
    return s.replace("\r\n", "\n").replace("\n", "\r\n")

# ---------- diagnostico.ps1: seccion [4b] ----------
ps1 = read(PS1)
if "[4b]" not in ps1:
    ancla5 = 'W "[5] ULTIMAS 50 LINEAS DEL REGISTRO DEL PROGRAMA"'
    seccion4b = to_crlf(
        'W "[4b] CONEXION CON SELL-PLUS CENTRAL (auto-actualizador)"\n'
        'HR\n'
        '$central = $null\n'
        'try {\n'
        '  $urlFile = "$inst\\resources\\app\\db\\central-url.txt"\n'
        '  if (Test-Path -LiteralPath $urlFile) {\n'
        '    $central = (Get-Content -LiteralPath $urlFile -ErrorAction Stop | Select-Object -First 1).Trim()\n'
        '  }\n'
        '} catch {}\n'
        'if ($central) { W ("Direccion configurada: " + $central) }\n'
        'else { W "Direccion configurada: (ninguna, usa la de fabrica)" }\n'
        'try {\n'
        '  if ($central -and $central -like \'http*\') {\n'
        '    $r = Invoke-WebRequest -Uri ($central.TrimEnd(\'/\') + \'/api/client/check?current=prueba\') -TimeoutSec 12 -UseBasicParsing\n'
        '    W ("Prueba de conexion: HTTP " + $r.StatusCode + " (Central responde OK)")\n'
        '  } else {\n'
        '    W "Prueba de conexion: omitida (no hay direccion en central-url.txt)."\n'
        '  }\n'
        '} catch {\n'
        '  W ("Prueba de conexion: FALLO -> " + $_.Exception.Message)\n'
        '  W "(Si fallo: revisa internet, o actualiza central-url.txt con la direccion"\n'
        '  W " que aparece en la tarjeta azul del Panel de Sell-Plus Central.)"\n'
        '}\n'
        'W ""\n'
        '\n'
    )
    assert ancla5 in ps1, "ancla [5] no encontrada"
    ps1 = ps1.replace(ancla5, seccion4b + ancla5)
    write(PS1, ps1)
    print("diagnostico.ps1: seccion [4b] insertada")
else:
    print("diagnostico.ps1: [4b] ya existia")

# ---------- LEEME-INSTALACION.txt ----------
lm = read(LEEME)
cambios = 0
if "QUE SE CORRIGIO EN ESTA VERSION" in lm:
    viejo_block = to_crlf(
        "QUE SE CORRIGIO EN ESTA VERSION\n"
        "  El defecto que hacia que el programa abriera y se\n"
        "  cerrara solo unos segundos despues. Ahora la\n"
        "  ventana principal se abre y permanece abierta."
    )
    nuevo_block = to_crlf(
        "NOVEDAD DE ESTA VERSION (3.1.0)\n"
        "  Trae integrado el AUTO-ACTUALIZADOR: el programa\n"
        "  se conecta a \"Sell-Plus Central\" (el panel web\n"
        "  del dueno), avisa cuando hay version nueva y se\n"
        "  actualiza solo, conservando SIEMPRE tus datos\n"
        "  (ventas, productos y usuarios)."
    )
    assert viejo_block in lm, "bloque LEEME no encontrado"
    lm = lm.replace(viejo_block, nuevo_block)
    cambios += 1
if '"Sell-Plus 3.0.1" >' in lm:
    lm = lm.replace('"Sell-Plus 3.0.1" >', '"Sell-Plus 3.1.0" >')
    cambios += 1
if cambios:
    write(LEEME, lm)
print("LEEME-INSTALACION.txt: %d cambio(s) aplicado(s)" % cambios)
