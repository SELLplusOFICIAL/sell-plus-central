import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** PATCH — ajustar lote: cantidad (ajuste), caducidad, proveedor, costo, activar/desactivar (merma) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const body = await req.json().catch(() => null)
  const lote = await db.lote.findUnique({ where: { id } })
  if (!lote) return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (body?.cantidad !== undefined) {
    const nueva = Math.max(0, Number(body.cantidad) || 0)
    if (nueva !== lote.cantidad) {
      const dif = nueva - lote.cantidad
      await db.movimientoInventario.create({
        data: {
          productoId: lote.productoId,
          tipo: dif < 0 ? (body?.esMerma ? 'merma' : 'ajuste') : 'ajuste',
          cantidad: Math.abs(dif),
          motivo: String(body?.motivo ?? (dif < 0 ? 'Ajuste negativo' : 'Ajuste positivo')),
          usuario: r.sesion.nombre,
        },
      })
    }
    data.cantidad = nueva
  }

  if (body?.caducidad !== undefined) {
    if (body.caducidad === null || body.caducidad === '') {
      data.caducidad = null
    } else {
      const c = new Date(body.caducidad)
      data.caducidad = isNaN(c.getTime()) ? null : c
    }
  }
  if (typeof body?.proveedor === 'string') data.proveedor = body.proveedor.trim().slice(0, 120)
  if (body?.costoUnitario !== undefined)
    data.costoUnitario = Math.max(0, Number(body.costoUnitario) || 0)
  if (typeof body?.activo === 'boolean') {
    data.activo = body.activo
    if (!body.activo && lote.cantidad > 0) {
      // Retirar el lote completo del inventario activo = merma
      await db.movimientoInventario.create({
        data: {
          productoId: lote.productoId,
          tipo: 'merma',
          cantidad: lote.cantidad,
          motivo: String(body?.motivo ?? 'Lote retirado del inventario'),
          usuario: r.sesion.nombre,
        },
      })
      data.cantidad = 0
    }
  }

  const actualizado = await db.lote.update({ where: { id }, data })
  return NextResponse.json({ ok: true, lote: actualizado })
}

/** DELETE — eliminar lote definitivamente (dueño vía PATCH activo:false recomendado) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const lote = await db.lote.findUnique({ where: { id } })
  if (!lote) return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })

  if (lote.cantidad > 0) {
    await db.movimientoInventario.create({
      data: {
        productoId: lote.productoId,
        tipo: 'merma',
        cantidad: lote.cantidad,
        motivo: 'Lote eliminado',
        usuario: r.sesion.nombre,
      },
    })
  }

  await db.lote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
