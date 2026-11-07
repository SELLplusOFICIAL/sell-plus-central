import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { corsJson, corsOptions, CORS_HEADERS, logActividad } from '@/lib/central'

export const dynamic = 'force-dynamic'

const MAX_CHECKS = 40
const CONSERVAR = 50 // poda: conserva los últimos 50 análisis

type CheckEntrada = {
  nombre?: unknown
  estado?: unknown
  detalle?: unknown
}

/** Normaliza y valida los checks que llegan del Paladín */
function normalizarChecks(brutos: unknown): { nombre: string; estado: string; detalle: string }[] {
  if (!Array.isArray(brutos)) return []
  const validos = ['ok', 'alerta', 'fallo']
  const limpios: { nombre: string; estado: string; detalle: string }[] = []
  for (const c of brutos.slice(0, MAX_CHECKS)) {
    const nombre = String((c as CheckEntrada)?.nombre ?? '').trim().slice(0, 120)
    if (!nombre) continue
    let estado = String((c as CheckEntrada)?.estado ?? 'ok').toLowerCase()
    if (!validos.includes(estado)) estado = 'alerta'
    const detalle = String((c as CheckEntrada)?.detalle ?? '').trim().slice(0, 300)
    limpios.push({ nombre, estado, detalle })
  }
  return limpios
}

/** GET /api/paladin → último análisis + historial corto */
export async function GET() {
  const ultimo = await db.paladinReporte.findFirst({ orderBy: { fecha: 'desc' } })
  const anterioresBrutos = await db.paladinReporte.findMany({
    orderBy: { fecha: 'desc' },
    skip: 1,
    take: 6,
    select: { id: true, origen: true, versionPos: true, estadoGlobal: true, resumen: true, fecha: true },
  })

  const ultimoFormateado = ultimo
    ? {
        ...ultimo,
        checks: JSON.parse(ultimo.checks || '[]'),
        fecha: ultimo.fecha.toISOString(),
      }
    : null

  return corsJson({
    ultimo: ultimoFormateado,
    anteriores: anterioresBrutos.map((a) => ({ ...a, fecha: a.fecha.toISOString() })),
  })
}

/**
 * POST /api/paladin → el Paladín reporta su análisis.
 * Lo envía el paladín de publicación (cada build antes de publicarse) y,
 * a partir de la próxima versión con telemetría, el Paladín del POS.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body?.checks) || body.checks.length === 0) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'El reporte necesita al menos una verificación.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const checks = normalizarChecks(body.checks)
  const okCount = checks.filter((c) => c.estado === 'ok').length
  const alertasCount = checks.filter((c) => c.estado === 'alerta').length
  const fallosCount = checks.filter((c) => c.estado === 'fallo').length
  const estadoGlobal = fallosCount > 0 ? 'fallo' : alertasCount > 0 ? 'alerta' : 'ok'
  const origen = ['publicacion', 'pos'].includes(body?.origen) ? body.origen : 'publicacion'
  const versionPos = body?.versionPos ? String(body.versionPos).slice(0, 20) : null
  const duracionMs =
    typeof body?.duracionMs === 'number' && body.duracionMs >= 0 && body.duracionMs < 3_600_000
      ? Math.round(body.duracionMs)
      : null

  // Resumen en lenguaje del dueño (si el Paladín no envió uno propio)
  const resumen =
    (typeof body?.resumen === 'string' && body.resumen.trim().slice(0, 300)) ||
    (estadoGlobal === 'ok'
      ? `Análisis completo: ${okCount} verificación${okCount === 1 ? '' : 'es'} en orden. El sistema está sano.`
      : estadoGlobal === 'alerta'
        ? `Análisis con observaciones: ${okCount} en orden, ${alertasCount} con advertencia${alertasCount === 1 ? '' : 's'}. Nada crítico.`
        : `Análisis con problemas: ${fallosCount} fallo${fallosCount === 1 ? '' : 's'} detectado${fallosCount === 1 ? '' : 's'}. Se corrigió o bloqueó antes de publicar.`)

  const reporte = await db.paladinReporte.create({
    data: {
      origen,
      versionPos,
      estadoGlobal,
      resumen,
      checks: JSON.stringify(checks),
      okCount,
      alertasCount,
      fallosCount,
      duracionMs,
    },
  })

  // Poda del historial
  const total = await db.paladinReporte.count()
  if (total > CONSERVAR) {
    const viejos = await db.paladinReporte.findMany({
      orderBy: { fecha: 'desc' },
      skip: CONSERVAR,
      select: { id: true },
    })
    if (viejos.length > 0) {
      await db.paladinReporte.deleteMany({ where: { id: { in: viejos.map((v) => v.id) } } })
    }
  }

  await logActividad(
    'paladin',
    estadoGlobal === 'ok'
      ? `🛡️ Paladín analizó ${origen === 'pos' ? 'el programa en tu PC' : 'el build antes de publicar'}${versionPos ? ` (v${versionPos})` : ''}: todo en orden`
      : `🛡️ Paladín detectó algo${versionPos ? ` en v${versionPos}` : ''}: ${fallosCount} fallo(s), ${alertasCount} advertencia(s)`
  )

  return corsJson({ ok: true, id: reporte.id, estadoGlobal }, 201)
}

export async function OPTIONS() {
  return corsOptions()
}
