import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { corsJson, corsOptions, esAdminValido, respuestaNoAutorizado } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!esAdminValido(req)) return respuestaNoAutorizado()
  const actividad = await db.actividad.findMany({
    orderBy: { fecha: 'desc' },
    take: 30,
  })
  return corsJson({ actividad })
}

export async function OPTIONS() {
  return corsOptions()
}
