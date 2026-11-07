import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActividad, CORS_HEADERS, cmpVersion, pickLatest } from '@/lib/central'

export const dynamic = 'force-dynamic'

/**
 * Registra (o reemplaza) una versión publicada.
 * Uso interno (desarrollador) — requiere cabecera X-Central-Key.
 * Body: { version, titulo, notas, fileName?, fileSize?, sha256?, externalUrl?, canal? }
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-central-key')
  if (key !== 'sellplus-admin-2026') {
    return NextResponse.json(
      { error: 'no_autorizado' },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body?.version || typeof body.version !== 'string') {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'Falta "version".' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const version = (body.version as string).trim().replace(/^v/i, '')
  const previas = await db.version.findMany()
  const previa = pickLatest(previas)
  if (previa && cmpVersion(version, previa.version) <= 0 && body.forzar !== true) {
    return NextResponse.json(
      {
        error: 'version_no_superior',
        mensaje: `La versión ${version} no supera a la última publicada (${previa.version}).`,
      },
      { status: 409, headers: CORS_HEADERS }
    )
  }

  const fila = await db.version.upsert({
    where: { version },
    update: {
      titulo: body.titulo ?? '',
      notas: body.notas ?? '',
      fileName: body.fileName ?? null,
      fileSize: body.fileSize ?? null,
      sha256: body.sha256 ?? null,
      externalUrl: body.externalUrl ?? null,
      canal: body.canal ?? 'estable',
      activo: true,
    },
    create: {
      version,
      titulo: body.titulo ?? '',
      notas: body.notas ?? '',
      fileName: body.fileName ?? null,
      fileSize: body.fileSize ?? null,
      sha256: body.sha256 ?? null,
      externalUrl: body.externalUrl ?? null,
      canal: body.canal ?? 'estable',
      activo: true,
    },
  })

  await logActividad('sistema', `Versión ${version} registrada en la Central`)

  return NextResponse.json({ ok: true, version: fila }, { headers: CORS_HEADERS })
}
