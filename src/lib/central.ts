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

/** Calcula el origen público real de la petición (nunca localhost ni dominios internos). */
export function publicOrigin(req: NextRequest): string {
  // 1) Origen fijado por variable de entorno (producción con dominio propio).
  const fijada = (process.env.NEXT_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
  if (fijada) return fijada

  const candidatos = [
    req.headers.get('x-forwarded-host')?.split(',')[0].trim(),
    req.headers.get('host'),
  ].filter(Boolean) as string[]

  for (const host of candidatos) {
    // 2) Dominio de fábrica del entorno de desarrollo (sandbox).
    if (host.includes('space-z.ai')) {
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${host}`
    }
  }

  // 3) Producción estándar (ej. Vercel): cualquier dominio público sirve.
  //    Se descartan localhost, IPs y hosts internos sin punto.
  const host = candidatos[0]
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (
    host &&
    host.includes('.') &&
    !/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  ) {
    return `${proto}://${host}`
  }

  // 4) Fallback: la URL pública de fábrica (estable para este chat)
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
  // Si la versión tiene externalUrl (ej. GitHub Releases), el auto-actualizador
  // descarga directo de ahí; si no, la Central sirve el archivo localmente.
  const rutaInterna = latest ? `/api/updates/download/${latest.version}` : null
  const downloadUrl = latest
    ? latest.externalUrl || `${origin}${rutaInterna}`
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
    ruta: hasUpdate ? rutaInterna : null,
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
