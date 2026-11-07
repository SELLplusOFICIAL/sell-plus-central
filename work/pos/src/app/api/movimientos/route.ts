import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Bitácora de movimientos de inventario
export async function GET() {
  try {
    const movimientos = await db.movimientoInventario.findMany({
      include: { producto: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })
    return Response.json({ ok: true, movimientos })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
