import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { corsJson, corsOptions, pickLatest } from '@/lib/central'
import { resumenDe } from '@/lib/resumenes'

export const dynamic = 'force-dynamic'

/**
 * Registro de versiones en formato RESUMIDO (entrega «Cifra Fresca»):
 *  - Sin las notas completas: el payload baja de ~200 KB a unos KB y la
 *    página queda fluida. Cada versión trae su `resumen` de una línea.
 *  - Las notas completas se piden a demanda:  GET /api/versiones?notas=6.6.2,6.6.1
 *    -> { notas: { "6.6.2": "…", "6.6.1": "…" } }
 * El software instalado NO usa este endpoint (usa /api/updates/check), así
 * que el contrato del auto-actualizador queda intacto.
 */
export async function GET(req: NextRequest) {
  const pedidas = (req.nextUrl.searchParams.get('notas') || '')
    .split(',')
    .map((v) => v.trim().replace(/^v/i, ''))
    .filter(Boolean)
    .slice(0, 4)

  if (pedidas.length) {
    const filas = await db.version.findMany({
      where: { version: { in: pedidas } },
      select: { version: true, notas: true },
    })
    const notas: Record<string, string> = {}
    for (const f of filas) notas[f.version] = f.notas
    return corsJson({ notas })
  }

  const versiones = await db.version.findMany({
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      version: true,
      titulo: true,
      fileName: true,
      fileSize: true,
      sha256: true,
      canal: true,
      activo: true,
      fecha: true,
      notas: true, // solo para calcular el resumen; NO sale en la respuesta
    },
  })
  const latest = pickLatest(versiones)

  return corsJson({
    versiones: versiones.map(({ notas, ...v }) => ({
      ...v,
      resumen: resumenDe(v.version, notas),
    })),
    ultimaVersion: latest?.version ?? null,
  })
}

export async function OPTIONS() {
  return corsOptions()
}
