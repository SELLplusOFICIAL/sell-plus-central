import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { corsJson, corsOptions, CORS_HEADERS, logActividad } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET() {
  const solicitudes = await db.solicitud.findMany({ orderBy: { fecha: 'desc' } })
  return corsJson({ solicitudes })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const titulo = (body?.titulo || '').toString().trim()
  const descripcion = (body?.descripcion || '').toString().trim()
  const prioridad = ['alta', 'media', 'baja'].includes(body?.prioridad)
    ? body.prioridad
    : 'media'

  if (titulo.length < 3 || descripcion.length < 5) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'Escribe un título y una descripción más completa.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const solicitud = await db.solicitud.create({
    data: { titulo: titulo.slice(0, 120), descripcion: descripcion.slice(0, 2000), prioridad },
  })

  await logActividad('solicitud', `Nueva solicitud: "${titulo.slice(0, 80)}"`)

  return corsJson({ ok: true, solicitud }, 201)
}

export async function OPTIONS() {
  return corsOptions()
}
