import { db } from '@/lib/db'
import { corsJson, corsOptions, pickLatest } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET() {
  const versiones = await db.version.findMany({ orderBy: { fecha: 'desc' } })
  const latest = pickLatest(versiones)
  return corsJson({ versiones, ultimaVersion: latest?.version ?? null })
}

export async function OPTIONS() {
  return corsOptions()
}
