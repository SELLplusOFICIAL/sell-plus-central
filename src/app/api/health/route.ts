import { db } from '@/lib/db'
import { corsJson, corsOptions } from '@/lib/central'
import { pickLatest } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET() {
  const versiones = await db.version.findMany({ where: { activo: true } })
  const latest = pickLatest(versiones)
  return corsJson({
    ok: true,
    servidor: 'Sell-Plus Central',
    ultimaVersion: latest?.version ?? null,
    hora: new Date().toISOString(),
  })
}

export async function OPTIONS() {
  return corsOptions()
}
