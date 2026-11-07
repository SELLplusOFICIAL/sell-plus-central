import { NextRequest } from 'next/server'
import { origenPublico } from '@/lib/url-central'

export const dynamic = 'force-dynamic'

// Genera el acceso directo para el escritorio de Windows (.url)
// Apunta siempre al origen PÚBLICO desde el que se descarga (la Central actual)
export async function GET(req: NextRequest) {
  const url = origenPublico(req)
  const contenido = `\r\n[InternetShortcut]\r\nURL=${url}\r\nIconIndex=0\r\nProp3=19,11\r\n`
  return new Response(contenido, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="Central-Sell-Plus.url"',
      'Cache-Control': 'no-store',
    },
  })
}
