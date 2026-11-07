import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const RESPUESTA = [
  'Criterio de actualización actualizado a petición del usuario (regla fija a partir de ahora):',
  'TODA versión nueva será ACUMULATIVA — parte de la base completa que ya existe desde la 3.1.0 y encima integra la mejora solicitada, adaptándola para mantener congruencia y estabilidad del sistema de gestión. Las redundancias se fusionan a criterio del desarrollador y se documentan.',
  'La 3.3.0 quedó corta porque se reconstruyó desde la ficha técnica de la base de datos y la interfaz de 3.1.0/3.2.0 no se conservó completa. Se prepara la 3.3.1: restaura todas las características previas e integra la gestión de inventarios sobre esa base.',
  'Estado: esperando visto bueno del usuario para arrancar (y el instalador 3.2.0 si lo conserva, para máxima fidelidad).',
].join(' ')

async function main() {
  // 1) Solicitud #1 vuelve a en_proceso con la nueva respuesta
  const sol = await db.solicitud.update({
    where: { id: 1 },
    data: { estado: 'en_proceso', respuesta: RESPUESTA },
  })
  console.log('Solicitud:', sol.id, sol.estado)

  // 2) Bitácora de la Central (sin duplicar si ya existe)
  const detalle =
    'Criterio de actualización definido con el usuario: versiones acumulativas (base completa 3.1.0/3.2.0 + mejora integrada). Próxima: 3.3.1'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'sistema', detalle } })
    console.log('Bitácora registrada')
  } else {
    console.log('Bitácora ya existía')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
