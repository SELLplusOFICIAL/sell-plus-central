import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CORS_HEADERS } from '@/lib/central'

export const dynamic = 'force-dynamic'

const ESTADOS = ['recibida', 'en_proceso', 'lista', 'publicada']

/** PATCH — el desarrollador actualiza estado/respuesta de una solicitud */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const key = req.headers.get('x-central-key')
  if (key !== 'sellplus-admin-2026') {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  }

  const { id } = await params
  const solicitudId = parseInt(id, 10)
  if (Number.isNaN(solicitudId)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
  }

  const body = await req.json().catch(() => null)
  const data: {
    estado?: string
    respuesta?: string
    tiempoEstimado?: string
    progreso?: number
    fase?: string
  } = {}
  if (body?.estado && ESTADOS.includes(body.estado)) data.estado = body.estado
  if (typeof body?.respuesta === 'string') data.respuesta = body.respuesta.slice(0, 1000)
  // Indicador de trabajo en vivo
  if (typeof body?.tiempoEstimado === 'string') data.tiempoEstimado = body.tiempoEstimado.slice(0, 40)
  if (typeof body?.progreso === 'number') {
    data.progreso = Math.max(0, Math.min(100, Math.round(body.progreso)))
  }
  if (typeof body?.fase === 'string') data.fase = body.fase.slice(0, 120)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400, headers: CORS_HEADERS })
  }

  const solicitud = await db.solicitud.update({ where: { id: solicitudId }, data })
  return NextResponse.json({ ok: true, solicitud }, { headers: CORS_HEADERS })
}
