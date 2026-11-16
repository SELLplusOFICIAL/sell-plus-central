import { db } from '@/lib/db'
import { corsJson, corsOptions, pickLatest } from '@/lib/central'

export const dynamic = 'force-dynamic'

/** Datos agregados para la pestaña Inicio (consulta ligera, sin notas largas). */
export async function GET() {
  // Solo se necesita la columna `version` para decidir la última; antes se
  // traían las notas completas de las 100+ versiones en cada consulta.
  const versiones = await db.version.findMany({
    orderBy: { fecha: 'desc' },
    select: { version: true },
  })
  const latest = pickLatest(versiones)

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [tutorialesCount, solicitudesAbiertas, actividad, ultimaConexion, totalLatidos24h, descargasRecientes, totalVersiones] =
    await Promise.all([
      db.tutorial.count({ where: { publicado: true } }),
      db.solicitud.count({ where: { estado: { in: ['recibida', 'en_proceso'] } } }),
      db.actividad.findMany({ orderBy: { fecha: 'desc' }, take: 12 }),
      db.actividad.findFirst({
        where: { tipo: 'check_actualizacion' },
        orderBy: { fecha: 'desc' },
      }),
      db.actividad.count({ where: { tipo: 'latido', fecha: { gte: hace24h } } }),
      db.actividad.findMany({
        where: { tipo: 'descarga' },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
      db.version.count(),
    ])

  const filaUltima = latest
    ? await db.version.findUnique({
        where: { version: latest.version },
        select: { version: true, titulo: true, fecha: true, fileName: true, fileSize: true, sha256: true },
      })
    : null

  return corsJson({
    ultimaVersion: filaUltima,
    // Alias con el nombre que consume la pestaña Inicio
    versionPublicada: filaUltima,
    totalVersiones,
    tutoriales: tutorialesCount,
    tutorialesCount,
    solicitudesAbiertas,
    actividad,
    ultimaConexion,
    totalLatidos24h,
    descargasRecientes,
    cajasActivas: [] as unknown[], // reservado: el POS aún no reporta sesiones de caja
  })
}

export async function OPTIONS() {
  return corsOptions()
}
