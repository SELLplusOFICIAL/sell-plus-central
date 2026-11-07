#!/bin/bash
# ============================================================
#  PALADÍN DE PUBLICACIÓN — Sell-Plus (solicitudes #3 y #4)
#  Antes de registrar una versión en la Central, verifica que el
#  build realmente arranca y sirve. Si algo falla, NO se publica.
#  Al terminar, REPORTA su análisis a la Central (/api/paladin)
#  para que el dueño lo vea resumido en la interfaz.
#  Uso: bash scripts/paladin-publicar.sh [ruta-standalone]
#  Devuelve: PALADIN_OK | PALADIN_FALLO
# ============================================================
set -uo pipefail
RAIZ=/home/z/my-project
POS=$RAIZ/work/pos
SPOS=${1:-$POS/.next/standalone/work/pos}
PUERTO_TEST=3100
TMP=/tmp/paladin-test
mkdir -p "$TMP"
FALLO=0
T_INICIO=$(date +%s%3N 2>/dev/null || echo 0)
CHECKS="$TMP/checks.txt"
CENTRAL="${PALADIN_CENTRAL_URL:-http://localhost:3000}"

echo "== Paladín de publicación =="
echo ">> Standalone: $SPOS"

reportar() {
  # $1 = estadoGlobal (ok|alerta|fallo)   $2 = resumen para el dueño
  local ESTADO="$1" RESUMEN="$2" DURMS=0
  [ "$T_INICIO" != "0" ] && DURMS=$(( $(date +%s%3N) - T_INICIO ))
  VER="${VER:-desconocida}"
  python3 - "$CENTRAL" "$VER" "$ESTADO" "$RESUMEN" "$DURMS" "$CHECKS" <<'PY'
import json, sys, urllib.request
central, ver, estado, resumen, durms, ruta_checks = sys.argv[1:7]
checks = []
try:
    for line in open(ruta_checks, encoding='utf-8'):
        partes = line.rstrip('\n').split('|', 2)
        if len(partes) == 3:
            checks.append({'nombre': partes[0], 'detalle': partes[1], 'estado': partes[2]})
except FileNotFoundError:
    pass
body = json.dumps({
    'origen': 'publicacion', 'versionPos': ver, 'estadoGlobal': estado,
    'resumen': resumen, 'duracionMs': int(durms) if durms else None,
    'checks': checks,
}).encode('utf-8')
req = urllib.request.Request(central + '/api/paladin', data=body,
                             headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print('>> Reporte enviado a la Central (HTTP', r.status, ')')
except Exception as e:
    print('>> (No se pudo reportar a la Central:', e, ')')
PY
}

# 1) Existe el build
if [ ! -f "$SPOS/server.js" ]; then
  echo "FALTA server.js del standalone"
  printf 'Build presente|Falta server.js en el standalone|fallo\n' > "$CHECKS"
  reportar "fallo" "El build no está completo (falta el servidor). Publicación BLOQUEADA."
  echo "PALADIN_FALLO"; exit 1
fi
printf 'Build presente|server.js encontrado en el standalone|ok\n' > "$CHECKS"

# 2) Versión declarada
VER=$(python3 -c "import json;print(json.load(open('$POS/package.json'))['version'])")
echo ">> Versión declarada en package.json: $VER"
printf 'Versión declarada|v%s lista para la prueba de arranque|ok\n' "$VER" >> "$CHECKS"

# 3) Preparar entorno de prueba limpio (BD desechable desde la fábrica)
rm -rf "$TMP" && mkdir -p "$TMP"
cp "$POS/prisma/fabrica.db" "$TMP/test.db" 2>/dev/null || cp "$POS/prisma/dev.db" "$TMP/test.db"
cp -r "$POS/.next/static" "$SPOS/.next/static" 2>/dev/null || true

# 4) Arrancar el servidor del build
cd "$SPOS"
DATABASE_URL="file:$TMP/test.db" PORT=$PUERTO_TEST HOSTNAME=127.0.0.1 NODE_ENV=production \
  node server.js >"$TMP/salida.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT

# 5) Esperar a que responda (máx 25 s)
LISTO=0
for i in $(seq 1 25); do
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PUERTO_TEST/" ; then LISTO=1; break; fi
  sleep 1
done
if [ "$LISTO" != "1" ]; then
  echo "El servidor no arrancó a tiempo"; tail -5 "$TMP/salida.log"
  printf 'Arranque del build|El servidor no respondió en 25 s|fallo\n' >> "$CHECKS"
  reportar "fallo" "El build NO arranca. Publicación BLOQUEADA: ninguna versión rota llegará a tu software."
  echo "PALADIN_FALLO"; exit 1
fi
echo ">> Servidor de prueba arriba (puerto $PUERTO_TEST)"
printf 'Arranque del build|Servidor de prueba arriba en el puerto %s|ok\n' "$PUERTO_TEST" >> "$CHECKS"

# 6) Chequeos de rutas críticas
declare -a RUTAS=("/" "/caja" "/inventarios" "/ventas" "/empleados" "/api/salud" "/api/sesion" "/api/caja/movimientos")
declare -A NOMBRES=( ["/"]="Pantalla de inicio" ["/caja"]="Caja (POS)" ["/inventarios"]="Inventarios" ["/ventas"]="Ventas" ["/empleados"]="Empleados" ["/api/salud"]="API de salud" ["/api/sesion"]="API de sesión" ["/api/caja/movimientos"]="Dinero en caja (nuevo en 3.3.3)" )
for r in "${RUTAS[@]}"; do
  COD=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://127.0.0.1:$PUERTO_TEST$r")
  echo "   $r → HTTP $COD"
  case "$COD" in
    200|307|308)
      printf '%s|%s → HTTP %s|ok\n' "${NOMBRES[$r]}" "$r" "$COD" >> "$CHECKS" ;;
    401)
      # 401 = la ruta existe y protege correctamente la sesión (APIs privadas)
      if [ "$r" = "/api/caja/movimientos" ]; then
        printf '%s|Ruta viva y protegida por sesión (HTTP 401)|ok\n' "${NOMBRES[$r]}" >> "$CHECKS"
      else
        printf '%s|%s → HTTP 401 inesperado|fallo\n' "${NOMBRES[$r]}" "$r" >> "$CHECKS"
        FALLO=1
      fi ;;
    *)
      printf '%s|%s → HTTP %s|fallo\n' "${NOMBRES[$r]}" "$r" "$COD" >> "$CHECKS"
      FALLO=1 ;;
  esac
done

# 7) Salud de la base de datos vía /api/salud
SALUD=$(curl -s --max-time 8 "http://127.0.0.1:$PUERTO_TEST/api/salud" || true)
echo ">> /api/salud → $SALUD"
if echo "$SALUD" | grep -q '"db":"ok"'; then
  printf 'Base de datos|/api/salud responde con base de datos sana|ok\n' >> "$CHECKS"
else
  printf 'Base de datos|/api/salud no confirmó salud de la BD (%s)|fallo\n' "${SALUD:-sin respuesta}" >> "$CHECKS"
  FALLO=1
fi

kill $PID 2>/dev/null; wait $PID 2>/dev/null; trap - EXIT

if [ "$FALLO" = "1" ]; then
  reportar "fallo" "El build tiene fallas (rutas o base de datos). Publicación BLOQUEADA: tu software actual sigue intacto."
  echo "PALADIN_FALLO"; exit 1
fi
reportar "ok" "Build v${VER} aprobado: arranca solo, todas las pantallas responden y la base de datos está sana. Listo para publicar."
echo "PALADIN_OK"
