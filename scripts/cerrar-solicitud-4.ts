import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Solicitud #4 → publicada al 100%
  await db.solicitud.update({
    where: { id: 4 },
    data: {
      estado: 'publicada',
      progreso: 100,
      fase: 'Completado — sección del Paladín activa en la Central',
      respuesta:
        'Lista. En la pestaña Inicio de la Central hay ahora una sección pequeña del Paladín: muestra su estado general (Todo en orden / Con observaciones / Detectó un problema), el resumen del análisis y, al tocar la flechita, cada verificación realizada. El primer análisis real ya está visible: el Paladín de publicación probó el build v3.3.2 (arranque, 5 pantallas, 2 APIs y base de datos: todo en orden). Cada publicación futura dejará aquí su análisis automáticamente.',
    },
  })

  const detalle =
    'Sección del Paladín añadida a la Central (solicitud #4): resumen del análisis del guardián en Inicio, API /api/paladin con historial, y el Paladín de publicación ahora reporta automáticamente cada análisis. Primer análisis real registrado: build v3.3.2 aprobado (9 verificaciones).'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'sistema', detalle } })
    console.log('Bitácora registrada')
  } else {
    console.log('Bitácora ya existía')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
