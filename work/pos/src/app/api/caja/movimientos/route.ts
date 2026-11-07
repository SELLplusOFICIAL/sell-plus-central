import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/sesion'
import { asegurarEsquemaCaja } from '@/lib/esquema'

export const dynamic = 'force-dynamic'

/**
 * v3.3.3 — Dinero en caja: entradas y salidas de efectivo que no son ventas.
 * GET  → resumen del día + últimos movimientos.
 * POST → registra { tipo: 'entrada'|'salida', monto, motivo? }.
 */
function inicioDelDia(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function resumenDelDia() {
  const desde = inicioDelDia()
  const agg = await db.movimientoCaja.groupBy({
    by: ['tipo'],
    where: { createdAt: { gte: desde } },
    _sum: { monto: true },
  })
  const entradas = agg.find((a) => a.tipo === 'entrada')?._sum.monto ?? 0
  const salidas = agg.find((a) => a.tipo === 'salida')?._sum.monto ?? 0
  const ventasHoy = await db.venta.aggregate({
    where: { createdAt: { gte: desde }, metodo: 'efectivo' },
    _sum: { total: true },
  })
  const ventasEfectivo = ventasHoy._sum.total ?? 0
  return {
    entradas,
    salidas,
    ventasEfectivo,
    enCaja: Number((ventasEfectivo + entradas - salidas).toFixed(2)),
  }
}

export async function GET() {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  await asegurarEsquemaCaja()

  const movimientos = await db.movimientoCaja.findMany({
    where: { createdAt: { gte: inicioDelDia() } },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })

  return NextResponse.json({ ok: true, resumen: await resumenDelDia(), movimientos })
}

export async function POST(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta
  await asegurarEsquemaCaja()

  const body = await req.json().catch(() => null)
  const tipo = body?.tipo === 'salida' ? 'salida' : body?.tipo === 'entrada' ? 'entrada' : null
  const monto = Number(body?.monto)
  const motivo = String(body?.motivo ?? '').trim().slice(0, 200)

  if (!tipo || !isFinite(monto) || monto <= 0 || monto > 1_000_000) {
    return NextResponse.json(
      { ok: false, mensaje: 'Captura un monto válido mayor a cero.' },
      { status: 400 }
    )
  }

  const movimiento = await db.movimientoCaja.create({
    data: {
      tipo,
      monto: Math.round(monto * 100) / 100,
      motivo,
      usuario: r.sesion.nombre,
    },
  })

  return NextResponse.json({ ok: true, movimiento, resumen: await resumenDelDia() })
}
