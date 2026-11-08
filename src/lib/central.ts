import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Version } from '@prisma/client'

// URL pública de fábrica (coincide con central-url.txt del software instalado)
export const PUBLIC_BASE =
  'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Central-Key',
  'Cache-Control': 'no-store',
}

export function corsJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS })
}

export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** Calcula el origen público real de la petición (nunca localhost). */
export function publicOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get('x-forwarded-host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (fwdHost && !fwdHost.includes('localhost') && !fwdHost.includes('127.0.0.1')) {
    return `${proto}://${fwdHost.split(',')[0].trim()}`
  }
  const host = req.headers.get('host') || ''
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`
  }
  return PUBLIC_BASE
}

/** "3.2.0" -> [3,2,0] */
export function parseVersion(v: string): number[] {
  const clean = (v || '').trim().replace(/^v/i, '')
  const parts = clean.split(/[.\-]/).map((p) => parseInt(p, 10))
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

/** >0 si a>b, <0 si a<b, 0 si iguales */
export function cmpVersion(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

/** Versión más alta entre las activas */
export function pickLatest(versiones: Version[]): Version | null {
  let latest: Version | null = null
  for (const v of versiones) {
    if (!latest || cmpVersion(v.version, latest.version) > 0) latest = v
  }
  return latest
}

/** Registra actividad evitando spam (mismo detalle < 10 min se ignora) */
export async function logActividad(tipo: string, detalle: string) {
  try {
    const hace10min = new Date(Date.now() - 10 * 60 * 1000)
    const dup = await db.actividad.findFirst({
      where: { tipo, detalle, fecha: { gte: hace10min } },
    })
    if (dup) return
    await db.actividad.create({ data: { tipo, detalle } })
    // Poda: conserva las últimas 300 filas
    const total = await db.actividad.count()
    if (total > 300) {
      const viejas = await db.actividad.findMany({
        orderBy: { fecha: 'desc' },
        skip: 300,
        take: total - 300,
        select: { id: true },
      })
      if (viejas.length) {
        await db.actividad.deleteMany({ where: { id: { in: viejas.map((v) => v.id) } } })
      }
    }
  } catch {
    // la bitácora nunca debe romper el endpoint principal
  }
}

/**
 * Manejador compartido del chequeo de actualizaciones.
 * Contrato del auto-actualizador instalado:
 *   GET /api/updates/check?version=X.Y.Z
 *   -> { hasUpdate, version, url, sha256, ... } (superset con alias ES/EN)
 */
export async function handleCheck(req: NextRequest) {
  let versionCliente = req.nextUrl.searchParams.get('version') || ''
  if (!versionCliente && (req.method === 'POST')) {
    try {
      const body = await req.json()
      versionCliente = body?.version || ''
    } catch {
      /* sin body */
    }
  }
  versionCliente = (versionCliente || '0.0.0').trim().replace(/^v/i, '')

  const versiones = await db.version.findMany({ where: { activo: true } })
  const latest = pickLatest(versiones)
  const hasUpdate = latest ? cmpVersion(latest.version, versionCliente) > 0 : false

  const origin = publicOrigin(req)
  const downloadUrl = latest
    ? `${origin}/api/updates/download/${latest.version}`
    : null

  await logActividad(
    'check_actualizacion',
    `Software ${versionCliente} consultó actualizaciones — ${
      hasUpdate ? `hay novedad: ${latest?.version}` : 'está al día'
    }`
  )

  const notas = latest?.notas || ''
  const payload = {
    // Estado
    hasUpdate,
    hayActualizacion: hasUpdate,
    actualizar: hasUpdate,
    // Versiones
    version: latest?.version ?? versionCliente,
    ultimaVersion: latest?.version ?? versionCliente,
    versionActual: versionCliente,
    versionInstalada: versionCliente,
    titulo: latest?.titulo ?? '',
    // Descarga (solo relevante si hasUpdate)
    url: hasUpdate ? downloadUrl : null,
    downloadUrl: hasUpdate ? downloadUrl : null,
    descargaUrl: hasUpdate ? downloadUrl : null,
    ruta: hasUpdate ? `/api/updates/download/${latest?.version}` : null,
    sha256: hasUpdate ? latest?.sha256 ?? null : null,
    fileSize: hasUpdate ? latest?.fileSize ?? null : null,
    fileName: hasUpdate ? latest?.fileName ?? null : null,
    // Notas
    notas,
    notasVersion: notas,
    changelog: notas,
    // Metadatos
    servidor: 'Sell-Plus Central',
    fecha: new Date().toISOString(),
  }

  return corsJson(payload)
}

/**
 * Llave de administración de la Central.
 * En producción (Vercel) se define con la variable de entorno CENTRAL_ADMIN_KEY.
 * Si no está definida (p. ej. la Central local de respaldo), se usa la llave histórica.
 */
export function expectedAdminKey(): string {
  return process.env.CENTRAL_ADMIN_KEY || 'sellplus-admin-2026'
}

/** Verifica la cabecera X-Central-Key de una petición. */
export function esAdminValido(req: {
  headers: { get(name: string): string | null }
}): boolean {
  return req.headers.get('x-central-key') === expectedAdminKey()
}

/** Respuesta estándar para peticiones sin llave válida. */
export function respuestaNoAutorizado() {
  return NextResponse.json(
    { error: 'no_autorizado', mensaje: 'Sección solo para el administrador.' },
    { status: 401, headers: CORS_HEADERS }
  )
}
