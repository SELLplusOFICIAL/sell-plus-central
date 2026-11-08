export type VersionItem = {
  id: number
  version: string
  titulo: string
  notas: string
  fileName: string | null
  fileSize: number | null
  sha256: string | null
  canal: string
  activo: boolean
  fecha: string
}

export type ActividadItem = {
  id: number
  tipo: string
  detalle: string
  fecha: string
}

export type ResumenData = {
  ultimaVersion: {
    version: string
    titulo: string
    notas: string
    fecha: string
    fileName: string | null
    fileSize: number | null
    sha256: string | null
  } | null
  totalVersiones: number
  tutorialesCount: number
  solicitudesAbiertas: number
  actividad: ActividadItem[]
  ultimaConexion: ActividadItem | null
}

export type SolicitudItem = {
  id: number
  titulo: string
  descripcion: string
  prioridad: string
  estado: string
  respuesta: string | null
  fecha: string
  progreso?: number | null
  fase?: string | null
  tiempoEstimado?: string | null
  actualizadoEn?: string | null
}

export type TutorialItem = {
  id: number
  titulo: string
  descripcion: string
  tipo: string
  contenido: string | null
  url: string | null
  minutos: number | null
  orden: number
  fecha: string
}

export const CENTRAL_URL =
  'https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai'

/**
 * Dirección de la Central tal como la ve el navegador.
 * En el sitio publicado usa el origen actual (la dirección real del navegador);
 * como respaldo (p. ej. render en servidor) devuelve la dirección histórica local.
 */
export function centralUrlActual(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return CENTRAL_URL
}

/** "hace 2 min", "hace 3 h", "hace 5 días" o fecha corta */
export function haceCuando(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'justo ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const dias = Math.floor(h / 24)
  if (dias < 30) return `hace ${dias} día${dias === 1 ? '' : 's'}`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function mb(bytes: number | null): string {
  if (!bytes) return '—'
  return `${(bytes / 1048576).toFixed(1)} MB`
}
