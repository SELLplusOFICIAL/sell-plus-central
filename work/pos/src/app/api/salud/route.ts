import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/salud — chequeo de vida para el Paladín (v3.3.3).
 * El Paladín (proceso Electron) lo consulta cada 30 s:
 *  - Si responde: el servidor local está vivo.
 *  - db "ok": la base de datos contesta consultas.
 *  - db "error": posible corrupción → el Paladín intenta restaurar el último respaldo.
 */
export async function GET() {
  let estadoDb = 'ok'
  try {
    await db.$queryRawUnsafe('SELECT 1')
  } catch {
    estadoDb = 'error'
  }
  return NextResponse.json(
    { ok: true, db: estadoDb, version: '3.3.3' },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
