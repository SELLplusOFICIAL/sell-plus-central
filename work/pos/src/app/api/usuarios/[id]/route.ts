import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirDueno } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** PATCH — activar/desactivar usuario o cambiar PIN (dueño) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const body = await req.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (typeof body?.activo === 'boolean') data.activo = body.activo
  if (typeof body?.pin === 'string') {
    if (!/^\d{4}$/.test(body.pin.trim())) {
      return NextResponse.json(
        { error: 'pin_invalido', mensaje: 'El PIN debe ser de 4 dígitos.' },
        { status: 400 }
      )
    }
    data.pin = body.pin.trim()
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400 })
  }

  const usuario = await db.usuario.update({
    where: { id },
    data,
    select: { id: true, nombre: true, rol: true, activo: true },
  })
  return NextResponse.json({ ok: true, usuario })
}
