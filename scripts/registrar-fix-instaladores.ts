import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const det = 'Reporte del dueño resuelto: la actualización 3.3.3 no llegaba (descarga 404), los instaladores no aparecían en la Central y el aviso de "está actualizado" era engañoso. Causa: la Central corre desde /tmp/central (zona protegida del limpiador del entorno) y las rutas de instaladores eran relativas al directorio de ejecución; además la fila 3.2.0 tenía fileName/fileSize NULL (secuela de la reversión). Fix: nuevo src/lib/rutas.ts con CENTRAL_RAIZ absoluta, 6 rutas de API migradas, fila 3.2.0 reparada con su SHA-256 real, y CENTRAL_RAIZ en .env y scripts de arranque. Verificado: descarga 3.3.3 por URL pública devuelve 200 con 125,507,984 bytes y nombre correcto; los 6 instaladores aparecen completos con archivo y huella; contrato del actualizador OK (hasUpdate=true desde 3.3.2).'
  const ya = await prisma.actividad.findFirst({ where: { tipo: 'sistema', detalle: det } })
  if (!ya) { await prisma.actividad.create({ data: { tipo: 'sistema', detalle: det } }); console.log('Registrada') } else console.log('Ya estaba')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
