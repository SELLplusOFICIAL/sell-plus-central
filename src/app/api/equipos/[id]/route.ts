import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { compareVersions } from '@/lib/sellplus-ai'
import { CORS_HEADERS, esAdminValido, logActividad } from '@/lib/central'

export const dynamic = 'force-dynamic'

/**
 * Acciones del administrador sobre un equipo de la flota.
 *
 * PATCH /api/equipos/[id]   (header X-Central-Key)
 *   { accion: 'mandar_actualizacion' }  -> le ordena instalar la última versión
 *   { accion: 'cancelar_orden' }        -> retira la orden pendiente
 *   { accion: 'renombrar', machineName?, ubicacion? } -> corrige nombre/ubicación
 *   { accion: 'eliminar' }              -> quita el equipo de la flota
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!esAdminValido(req)) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  }

  const { id } = await params
  const equipoId = parseInt(id, 10)
  if (Number.isNaN(equipoId)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
  }

  const body = await req.json().catch(() => null)
  const accion = body?.accion
  const equipo = await db.clientMachine.findUnique({ where: { id: equipoId } })
  if (!equipo) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: CORS_HEADERS })
  }
  const nombre = equipo.machineName || equipo.machineId

  // ---------- Mandar actualización ----------
  if (accion === 'mandar_actualizacion') {
    const versiones = await db.version.findMany({ where: { activo: true } })
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
    if (compareVersions(ultima.version, equipo.version || '0.0.0') <= 0) {
      return NextResponse.json(
        {
          error: 'al_dia',
          mensaje: `${nombre} ya tiene la última versión (v${equipo.version}).`,
        },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    const actualizado = await db.clientMachine.update({
      where: { id: equipoId },
      data: {
        ordenActualizar: true,
        ordenVersion: ultima.version,
        ordenEnviadaEn: new Date(),
        ordenEntregadaEn: null,
      },
    })
    await logActividad(
      'flota',
      `📢 Orden de actualización mandada a «${nombre}»: v${equipo.version || '?'} → v${ultima.version}`
    )
    return NextResponse.json({ ok: true, equipo: actualizado }, { headers: CORS_HEADERS })
  }

  // ---------- Cancelar orden ----------
  if (accion === 'cancelar_orden') {
    const actualizado = await db.clientMachine.update({
      where: { id: equipoId },
      data: {
        ordenActualizar: false,
        ordenVersion: null,
        ordenEnviadaEn: null,
        ordenEntregadaEn: null,
      },
    })
    await logActividad('flota', `↩️ Orden de actualización cancelada para «${nombre}»`)
    return NextResponse.json({ ok: true, equipo: actualizado }, { headers: CORS_HEADERS })
  }

  // ---------- Renombrar / ubicación ----------
  if (accion === 'renombrar') {
    const nombreNuevo = typeof body.machineName === 'string' ? body.machineName.trim() : null
    const ubicacionNueva = typeof body.ubicacion === 'string' ? body.ubicacion.trim() : null
    const actualizado = await db.clientMachine.update({
      where: { id: equipoId },
      data: {
        ...(nombreNuevo !== null ? { machineName: nombreNuevo || null } : {}),
        ...(ubicacionNueva !== null ? { ubicacion: ubicacionNueva || null } : {}),
      },
    })
    await logActividad(
      'flota',
      `✏️ Equipo actualizado: «${actualizado.machineName || actualizado.machineId}»` +
        (actualizado.ubicacion ? ` — ubicación: ${actualizado.ubicacion}` : '')
    )
    return NextResponse.json({ ok: true, equipo: actualizado }, { headers: CORS_HEADERS })
  }

  // ---------- Eliminar de la flota ----------
  if (accion === 'eliminar') {
    await db.clientMachine.delete({ where: { id: equipoId } })
    await logActividad('flota', `🗑️ Equipo «${nombre}» eliminado de la flota`)
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }

  return NextResponse.json(
    { error: 'accion_invalida', mensaje: 'Acciones: mandar_actualizacion, cancelar_orden, renombrar, eliminar.' },
    { status: 400, headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
