import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let tienda = await db.tienda.findFirst()
    if (!tienda) tienda = await db.tienda.create({ data: {} })
    return Response.json({ ok: true, tienda })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const actual = await db.tienda.findFirst()
    const datos = {
      nombre: String(body.nombre || actual?.nombre || 'Mi Tienda').slice(0, 120),
      direccion: String(body.direccion ?? actual?.direccion ?? '').slice(0, 240),
      telefono: String(body.telefono ?? actual?.telefono ?? '').slice(0, 40),
      moneda: String(body.moneda || actual?.moneda || 'MXN').slice(0, 8),
    }
    const tienda = actual
      ? await db.tienda.update({ where: { id: actual.id }, data: datos })
      : await db.tienda.create({ data: datos })
    return Response.json({ ok: true, tienda })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
