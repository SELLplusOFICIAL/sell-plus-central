import { NextRequest } from 'next/server'

// URL pública de fábrica de la Central (fallback cuando el host de la petición es interno)
export const URL_FABRICA = 'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'

// Devuelve el origen PÚBLICO de la petición.
// El gateway a veces expone un host interno (p. ej. *.fcapp.run) que nunca
// debe entregarse a los clientes; en ese caso se usa la URL de fábrica.
export function origenPublico(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  if (host) {
    const publico =
      host.includes('.') &&
      !host.includes('fcapp.run') &&
      !host.includes('internal') &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(host)
    if (publico) {
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
      return `${proto}://${host}`
    }
  }
  return URL_FABRICA
}
