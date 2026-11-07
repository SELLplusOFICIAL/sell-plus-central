import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { UPDATES_DIR } from '@/lib/rutas'

export const dynamic = 'force-dynamic'

// Descarga el instalador de la versión publicada (o ?version=X.Y.Z)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    let versionPedida = sp.get('version') || sp.get('v') || null

    const where = versionPedida
      ? { version: versionPedida, publicado: true }
      : { publicado: true }
    const ver = await db.updateVersion.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    })

    if (!ver || !ver.fileName) {
      return new Response('No hay instalador disponible', { status: 404 })
    }

    const fileName = path.basename(ver.fileName)
    const filePath = path.join(UPDATES_DIR, fileName)
    if (!fs.existsSync(filePath)) {
      return new Response('Archivo no encontrado', { status: 404 })
    }

    const stat = fs.statSync(filePath)
    await db.downloadLog.create({
      data: {
        tipo: 'update',
        ref: ver.version,
        ua: (req.headers.get('user-agent') || '').slice(0, 300),
        ip: (req.headers.get('x-forwarded-for') || '').slice(0, 60),
      },
    })

    const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return new Response('Error: ' + String(e), { status: 500 })
  }
}
