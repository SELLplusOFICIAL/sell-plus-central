import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/**
 * GET — EXPORTAR a Excel: Inventario (Productos + Lotes) y ventas.
 * Query: ?seccion=inventario (default) | ventas&dias=30
 * Devuelve un .xlsx descargable.
 */
export async function GET(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta

  const seccion = req.nextUrl.searchParams.get('seccion') || 'inventario'

  const wb = XLSX.utils.book_new()

  if (seccion === 'ventas') {
    const dias = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get('dias') || '30', 10) || 30))
    const desde = new Date(Date.now() - dias * 86400000)
    const ventas = await db.venta.findMany({
      where: { createdAt: { gte: desde } },
      include: { items: true, usuario: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const filasV: Record<string, unknown>[] = []
    for (const v of ventas) {
      for (const it of v.items) {
        filasV.push({
          Fecha: new Date(v.createdAt).toLocaleString('es-MX'),
          Venta: v.id.slice(-8),
          Atendio: v.usuario.nombre,
          Producto: it.nombre,
          Cantidad: it.cantidad,
          Precio: it.precio,
          Subtotal: it.subtotal,
          'Total venta': v.total,
          Metodo: v.metodo,
        })
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasV), 'Ventas')
  } else {
    // --- Hoja Productos ---
    const productos = await db.producto.findMany({
      include: { lotes: { where: { activo: true } } },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    })

    const filasP = productos.map((p) => {
      const existencia = p.lotes.reduce((s, l) => s + l.cantidad, 0)
      const proxima = p.lotes
        .filter((l) => l.caducidad && l.cantidad > 0)
        .map((l) => l.caducidad as Date)
        .sort((a, b) => a.getTime() - b.getTime())[0]
      return {
        Nombre: p.nombre,
        Categoria: p.categoria,
        Codigo: p.codigo,
        Precio: p.precioVenta,
        Costo: p.costo,
        Minimo: p.minimo,
        Existencia: Number(existencia.toFixed(3)),
        'Proxima caducidad': proxima
          ? new Date(proxima).toLocaleDateString('es-MX')
          : '',
        Activo: p.activo ? 'Sí' : 'No',
      }
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasP), 'Productos')

    // --- Hoja Lotes (plantilla re-importable) ---
    const filasL: Record<string, unknown>[] = []
    for (const p of productos) {
      for (const l of p.lotes) {
        filasL.push({
          Nombre: p.nombre,
          Categoria: p.categoria,
          Codigo: p.codigo,
          Precio: p.precioVenta,
          Costo: p.costo,
          Minimo: p.minimo,
          Existencia: l.cantidad,
          Caducidad: l.caducidad ? new Date(l.caducidad).toISOString().slice(0, 10) : '',
          Proveedor: l.proveedor,
          CostoUnitario: l.costoUnitario,
        })
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasL), 'Lotes')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const nombreArchivo =
    seccion === 'ventas'
      ? `Sell-Plus-Ventas-${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Sell-Plus-Inventario-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}
