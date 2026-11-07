import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { UPDATES_DIR } from '@/lib/rutas'

export const dynamic = 'force-dynamic'

// GET: lista de versiones (con estado del archivo en el servidor)
export async function GET() {
  try {
    const versiones = await db.updateVersion.findMany({ orderBy: { createdAt: 'desc' } })
    const conArchivo = versiones.map((v) => {
      let archivoOk = false
      let sizeReal = v.fileSize
      let shaReal = v.sha256
      if (v.fileName) {
        const p = path.join(UPDATES_DIR, path.basename(v.fileName))
        if (fs.existsSync(p)) {
          const st = fs.statSync(p)
          archivoOk = st.size > 0
          sizeReal = st.size
          if (archivoOk && !shaReal) {
            shaReal = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
            // persistir el hash calculado
            db.updateVersion.update({ where: { id: v.id }, data: { sha256: shaReal } }).catch(() => {})
          }
        }
      }
      return { ...v, archivoOk, sizeReal, sha256: shaReal }
    })
    return Response.json({ ok: true, versiones: conArchivo })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// POST: crear o actualizar una versión (publicar / editar notas)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const version = String(body.version || '').trim()
    if (!version) return Response.json({ ok: false, error: 'Falta version' }, { status: 400 })

    let fileName = body.fileName ? path.basename(String(body.fileName)) : ''
    let fileSize = Number(body.fileSize) || 0
    let sha256 = String(body.sha256 || '')

    // Si no indican archivo, buscar uno que empiece por el número de versión
    if (!fileName) {
      const dir = UPDATES_DIR
      if (fs.existsSync(dir)) {
        const candidatos = fs.readdirSync(dir).filter((f) => f.includes(version) && f.toLowerCase().endsWith('.exe'))
        if (candidatos.length) fileName = candidatos[0]
      }
    }
    if (fileName) {
      const p = path.join(UPDATES_DIR, fileName)
      if (fs.existsSync(p)) {
        fileSize = fs.statSync(p).size
        if (!sha256) sha256 = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
      } else {
        fileName = ''
      }
    }

    const datos = {
      version,
      nombre: String(body.nombre || `Sell-Plus ${version}`),
      notas: String(body.notas || ''),
      obligatoria: !!body.obligatoria,
      publicado: body.publicado === undefined ? true : !!body.publicado,
      fileName,
      fileSize,
      sha256,
    }

    const v = await db.updateVersion.upsert({
      where: { version },
      update: datos,
      create: datos,
    })
    return Response.json({ ok: true, version: v })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// DELETE: quitar una versión (?version=X)
export async function DELETE(req: NextRequest) {
  try {
    const version = req.nextUrl.searchParams.get('version')
    if (!version) return Response.json({ ok: false, error: 'Falta version' }, { status: 400 })
    await db.updateVersion.deleteMany({ where: { version } })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
