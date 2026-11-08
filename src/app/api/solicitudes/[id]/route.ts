import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CORS_HEADERS, esAdminValido } from '@/lib/central'

export const dynamic = 'force-dynamic'

const ESTADOS = ['recibida', 'en_proceso', 'lista', 'publicada']

/** Línea base de progreso por estado (si no se envía un progreso explícito). */
const BASE_PROGRESO: Record<string, number> = {
  recibida: 10,
  en_proceso: 50,
  lista: 85,
  publicada: 100,
}

/** PATCH — el desarrollador actualiza estado, respuesta y progreso de una solicitud */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!esAdminValido(req)) {
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
    progreso?: number
    fase?: string | null
    tiempoEstimado?: string | null
  } = {}
  if (body?.estado && ESTADOS.includes(body.estado)) data.estado = body.estado
  if (typeof body?.respuesta === 'string') data.respuesta = body.respuesta.slice(0, 1000)
  if (typeof body?.progreso === 'number' && Number.isFinite(body.progreso)) {
    data.progreso = Math.max(0, Math.min(100, Math.round(body.progreso)))
  }
  if (body?.fase === null || typeof body?.fase === 'string') {
    data.fase =
      typeof body.fase === 'string' && body.fase.trim() ? body.fase.trim().slice(0, 120) : null
  }
  if (body?.tiempoEstimado === null || typeof body?.tiempoEstimado === 'string') {
    data.tiempoEstimado =
      typeof body.tiempoEstimado === 'string' && body.tiempoEstimado.trim()
        ? body.tiempoEstimado.trim().slice(0, 120)
        : null
  }
  // Si cambia el estado sin progreso explícito, aplicar la línea base del estado
  if (data.estado && data.progreso === undefined) {
    const base = BASE_PROGRESO[data.estado]
    if (base !== undefined) data.progreso = base
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400, headers: CORS_HEADERS })
  }

  const solicitud = await db.solicitud.update({ where: { id: solicitudId }, data })
  return NextResponse.json({ ok: true, solicitud }, { headers: CORS_HEADERS })
}
