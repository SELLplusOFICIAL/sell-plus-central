import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.usuario.findFirst()
    return Response.json({ ok: true, version: '3.2.0', app: 'Sell-Plus' })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
