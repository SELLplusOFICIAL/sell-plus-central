'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, MessageSquarePlus, Sparkles, Clock, RefreshCcw, Snowflake, History, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SolicitudItem, haceCuando } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const ESTADO_ESTILO: Record<string, { label: string; clase: string }> = {
  recibida: { label: 'Recibida', clase: 'border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]' },
  en_proceso: { label: 'En proceso', clase: 'border border-amber-400/25 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15' },
  lista: { label: 'Lista', clase: 'border border-cyan-300/25 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20' },
  publicada: { label: 'Publicada', clase: 'border border-emerald-300/25 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25' },
}

const PRIORIDAD_ESTILO: Record<string, string> = {
  alta: 'border border-red-400/25 bg-red-400/10 text-red-300',
  media: 'border border-amber-400/25 bg-amber-400/10 text-amber-300',
  baja: 'border border-white/10 bg-white/[0.06] text-slate-300',
}

/** Minutos sin avance para considerar congelada una solicitud en trabajo */
const CONGELADA_MS = 90 * 60 * 1000

export default function SolicitudesTab({ recargarResumen }: { recargarResumen: () => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudItem[] | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState('media')
  const [enviando, setEnviando] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [abiertasHistorial, setAbiertasHistorial] = useState<Set<number>>(new Set())

  // Refresca el reloj cada minuto para reevaluar las solicitudes congeladas
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const llaveAdmin = (): Record<string, string> => {
    try {
      const k = window.localStorage.getItem('central-admin-key')
      return k ? { 'x-central-key': k } : {}
    } catch {
      return {}
    }
  }

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/solicitudes', { cache: 'no-store', headers: llaveAdmin() })
      if (res.ok) {
        const data = await res.json()
        setSolicitudes(data.solicitudes)
      } else if (res.status === 401) {
        setSolicitudes([])
        toast.error('Esta sección es solo para el administrador. Ingresa tu llave con el botón Admin.')
      }
    } catch {
      toast.error('No se pudieron cargar las solicitudes')
    }
  }, [])

  useEffect(() => {
    const primera = setTimeout(cargar, 0)
    return () => clearTimeout(primera)
  }, [cargar])

  /** ¿Lleva demasiado tiempo sin avance? (solo en trabajo activo) */
  const estaCongelada = (s: SolicitudItem) => {
    if (s.estado !== 'en_proceso' && s.estado !== 'lista') return false
    if (!s.actualizadoEn) return false
    return ahora - new Date(s.actualizadoEn).getTime() > CONGELADA_MS
  }

  /** Historial: resueltas y publicadas. Replegado por defecto, ocupa el mínimo. */
  const activas = (solicitudes ?? []).filter((s) => s.estado !== 'publicada')
  const historial = (solicitudes ?? []).filter((s) => s.estado === 'publicada')

  const alternarHistorial = (id: number) => {
    setAbiertasHistorial((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Vuelve a poner la solicitud en la fila para que el ciclo automático la retome */
  const reenviar = async (s: SolicitudItem) => {
    setReenviandoId(s.id)
    try {
      const res = await fetch(`/api/solicitudes/${s.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llaveAdmin() },
        body: JSON.stringify({ accion: 'reenviar' }),
      })
      if (res.ok) {
        toast.success(`Solicitud #${s.id} reenviada`, {
          description: 'Volvió a la fila de trabajo: el ciclo automático la pone en marcha en cuanto la detecte.',
        })
        await cargar()
        recargarResumen()
      } else if (res.status === 401) {
        toast.error('Llave de administrador incorrecta. Ingresa la correcta con el botón Admin.')
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.mensaje || 'No se pudo reenviar la solicitud. Intenta de nuevo.')
      }
    } catch {
      toast.error('No hay conexión con la Central. Intenta de nuevo.')
    } finally {
      setReenviandoId(null)
    }
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (titulo.trim().length < 3 || descripcion.trim().length < 5) {
      toast.error('Escribe un título y una descripción un poco más completa')
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llaveAdmin() },
        body: JSON.stringify({ titulo, descripcion, prioridad }),
      })
      if (res.ok) {
        toast.success('¡Solicitud recibida! La revisaré en cuanto la vea en la Central.', {
          description: 'También puedes contármela directamente en el chat.',
        })
        setTitulo('')
        setDescripcion('')
        setPrioridad('media')
        await cargar()
        recargarResumen()
      } else if (res.status === 401) {
        toast.error('Llave de administrador incorrecta. Ingresa la correcta con el botón Admin.')
      } else {
        toast.error('No se pudo enviar. Intenta de nuevo o escríbeme en el chat.')
      }
    } catch {
      toast.error('No se pudo enviar. ¿Hay conexión con la Central?')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Solicitudes</h2>
        <p className="text-xs text-slate-400">
          Lista de pendientes entre tú y yo: pide cambios y sigue su avance en vivo.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
            <MessageSquarePlus className="h-4 w-4 text-amber-300" aria-hidden />
            Pedir una modificación o función nueva
          </CardTitle>
          <p className="text-xs text-slate-400">
            Ejemplos: “reporte de productos próximos a caducar”, “descuento por volumen en caja”,
            “cambiar el color del ticket”.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sol-titulo" className="text-xs font-medium text-slate-300">
                Título
              </Label>
              <Input
                id="sol-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Reporte de lotes por caducar esta semana"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sol-desc" className="text-xs font-medium text-slate-300">
                Detalles
              </Label>
              <Textarea
                id="sol-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué quieres lograr, dónde lo necesitas (caja, inventarios, reportes…) y cualquier detalle que ayude."
                rows={4}
                maxLength={2000}
                className="resize-none"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5 sm:w-48">
                <Label htmlFor="sol-prio" className="text-xs font-medium text-slate-300">
                  Prioridad
                </Label>
                <Select value={prioridad} onValueChange={setPrioridad}>
                  <SelectTrigger id="sol-prio">
                    <SelectValue placeholder="Elige" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta — me urge</SelectItem>
                    <SelectItem value="media">Media — cuando se pueda</SelectItem>
                    <SelectItem value="baja">Baja — solo idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={enviando}
                className="sp-btn-grad border-0 shadow-none sm:ml-auto"
              >
                <Send className="h-4 w-4" aria-hidden />
                {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
          <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden />
          Solicitudes en curso
        </h3>
        {solicitudes === null ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : activas.length === 0 && historial.length === 0 ? (
          <Card className="border-dashed border-white/15 shadow-none">
            <CardContent className="p-6 text-center text-sm text-slate-400">
              Aún no hay solicitudes. La primera que escribas aparecerá aquí con su estado.
            </CardContent>
          </Card>
        ) : (
          <>
          {activas.length > 0 && (
          <ul className="space-y-3">
            {activas.map((s) => {
              const estado = ESTADO_ESTILO[s.estado] ?? ESTADO_ESTILO.recibida
              const pct =
                typeof s.progreso === 'number' && s.progreso !== null
                  ? Math.max(0, Math.min(100, s.progreso))
                  : s.estado === 'publicada'
                    ? 100
                    : 0
              const etiquetaFase =
                s.fase ||
                (s.estado === 'publicada'
                  ? 'Completada y publicada'
                  : s.estado === 'lista'
                    ? 'Lista — espera el próximo release'
                    : s.estado === 'en_proceso'
                      ? 'En desarrollo'
                      : 'En fila — esperando revisión')
              return (
                <li key={s.id}>
                  <Card>
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold break-words text-slate-100">
                          {s.titulo}
                        </p>
                        <Badge variant="outline" className={PRIORIDAD_ESTILO[s.prioridad] ?? ''}>
                          {s.prioridad}
                        </Badge>
                        <Badge className={estado.clase}>{estado.label}</Badge>
                        {estaCongelada(s) && (
                          <Badge className="animate-pulse gap-1 border border-orange-300/30 bg-orange-400/10 text-orange-300">
                            <Snowflake className="h-3 w-3" aria-hidden />
                            Congelada
                          </Badge>
                        )}
                      </div>
                      {/* Progreso en vivo de la solicitud */}
                      <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate font-semibold text-slate-300">{etiquetaFase}</span>
                          <span className="shrink-0 font-mono text-slate-400">{pct}%</span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100
                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                : 'bg-gradient-to-r from-amber-400 to-orange-500'
                            }`}
                            style={{ width: `${pct === 0 ? 0 : Math.max(pct, 4)}%` }}
                          />
                        </div>
                        {s.tiempoEstimado && (
                          <p className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3" aria-hidden />
                            Tiempo estimado: {s.tiempoEstimado}
                          </p>
                        )}
                      </div>
                      <p className="text-sm break-words whitespace-pre-line text-slate-300">
                        {s.descripcion}
                      </p>
                      {s.respuesta && (
                        <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.07] p-3">
                          <p className="mb-0.5 text-[11px] font-bold text-cyan-200">
                            Respuesta del desarrollador
                          </p>
                          <p className="text-sm whitespace-pre-line text-cyan-100/90">{s.respuesta}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-[11px] text-slate-500">{haceCuando(s.fecha)}</p>
                        {s.estado !== 'publicada' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={reenviandoId === s.id}
                                className="h-8 border-white/12 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:text-white"
                              >
                                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                                {reenviandoId === s.id ? 'Reenviando…' : 'Reenviar'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Reenviar la solicitud #{s.id}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Vuelve al estado «Recibida», se limpia su avance y el ciclo de
                                  trabajo automático la retoma en cuanto la detecte. Úsala cuando veas
                                  una tarea atorada o congelada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => reenviar(s)}
                                  className="sp-btn-grad border-0 shadow-none"
                                >
                                  <RefreshCcw className="h-4 w-4" aria-hidden />
                                  Sí, poner en marcha
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
          )}

          {historial.length > 0 && (
            <Collapsible className="mt-4">
            <Card>
              <CollapsibleTrigger className="w-full text-left">
                <CardHeader className="px-5 py-3.5 sm:px-5">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm text-slate-200">
                    <span className="flex min-w-0 items-center gap-2">
                      <History className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <span className="truncate">
                        Historial de solicitudes ({historial.length})
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pb-4 pt-0 sm:px-5">
                  <p className="mb-1 px-2 text-[11px] text-slate-500">
                    Toca una línea para ver su detalle y la respuesta del desarrollador.
                  </p>
                  <ul className="divide-y divide-white/[0.06]">
                    {historial.map((s) => {
                      const abierta = abiertasHistorial.has(s.id)
                      return (
                        <li key={s.id} className="py-1">
                          <button
                            type="button"
                            onClick={() => alternarHistorial(s.id)}
                            className="-mx-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                            aria-expanded={abierta}
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${abierta ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                            <span className="shrink-0 font-mono text-[11px] text-slate-500">#{s.id}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{s.titulo}</span>
                            <span className="hidden shrink-0 text-[10px] text-slate-500 sm:inline">
                              {haceCuando(s.fecha)}
                            </span>
                            <Badge className="shrink-0 border border-emerald-300/25 bg-emerald-400/15 text-[10px] text-emerald-200 hover:bg-emerald-400/25">
                              Publicada
                            </Badge>
                          </button>
                          {abierta && (
                            <div className="space-y-2 pb-3 pl-9 pr-2">
                              <p className="text-xs break-words whitespace-pre-line text-slate-400">
                                {s.descripcion}
                              </p>
                              {s.respuesta && (
                                <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.07] p-2.5">
                                  <p className="mb-0.5 text-[11px] font-bold text-cyan-200">
                                    Respuesta del desarrollador
                                  </p>
                                  <p className="text-xs whitespace-pre-line text-cyan-100/90">{s.respuesta}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </CollapsibleContent>
            </Card>
            </Collapsible>
          )}
          </>
        )}
      </div>
    </div>
  )
}
