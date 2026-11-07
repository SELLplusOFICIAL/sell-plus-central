import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const existente = await db.solicitud.findFirst({
    where: { titulo: { contains: 'Paladín' } },
  })
  if (existente) {
    console.log('Solicitud ya existía:', existente.id)
    return
  }

  const sol = await db.solicitud.create({
    data: {
      titulo: 'Indicador de trabajo en solicitudes + Paladín guardián del sistema',
      descripcion:
        'Petición del dueño: (1) Que en la solicitud exista un indicador donde se pueda ver el tiempo estimado y algún otro detalle relevante del trabajo en curso. (2) Un paladín que vigile el código del programa, previniendo fallas inesperadas y previniendo que una solicitud, cambio o actualización futura atore o bote el programa.',
      prioridad: 'alta',
      estado: 'en_proceso',
      respuesta:
        'Recibida y en construcción AHORA MISMO. Parte 1 (indicador con tiempo estimado, fase y progreso): es la barra que estás viendo — funciona desde ya. Parte 2 (Paladín): guardián dentro de Sell-Plus que vigila el programa 24/7, se reinicia solo si algo falla, verifica la base de datos y bloquea actualizaciones peligrosas con reversión automática. Llega como v3.3.2.',
      tiempoEstimado: '60–90 min',
      progreso: 15,
      fase: 'Registrando la solicitud y actualizando la Central',
    },
  })
  console.log('Solicitud creada:', sol.id)

  const detalle =
    'Nueva solicitud #2 del dueño: indicador de tiempo estimado/progreso en solicitudes + Paladín guardián (vigilancia del programa, auto-recuperación y bloqueo de actualizaciones peligrosas). Estado: en_proceso (15%)'
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) await db.actividad.create({ data: { tipo: 'solicitud', detalle } })
  console.log('Bitácora registrada')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
