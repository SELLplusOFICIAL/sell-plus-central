import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CORS_HEADERS } from '@/lib/central'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { TUTORIALES_DIR } from '@/lib/rutas'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tutorialId = parseInt(id, 10)
  if (Number.isNaN(tutorialId)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
  }

  const tutorial = await db.tutorial.findUnique({ where: { id: tutorialId } })
  if (!tutorial || !tutorial.publicado) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: CORS_HEADERS })
  }

  if (tutorial.tipo === 'pdf') {
    if (!tutorial.fileName) {
      return NextResponse.json({ error: 'sin_archivo' }, { status: 404, headers: CORS_HEADERS })
    }
    const safeName = path.basename(tutorial.fileName)
    const filePath = path.join(TUTORIALES_DIR, safeName)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'archivo_faltante' }, { status: 404, headers: CORS_HEADERS })
    }
    const size = fs.statSync(filePath).size
    const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream
    const dl = req.nextUrl.searchParams.get('dl') === '1'
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(size),
        'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="${safeName}"`,
      },
    })
  }

  return NextResponse.json(
    { error: 'sin_archivo', mensaje: 'Este contenido se muestra directamente en la Central.' },
    { status: 404, headers: CORS_HEADERS }
  )
}
