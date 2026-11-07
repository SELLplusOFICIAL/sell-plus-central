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
    totalVersiones: versiones.length,
    tutorialesCount,
    solicitudesAbiertas,
    actividad,
    ultimaConexion,
  })
}

export async function OPTIONS() {
  return corsOptions()
}
