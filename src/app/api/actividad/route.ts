import { db } from '@/lib/db'
import { corsJson, corsOptions } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET() {
  const actividad = await db.actividad.findMany({
    orderBy: { fecha: 'desc' },
    take: 30,
  })
  return corsJson({ actividad })
}

export async function OPTIONS() {
  return corsOptions()
}
