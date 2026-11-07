import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const RESPUESTA = [
  'v3.3.1 PUBLICADA ✅ — IMPORTANTE: esta transición es manual por única vez.',
  'Tu 3.3.0 tiene el actualizador dañado (lanzaba el instalador y este se autodetenía: tus 6 respaldos de BD lo confirman). La corrección viaja DENTRO de la 3.3.1, así que tu versión actual no puede aplicarla sola.',
  'Instálala así: abre la Central → pestaña Actualizaciones → botón «Descargar instalador» de la 3.3.1 → ejecuta el .exe descargado (no necesitas cerrar Sell-Plus; el instalador lo hace solo). Tu base de datos se respalda y se conserva intacta.',
  'Al abrir Sell-Plus verás «Punto de venta · v3.3.1» en el login. A partir de aquí las actualizaciones volverán a ser automáticas (el actualizador corregido viaja incluido).',
  'Qué trae: TODA la base desde 3.1.0/3.2.0 (Caja, Ventas, Inventarios con lotes, PEPS y alertas de caducidad, Empleados, login con PIN, Diagnóstico de conexión) + la gestión completa de inventarios que pediste (alta/edición/eliminación de productos, ficha con lotes, catálogo con filtros, importar/exportar Excel).',
].join(' ')

async function main() {
  await db.solicitud.update({
    where: { id: 1 },
    data: { estado: 'publicada', respuesta: RESPUESTA },
  })
  console.log('Solicitud 1 → respuesta actualizada (paso manual único)')

  const detalle =
    '3.3.0 no se auto-actualiza: su instalador se autodetiene (taskkill /T mataba el propio instalador; 6 respaldos de BD lo confirman). Publicada la guía de instalación manual por única vez — desde 3.3.1 el auto-actualizador vuelve a funcionar'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'sistema', detalle } })
    console.log('Bitácora registrada')
  } else {
    console.log('Bitácora ya existía (idempotente)')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
