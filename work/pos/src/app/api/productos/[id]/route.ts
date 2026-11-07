import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion, exigirDueno } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** GET — detalle de un producto: datos, lotes y bitácora de movimientos */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const producto = await db.producto.findUnique({
    where: { id },
    include: {
      lotes: { orderBy: [{ activo: 'desc' }, { createdAt: 'asc' }] },
      movimientos: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })

  if (!producto) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404 })
  }

  // Ventas del producto (últimos 90 días) para la ficha
  const desde = new Date(Date.now() - 90 * 86400000)
  const ventasAgg = await db.ventaItem.aggregate({
    where: { productoId: id, venta: { createdAt: { gte: desde } } },
    _sum: { cantidad: true },
  })

  return NextResponse.json({
    producto: {
      ...producto,
      existencia: producto.lotes.filter((l) => l.activo).reduce((s, l) => s + l.cantidad, 0),
      vendidos90: ventasAgg._sum.cantidad ?? 0,
    },
  })
}

/** PATCH — editar producto (dueño) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta
  const { id } = await params

  const body = await req.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (typeof body?.nombre === 'string' && body.nombre.trim().length >= 2)
    data.nombre = body.nombre.trim().slice(0, 120)
  if (typeof body?.categoria === 'string')
    data.categoria = body.categoria.trim().slice(0, 60) || 'General'
  if (typeof body?.codigo === 'string') data.codigo = body.codigo.trim().slice(0, 60)
  if (body?.precioVenta !== undefined)
    data.precioVenta = Math.max(0, Number(body.precioVenta) || 0)
  if (body?.costo !== undefined) data.costo = Math.max(0, Number(body.costo) || 0)
  if (body?.minimo !== undefined) data.minimo = Math.max(0, Math.round(Number(body.minimo) || 0))
  if (typeof body?.activo === 'boolean') data.activo = body.activo

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400 })
  }

  const producto = await db.producto.update({ where: { id }, data })
  return NextResponse.json({ ok: true, producto })
}

/** DELETE — eliminar producto (dueño). Elimina lotes y bitácora en cascada. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta
  const { id } = await params

  // Las ventas conservan el nombre (VentaItem guarda copia), así que el
  // historial no se rompe: VentaItem.producto queda suelto solo si se
  // borra el producto. Para no romper el historial, permitimos eliminar
  // solo productos sin ventas; para productos con historial se recomienda
  // desactivar. Si se fuerza con ?forzar=1 se elimina igualmente.
  const items = await db.ventaItem.count({ where: { productoId: id } })
  const forzar = req.nextUrl.searchParams.get('forzar') === '1'

  if (items > 0 && !forzar) {
    return NextResponse.json(
      {
        error: 'tiene_ventas',
        mensaje: `Este producto aparece en ${items} venta(s). Se recomienda desactivarlo para conservar el historial. ¿Eliminar de todas formas?`,
        items,
      },
      { status: 409 }
    )
  }

  await db.producto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
