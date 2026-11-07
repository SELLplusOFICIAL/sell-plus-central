import { NextRequest } from 'next/server'
import { logActividad } from '@/lib/central'

export const dynamic = 'force-dynamic'

// Latido del software instalado (GET o POST, cada 15 min y al arrancar).
// Se registra en la bitácora de actividad (tipo "latido"); logActividad
// evita duplicados a menos de 10 minutos y nunca rompe el endpoint.
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

    await logActividad(
      'latido',
      `Sell-Plus ${version || '(sin versión)'} conectado desde ${hostname || 'equipo desconocido'}`
    )

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
