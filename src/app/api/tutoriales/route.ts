import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { corsJson, corsOptions } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const tutoriales = await db.tutorial.findMany({
    where: { publicado: true },
    orderBy: [{ orden: 'asc' }, { fecha: 'desc' }],
  })
  return corsJson({ tutoriales })
}

export async function OPTIONS() {
  return corsOptions()
}
