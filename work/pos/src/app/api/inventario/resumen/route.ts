import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Resumen de alertas del inventario: stock bajo, por caducar y vencidos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      where: { activo: true },
      include: { lotes: { where: { activo: true, cantidad: { gt: 0 } } } },
    })
    const hoy = new Date()
    const en30 = new Date(Date.now() + 30 * 24 * 3600 * 1000)

    const stockBajo: { id: string; nombre: string; stock: number; minimo: number }[] = []
    const porCaducar: { id: string; nombre: string; unidades: number; dias: number; caducidad: string }[] = []
    const vencidos: { id: string; nombre: string; unidades: number; caducidad: string }[] = []

    for (const p of productos) {
      const stock = p.lotes.reduce((s, l) => s + l.cantidad, 0)
      if (stock <= p.minimo) stockBajo.push({ id: p.id, nombre: p.nombre, stock, minimo: p.minimo })
      for (const l of p.lotes) {
        if (!l.caducidad) continue
        if (l.caducidad < hoy) {
          vencidos.push({ id: p.id, nombre: p.nombre, unidades: l.cantidad, caducidad: l.caducidad.toISOString() })
        } else if (l.caducidad <= en30) {
          const dias = Math.ceil((l.caducidad.getTime() - hoy.getTime()) / (24 * 3600 * 1000))
          porCaducar.push({ id: p.id, nombre: p.nombre, unidades: l.cantidad, dias, caducidad: l.caducidad.toISOString() })
        }
      }
    }
    porCaducar.sort((a, b) => a.dias - b.dias)

    return Response.json({
      ok: true,
      totalProductos: productos.length,
      stockBajo,
      porCaducar,
      vencidos,
      totalAlertas: stockBajo.length + porCaducar.length + vencidos.length,
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
