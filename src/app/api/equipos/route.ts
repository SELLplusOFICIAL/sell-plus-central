import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { compareVersions } from '@/lib/sellplus-ai'
import { CORS_HEADERS, esAdminValido, logActividad } from '@/lib/central'

export const dynamic = 'force-dynamic'

/**
 * Flota de programas Sell-Plus instalados (equipos que reportan a la Central).
 *
 * GET  /api/equipos   (header X-Central-Key)
 *   -> { equipos: [...], ultimaVersion, resumen: { total, alDia, desactualizados, conOrden } }
 *      Cada equipo incluye necesitaActualizacion y estadoOrden ya calculados.
 *
 * POST /api/equipos   (header X-Central-Key)  { accion: 'mandar_a_todos' }
 *   -> Manda la orden de actualización a todos los equipos desactualizados.
 */
export async function GET(req: NextRequest) {
  if (!esAdminValido(req)) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  }

  const [equipos, versiones] = await Promise.all([
    db.clientMachine.findMany({ orderBy: { lastSeenAt: 'desc' } }),
    db.version.findMany({ where: { activo: true } }),
  ])

  let ultima: { version: string } | null = null
  for (const v of versiones) {
    if (!ultima || compareVersions(v.version, ultima.version) > 0) ultima = v
  }

  const lista = equipos.map((e) => {
    const necesita = !!ultima && compareVersions(ultima.version, e.version || '0.0.0') > 0
    const estadoOrden = e.ordenActualizar
      ? e.ordenEntregadaEn
        ? 'entregada'
        : 'enviada'
      : 'sin_orden'
    return { ...e, ultimaVersion: ultima?.version ?? null, necesitaActualizacion: necesita, estadoOrden }
  })

  const desactualizados = lista.filter((e) => e.necesitaActualizacion)
  const resumen = {
    total: lista.length,
    alDia: lista.length - desactualizados.length,
    desactualizados: desactualizados.length,
    conOrden: lista.filter((e) => e.ordenActualizar).length,
  }

  return NextResponse.json(
    { equipos: lista, ultimaVersion: ultima?.version ?? null, resumen },
    { headers: CORS_HEADERS }
  )
}

export async function POST(req: NextRequest) {
  if (!esAdminValido(req)) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  }

  const body = await req.json().catch(() => null)
  if (body?.accion !== 'mandar_a_todos') {
    return NextResponse.json(
      { error: 'accion_invalida', mensaje: "Acción válida: 'mandar_a_todos'." },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const [equipos, versiones] = await Promise.all([
    db.clientMachine.findMany(),
    db.version.findMany({ where: { activo: true } }),
  ])
  let ultima: { version: string } | null = null
  for (const v of versiones) {
    if (!ultima || compareVersions(v.version, ultima.version) > 0) ultima = v
  }
  if (!ultima) {
    return NextResponse.json(
      { error: 'sin_versiones', mensaje: 'No hay ninguna versión publicada todavía.' },
      { status: 409, headers: CORS_HEADERS }
    )
  }

  const destino = ultima.version
  const pendientes = equipos.filter(
    (e) => compareVersions(destino, e.version || '0.0.0') > 0 && !e.ordenActualizar
  )

  const ahora = new Date()
  for (const e of pendientes) {
    await db.clientMachine.update({
      where: { id: e.id },
      data: {
        ordenActualizar: true,
        ordenVersion: destino,
        ordenEnviadaEn: ahora,
        ordenEntregadaEn: null,
      },
    })
  }

  if (pendientes.length > 0) {
    await logActividad(
      'flota',
      `📢 Orden de actualización a v${destino} mandada a ${pendientes.length} equipo(s): ` +
        pendientes.map((e) => e.machineName || e.machineId).join(', ')
    )
  }

  return NextResponse.json(
    {
      ok: true,
      mandados: pendientes.length,
      versionDestino: destino,
      nombres: pendientes.map((e) => e.machineName || e.machineId),
    },
    { headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
