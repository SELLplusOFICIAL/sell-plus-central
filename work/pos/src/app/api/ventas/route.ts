import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** GET — historial de ventas (query: ?limite=50&dias=30) */
export async function GET(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta

  const sp = req.nextUrl.searchParams
  const limite = Math.min(200, Math.max(1, parseInt(sp.get('limite') || '60', 10) || 60))
  const dias = Math.max(1, Math.min(365, parseInt(sp.get('dias') || '30', 10) || 30))
  const desde = new Date(Date.now() - dias * 86400000)

  const ventas = await db.venta.findMany({
    where: { createdAt: { gte: desde } },
    include: { items: true, usuario: { select: { nombre: true } } },
    orderBy: { createdAt: 'desc' },
    take: limite,
  })

  const resumen = await db.venta.aggregate({
    where: { createdAt: { gte: desde } },
    _sum: { total: true },
    _count: true,
  })

  const porMetodo = await db.venta.groupBy({
    by: ['metodo'],
    where: { createdAt: { gte: desde } },
    _sum: { total: true },
    _count: true,
  })

  return NextResponse.json({
    ventas,
    resumen: {
      dias,
      total: resumen._sum.total ?? 0,
      cantidad: resumen._count,
      porMetodo: porMetodo.map((m) => ({
        metodo: m.metodo,
        total: m._sum.total ?? 0,
        cantidad: m._count,
      })),
    },
  })
}

/**
 * POST — COBRAR una venta.
 * Descuenta inventario FEFO (primero el lote que caduca más pronto),
 * registra Venta + VentaItems + Movimientos.
 * Body: { items: [{ productoId, cantidad }], metodo: 'efectivo'|'tarjeta', recibido?: number }
 */
export async function POST(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta

  const body = await req.json().catch(() => null)
  const itemsInput = Array.isArray(body?.items) ? body.items : []
  const metodo = body?.metodo === 'tarjeta' ? 'tarjeta' : 'efectivo'
  const recibido = Math.max(0, Number(body?.recibido ?? 0))

  if (itemsInput.length === 0) {
    return NextResponse.json(
      { error: 'carrito_vacio', mensaje: 'El carrito está vacío.' },
      { status: 400 }
    )
  }

  // Traer productos con sus lotes activos ordenados FEFO
  const ids = itemsInput.map((i: { productoId: string }) => String(i.productoId))
  const productos = await db.producto.findMany({
    where: { id: { in: ids }, activo: true },
    include: {
      lotes: { where: { activo: true, cantidad: { gt: 0 } }, orderBy: [{ caducidad: 'asc' }, { createdAt: 'asc' }] },
    },
  })
  const mapa = new Map(productos.map((p) => [p.id, p]))

  // Validar existencia y preparar renglones
  const renglones: { producto: typeof productos[number]; cantidad: number; subtotal: number }[] = []
  for (const it of itemsInput) {
    const p = mapa.get(String(it.productoId))
    if (!p) {
      return NextResponse.json(
        { error: 'producto_no_disponible', mensaje: 'Un producto del carrito ya no está disponible.' },
        { status: 400 }
      )
    }
    const cantidad = Number(it.cantidad ?? 0)
    if (cantidad <= 0) continue
    const existencia = p.lotes.reduce((s, l) => s + l.cantidad, 0)
    if (cantidad > existencia) {
      return NextResponse.json(
        {
          error: 'sin_existencia',
          mensaje: `Solo hay ${existencia} de "${p.nombre}".`,
        },
        { status: 400 }
      )
    }
    renglones.push({ producto: p, cantidad, subtotal: Number((p.precioVenta * cantidad).toFixed(2)) })
  }

  if (renglones.length === 0) {
    return NextResponse.json(
      { error: 'carrito_vacio', mensaje: 'El carrito está vacío.' },
      { status: 400 }
    )
  }

  const total = Number(renglones.reduce((s, r2) => s + r2.subtotal, 0).toFixed(2))

  if (metodo === 'efectivo' && recibido < total) {
    return NextResponse.json(
      { error: 'pago_insuficiente', mensaje: 'El dinero recibido no cubre el total.' },
      { status: 400 }
    )
  }

  // Transacción: venta + items + descontar lotes FEFO + movimientos
  const venta = await db.$transaction(async (tx) => {
    const v = await tx.venta.create({
      data: {
        usuarioId: r.sesion.id,
        total,
        metodo,
        recibido: metodo === 'efectivo' ? recibido : total,
        cambio: metodo === 'efectivo' ? Number((recibido - total).toFixed(2)) : 0,
      },
    })

    for (const ren of renglones) {
      await tx.ventaItem.create({
        data: {
          ventaId: v.id,
          productoId: ren.producto.id,
          nombre: ren.producto.nombre,
          precio: ren.producto.precioVenta,
          cantidad: ren.cantidad,
          subtotal: ren.subtotal,
        },
      })

      let falta = ren.cantidad
      for (const lote of ren.producto.lotes) {
        if (falta <= 0) break
        if (lote.cantidad <= 0) continue
        const tomar = Math.min(lote.cantidad, falta)
        await tx.lote.update({ where: { id: lote.id }, data: { cantidad: lote.cantidad - tomar } })
        falta -= tomar
      }

      await tx.movimientoInventario.create({
        data: {
          productoId: ren.producto.id,
          tipo: 'venta',
          cantidad: ren.cantidad,
          motivo: `Venta ${v.id.slice(-6)}`,
          usuario: r.sesion.nombre,
        },
      })
    }

    return tx.venta.findUnique({
      where: { id: v.id },
      include: { items: true, usuario: { select: { nombre: true } } },
    })
  })

  return NextResponse.json({ ok: true, venta }, { status: 201 })
}
