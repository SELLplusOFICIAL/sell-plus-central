import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActividad, CORS_HEADERS, pickLatest } from '@/lib/central'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { UPDATES_DIR } from '@/lib/rutas'

export async function handleDownload(
  req: NextRequest,
  versionParam: string
): Promise<NextResponse> {
  const vDecoded = decodeURIComponent(versionParam)

  const versiones = await db.version.findMany({ where: { activo: true } })
  const latest = pickLatest(versiones)

  if (!latest || latest.version !== vDecoded) {
    return NextResponse.json(
      {
        error: 'version_no_disponible',
        mensaje: `La versión ${vDecoded} no está disponible para descarga. Última publicada: ${
          latest?.version ?? 'ninguna'
        }.`,
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  if (!latest.fileName && !latest.externalUrl) {
    return NextResponse.json(
      {
        error: 'archivo_no_almacenado',
        mensaje:
          'Esta versión se entregó mediante instalador directo (kit). No hay archivo alojado en la Central.',
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const safeName = latest.fileName
    ? path.basename(latest.fileName)
    : `Sell-Plus-${latest.version}-Instalador-Windows-64bits.exe`

  // Instalador alojado fuera de la Central (ej. GitHub Releases): redirección directa.
  if (latest.externalUrl) {
    await logActividad(
      'descarga',
      `Descarga de ${safeName} redirigida al alojamiento externo`
    )
    return NextResponse.redirect(latest.externalUrl, {
      status: 302,
      headers: CORS_HEADERS,
    })
  }

  const filePath = path.join(UPDATES_DIR, safeName)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: 'archivo_faltante', mensaje: 'El instalador no está en el almacenamiento de la Central.' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const size = fs.statSync(filePath).size
  const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream

  await logActividad(
    'descarga',
    `Descarga del instalador ${safeName} (${(size / 1048576).toFixed(1)} MB)`
  )

  return new NextResponse(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${safeName}"`,
    },
  })
}
