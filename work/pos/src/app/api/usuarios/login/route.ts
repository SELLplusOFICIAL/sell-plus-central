import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Iniciar turno: «¿Quién está en caja?»
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const nombre = String(b.nombre || '').trim()
    const pin = String(b.pin || '').trim()
    const usuario = await db.usuario.findFirst({ where: { nombre, activo: true } })
    if (!usuario || usuario.pin !== pin) {
      return Response.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 })
    }
    return Response.json({
      ok: true,
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
