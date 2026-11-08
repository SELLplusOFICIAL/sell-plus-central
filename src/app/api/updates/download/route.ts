import { NextRequest } from 'next/server'
import { handleDownload } from '@/lib/download-version'
import { corsOptions, pickLatest } from '@/lib/central'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Descarga el instalador de la versión publicada (o ?version=X.Y.Z).
// Migrado al modelo real `Version` y delegado al mismo manejador de la
// ruta /api/updates/download/[version] (redirige a GitHub si hay externalUrl).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let version = (sp.get('version') || sp.get('v') || '').trim()

  if (!version) {
    const versiones = await db.version.findMany({ where: { activo: true } })
    const latest = pickLatest(versiones)
    if (!latest) {
      return new Response(JSON.stringify({ error: 'sin_versiones' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }
    version = latest.version
  }

  return handleDownload(req, version)
}

export async function OPTIONS() {
  return corsOptions()
}
