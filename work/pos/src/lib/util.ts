/** Utilidades compartidas del POS */

export function dinero(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function numero(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return v.toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export function fechaCorta(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fechaHora(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Días restantes para caducar (negativo = vencido) */
export function diasParaCaducar(caducidad: string | Date | null | undefined): number | null {
  if (!caducidad) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const c = new Date(caducidad)
  c.setHours(0, 0, 0, 0)
  return Math.round((c.getTime() - hoy.getTime()) / 86400000)
}

export type EstadoCaducidad = 'vencido' | 'urgente' | 'pronto' | 'ok' | 'sin'

export function estadoCaducidad(caducidad: string | Date | null | undefined): EstadoCaducidad {
  const dias = diasParaCaducar(caducidad)
  if (dias === null) return 'sin'
  if (dias < 0) return 'vencido'
  if (dias <= 7) return 'urgente'
  if (dias <= 30) return 'pronto'
  return 'ok'
}
