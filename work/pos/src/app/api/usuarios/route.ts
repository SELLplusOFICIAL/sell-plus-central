import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirDueno } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** GET — lista de usuarios (dueño ve todo; empleado solo activos básico) */
export async function GET() {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta

  const usuarios = await db.usuario.findMany({
    select: { id: true, nombre: true, rol: true, activo: true, createdAt: true },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json({ usuarios })
}

/** POST — crear usuario (dueño) */
export async function POST(req: NextRequest) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta

  const body = await req.json().catch(() => null)
  const nombre = String(body?.nombre ?? '').trim()
  const pin = String(body?.pin ?? '').trim()
  const rol = body?.rol === 'dueno' ? 'dueno' : 'empleado'

  if (nombre.length < 2) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'Escribe el nombre del empleado.' },
      { status: 400 }
    )
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: 'pin_invalido', mensaje: 'El PIN debe ser de 4 dígitos.' },
      { status: 400 }
    )
  }

  const existe = await db.usuario.findUnique({ where: { nombre } })
  if (existe) {
    return NextResponse.json(
      { error: 'duplicado', mensaje: 'Ya existe un usuario con ese nombre.' },
      { status: 409 }
    )
  }

  const usuario = await db.usuario.create({ data: { nombre, pin, rol } })
  return NextResponse.json({ ok: true, usuario }, { status: 201 })
}
