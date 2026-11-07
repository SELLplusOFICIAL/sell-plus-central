import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const GUIA = `Con la versión 3.3.2 tu Sell-Plus tiene un guardián propio: el PALADÍN. Trabaja en silencio para que ninguna falla te detenga.

1) ¿Qué hace?
- Vigila el programa constantemente. Si el motor interno se detiene, lo re-levanta solo (hasta 3 veces por hora).
- Cada 30 segundos revisa la salud del sistema. Si detecta un cuelgue, lo corrige sin que hagas nada.
- Cuidado de tu base de datos: si algún día dejara de responder, el Paladín la restaura desde el respaldo más reciente y te avisa con un mensaje claro. Tus ventas y productos nunca están en riesgo.

2) ¿Y si una actualización trae problemas?
- Cada versión nueva pasa por una "prueba de arranque": el Paladín la observa durante sus primeras ejecuciones.
- Si la versión nueva falla 3 veces, el Paladín REVIERTE solo a la versión estable anterior (se guarda una copia del instalador en C:\\Sell-Plus\\updates) y aparta la versión problemática para que no se reinstale sola.
- Tu base de datos no se toca en ninguna parte del proceso.

3) ¿Cómo sé qué pasó?
- El Paladín escribe su diario en: C:\\Sell-Plus\\resources\\app\\logs\\paladin.log
- Ahí queda registrado cada problema detectado y cada corrección automática.

4) ¿Tengo que hacer algo?
- No. El Paladín trabaja solo. Si alguna vez te muestra un aviso, léelo: siempre te dice qué se corrigió y qué paso seguir.`

async function main() {
  const g = {
    titulo: 'El Paladín: tu guardián silencioso (3.3.2)',
    descripcion: 'Qué es el Paladín que vino con la 3.3.2 y cómo protege tu programa y tu información.',
    contenido: GUIA,
    minutos: 4,
    orden: 4,
  }
  const existente = await db.tutorial.findFirst({ where: { titulo: g.titulo } })
  if (existente) {
    await db.tutorial.update({ where: { id: existente.id }, data: g })
    console.log('Guía actualizada')
  } else {
    await db.tutorial.create({ data: { ...g, tipo: 'guia' } })
    console.log('Guía creada')
  }

  const detalle =
    'v3.3.2 publicada: Paladín guardián (auto-recuperación del servidor, monitor de salud 30 s, restauración automática de BD, rollback de actualizaciones fallidas) + indicador en vivo de solicitudes en la Central (tiempo estimado, fase y progreso). Solicitud #3 publicada al 100%. SHA-256 6af4bcb5…84822'
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
