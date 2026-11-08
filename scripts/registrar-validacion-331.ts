import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const sol = await db.solicitud.findUnique({ where: { id: 1 } })
  if (sol && sol.respuesta && !sol.respuesta.includes('Confirmada por el usuario')) {
    await db.solicitud.update({
      where: { id: 1 },
      data: {
        respuesta:
          sol.respuesta +
          ' — ✅ Confirmada por el usuario: «la versión 3.3.1 es la mejor hasta ahora». Instalada y validada en su equipo.',
      },
    })
    console.log('Solicitud 1: validación del usuario anexada')
  } else {
    console.log('Solicitud 1 ya tenía la validación (idempotente)')
  }

  const detalle =
    'Usuario confirmó la v3.3.1 instalada y funcionando: «es la mejor hasta ahora». Solicitud #1 validada y cerrada. El auto-actualizador quedó corregido para futuras versiones'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'solicitud', detalle } })
    console.log('Bitácora: validación registrada')
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
