import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Latido del software instalado (GET o POST, cada 15 min y al arrancar)
async function registrar(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    let body: Record<string, unknown> = {}
    try {
      if (req.method === 'POST') body = await req.json()
    } catch {
      body = {}
    }
    const version = String(body.version || sp.get('version') || sp.get('v') || '').slice(0, 20)
    const hostname = String(body.hostname || sp.get('hostname') || sp.get('host') || '').slice(0, 80)
    // Migrado a la bitácora real `Actividad` (el modelo Heartbeat ya no
    // existe en el esquema). Solicitud #9.
    await db.actividad.create({
      data: {
        tipo: 'ping',
        detalle: `Latido recibido — equipo: ${hostname || 'desconocido'} — versión: ${version || 'desconocida'} — ip: ${(req.headers.get('x-forwarded-for') || '').slice(0, 60)}`,
      },
    })
    return Response.json({
      ok: true,
      recibido: true,
      hora: new Date().toISOString(),
      message: 'Latido recibido por Sell-Plus Central',
    })
  } catch (e) {
    return Response.json({ ok: true, error: String(e) })
  }
}

export async function GET(req: NextRequest) {
  return registrar(req)
}

export async function POST(req: NextRequest) {
  return registrar(req)
}
