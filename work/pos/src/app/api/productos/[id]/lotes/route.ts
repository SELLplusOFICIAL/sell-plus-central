import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** POST — registrar ENTRADA de mercancía (nuevo lote) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const body = await req.json().catch(() => null)
  const cantidad = Number(body?.cantidad ?? 0)
  if (!cantidad || cantidad <= 0) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'La cantidad debe ser mayor a cero.' },
      { status: 400 }
    )
  }

  const producto = await db.producto.findUnique({ where: { id } })
  if (!producto) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })
  }

  const cad = body?.caducidad ? new Date(body.caducidad) : null
  const lote = await db.lote.create({
    data: {
      productoId: id,
      cantidad,
      cantidadInicial: cantidad,
      caducidad: cad && !isNaN(cad.getTime()) ? cad : null,
      proveedor: String(body?.proveedor ?? '').trim().slice(0, 120),
      costoUnitario: Math.max(0, Number(body?.costoUnitario ?? 0)),
    },
  })

  await db.movimientoInventario.create({
    data: {
      productoId: id,
      tipo: 'entrada',
      cantidad,
      motivo: `Entrada de lote${lote.proveedor ? ' — ' + lote.proveedor : ''}`,
      usuario: r.sesion.nombre,
    },
  })

  return NextResponse.json({ ok: true, lote }, { status: 201 })
}
