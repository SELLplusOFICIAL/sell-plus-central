import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const entradas = [
    '🛡️ El vigilante detectó que el entorno de la Central fue revertido a una instantánea antigua (00:57): instaladores, código del POS y registros recientes desaparecieron temporalmente. Tu software instalado (v3.3.2) NO se vio afectado.',
    '🔧 Recuperación completada: se restauró el estado completo desde la instantánea de las 08:42 (6 instaladores incluido 3.3.2, código fuente del POS, sección del Paladín, BD con solicitudes #1–#4, bitácora y SHA del actualizador). Punto de recuperación fijado en git.',
  ]
  for (const detalle of entradas) {
    const ya = await db.actividad.findFirst({ where: { detalle } })
    if (!ya) await db.actividad.create({ data: { tipo: 'sistema', detalle } })
  }
  console.log('Bitácora del incidente registrada')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
