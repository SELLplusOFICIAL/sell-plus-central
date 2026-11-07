import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** GET — resumen de ventas por periodo (query: ?dias=7|30|90) */
export async function GET(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta

  const dias = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get('dias') || '30', 10) || 30))
  const desde = new Date(Date.now() - dias * 86400000)

  const [totalAgg, porDia, porMetodo, topProductos] = await Promise.all([
    db.venta.aggregate({ where: { createdAt: { gte: desde } }, _sum: { total: true }, _count: true }),
    db.$queryRawUnsafe<{ dia: string; total: number; cantidad: number }[]>(
      `SELECT date(createdAt) as dia, SUM(total) as total, COUNT(*) as cantidad
       FROM Venta WHERE createdAt >= ? GROUP BY date(createdAt) ORDER BY dia DESC LIMIT 60`,
      desde.toISOString()
    ),
    db.venta.groupBy({
      by: ['metodo'],
      where: { createdAt: { gte: desde } },
      _sum: { total: true },
      _count: true,
    }),
    db.ventaItem.groupBy({
      by: ['productoId', 'nombre'],
      where: { venta: { createdAt: { gte: desde } } },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 10,
    }),
  ])

  return NextResponse.json({
    dias,
    total: totalAgg._sum.total ?? 0,
    cantidad: totalAgg._count,
    porDia,
    porMetodo: porMetodo.map((m) => ({ metodo: m.metodo, total: m._sum.total ?? 0, cantidad: m._count })),
    topProductos: topProductos.map((t) => ({
      productoId: t.productoId,
      nombre: t.nombre,
      cantidad: t._sum.cantidad ?? 0,
      importe: t._sum.subtotal ?? 0,
    })),
  })
}
