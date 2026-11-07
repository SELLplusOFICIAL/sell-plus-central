import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const RESPUESTA = [
  'v3.3.1 CONSTRUIDA y en espera de tu visto bueno para publicar (tu software no la descargará todavía).',
  'Contiene: TODA la base (módulos de siempre: Caja, Ventas, Inventarios con lotes y caducidad, Empleados, login con PIN) + la gestión completa de inventarios de tu solicitud (alta/edición/eliminación, catálogo con filtros, importar/exportar Excel) + restaurada la herramienta Diagnóstico de conexión de la 3.1.0.',
  'Además corrige un fallo grave descubierto: el auto-actualizador lanzaba el instalador de forma que este se autodetenía — por eso las actualizaciones automáticas no se aplicaban (tus 5 respaldos de BD lo confirman; tu base nunca estuvo en riesgo).',
  'Revisa la lista de módulos que te envié en el chat: si falta algo que tenías, dímelo y lo integro antes de publicar.',
].join(' ')

async function main() {
  await db.solicitud.update({
    where: { id: 1 },
    data: { estado: 'en_proceso', respuesta: RESPUESTA },
  })
  console.log('Solicitud 1 actualizada')

  const detalle = 'v3.3.1 construida (instalador verificado, SHA-256 29583f32…df0e4) — esperando validación del usuario antes de publicar'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'sistema', detalle } })
    console.log('Bitácora registrada')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
