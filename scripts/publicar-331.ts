import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const RESPUESTA = [
  'v3.3.1 PUBLICADA ✅ — tu software la detectará solo en ≤15 minutos (o al reiniciarlo) e instalará en silencio, sin borrar tu base de datos.',
  'Qué trae: TODA la base desde 3.1.0/3.2.0 (Caja, Ventas, Inventarios con lotes, PEPS y alertas de caducidad, Empleados, login con PIN, Diagnóstico de conexión) + la gestión completa de inventarios que pediste (alta/edición/eliminación de productos, ficha con lotes, catálogo con filtros, importar/exportar Excel).',
  'Además corrige el auto-actualizador, que impedía que las actualizaciones automáticas se aplicaran.',
  'Verifica en la pestaña Actualizaciones; cuando confirmes que ya la instalaste, damos la solicitud por cerrada.',
].join(' ')

async function main() {
  await db.solicitud.update({
    where: { id: 1 },
    data: { estado: 'publicada', respuesta: RESPUESTA },
  })
  console.log('Solicitud 1 → publicada')

  const detalle =
    'v3.3.1 publicada en la Central (SHA-256 29583f32…df0e4, 125.4 MB) — acumulativa: base 3.1.0/3.2.0 completa + gestión de inventarios de la solicitud #1 + fix del auto-actualizador'
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
