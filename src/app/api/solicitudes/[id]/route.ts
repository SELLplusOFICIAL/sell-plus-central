import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CORS_HEADERS, esAdminValido } from '@/lib/central'

export const dynamic = 'force-dynamic'

const ESTADOS = ['recibida', 'en_proceso', 'lista', 'publicada']

/** PATCH — el desarrollador actualiza estado/respuesta de una solicitud */
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
  const data: { estado?: string; respuesta?: string } = {}
  if (body?.estado && ESTADOS.includes(body.estado)) data.estado = body.estado
  if (typeof body?.respuesta === 'string') data.respuesta = body.respuesta.slice(0, 1000)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400, headers: CORS_HEADERS })
  }

  const solicitud = await db.solicitud.update({ where: { id: solicitudId }, data })
  return NextResponse.json({ ok: true, solicitud }, { headers: CORS_HEADERS })
}
