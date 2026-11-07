import { db } from '@/lib/db'
import { corsJson, corsOptions } from '@/lib/central'
import { pickLatest } from '@/lib/central'

export const dynamic = 'force-dynamic'

/** Datos agregados para la pestaña Inicio */
export async function GET() {
  const versiones = await db.version.findMany({ orderBy: { fecha: 'desc' } })
  const latest = pickLatest(versiones)

  const [tutorialesCount, solicitudesAbiertas, actividad] = await Promise.all([
    db.tutorial.count({ where: { publicado: true } }),
    db.solicitud.count({ where: { estado: { in: ['recibida', 'en_proceso'] } } }),
    db.actividad.findMany({ orderBy: { fecha: 'desc' }, take: 12 }),
  ])

  const ultimaConexion = await db.actividad.findFirst({
    where: { tipo: 'check_actualizacion' },
    orderBy: { fecha: 'desc' },
  })

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [totalLatidos24h, descargasRecientes] = await Promise.all([
    db.actividad.count({ where: { tipo: 'latido', fecha: { gte: hace24h } } }),
    db.actividad.findMany({
      where: { tipo: 'descarga' },
      orderBy: { fecha: 'desc' },
      take: 5,
    }),
  ])

  return corsJson({
    ultimaVersion: latest
      ? {
          version: latest.version,
          titulo: latest.titulo,
          notas: latest.notas,
          fecha: latest.fecha,
          fileName: latest.fileName,
          fileSize: latest.fileSize,
          sha256: latest.sha256,
        }
      : null,
    // Alias con el nombre que consume la pestaña Inicio (resumen-tab)
    versionPublicada: latest
      ? {
          version: latest.version,
          titulo: latest.titulo,
          notas: latest.notas,
          fecha: latest.fecha,
          fileName: latest.fileName,
          fileSize: latest.fileSize,
          sha256: latest.sha256,
        }
      : null,
    totalVersiones: versiones.length,
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
