'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, MessageSquarePlus, Sparkles, Clock, RefreshCcw, Snowflake } from 'lucide-react'
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
  recibida: { label: 'Recibida', clase: 'bg-stone-200 text-stone-700 hover:bg-stone-200' },
  en_proceso: { label: 'En proceso', clase: 'bg-amber-200 text-amber-900 hover:bg-amber-200' },
  lista: { label: 'Lista', clase: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-200' },
  publicada: { label: 'Publicada', clase: 'bg-emerald-800 text-white hover:bg-emerald-800' },
}

const PRIORIDAD_ESTILO: Record<string, string> = {
  alta: 'bg-red-100 text-red-800 border-red-200',
  media: 'bg-amber-100 text-amber-800 border-amber-200',
  baja: 'bg-stone-100 text-stone-600 border-stone-200',
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
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <MessageSquarePlus className="h-5 w-5 text-amber-600" aria-hidden />
            Pedir una modificación o función nueva
          </CardTitle>
          <p className="text-xs text-stone-500">
            Cuéntame qué necesitas: funciona como lista de pendientes entre tú y yo. Ejemplos:
            “reporte de productos próximos a caducar”, “descuento por volumen en caja”, “cambiar el
            color del ticket”.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sol-titulo" className="text-sm text-stone-700">
                Título
              </Label>
              <Input
                id="sol-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Reporte de lotes por caducar esta semana"
                maxLength={120}
                className="border-stone-300 focus-visible:ring-emerald-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sol-desc" className="text-sm text-stone-700">
                Detalles
              </Label>
              <Textarea
                id="sol-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué quieres lograr, dónde lo necesitas (caja, inventarios, reportes…) y cualquier detalle que ayude."
                rows={4}
                maxLength={2000}
                className="border-stone-300 focus-visible:ring-emerald-700 resize-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="space-y-1.5 sm:w-48">
                <Label htmlFor="sol-prio" className="text-sm text-stone-700">
                  Prioridad
                </Label>
                <Select value={prioridad} onValueChange={setPrioridad}>
                  <SelectTrigger id="sol-prio" className="border-stone-300 focus:ring-emerald-700">
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
                className="bg-emerald-800 hover:bg-emerald-900 text-white sm:ml-auto"
              >
                <Send className="h-4 w-4 mr-1.5" aria-hidden />
                {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden />
          Tus solicitudes
        </h3>
        {solicitudes === null ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : solicitudes.length === 0 ? (
          <Card className="shadow-sm border-dashed border-stone-300">
            <CardContent className="p-6 text-center text-sm text-stone-500">
              Aún no hay solicitudes. La primera que escribas aparecerá aquí con su estado.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {solicitudes.map((s) => {
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
                  <Card className="shadow-sm border-stone-200">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm text-stone-800 flex-1 min-w-0 break-words">
                          {s.titulo}
                        </p>
                        <Badge variant="outline" className={PRIORIDAD_ESTILO[s.prioridad] ?? ''}>
                          {s.prioridad}
                        </Badge>
                        <Badge className={estado.clase}>{estado.label}</Badge>
                        {estaCongelada(s) && (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-300 gap-1 animate-pulse">
                            <Snowflake className="h-3 w-3" aria-hidden />
                            Congelada — sin avance
                          </Badge>
                        )}
                      </div>
                      {/* Progreso en vivo de la solicitud */}
                      <div className="space-y-1 rounded-lg border border-stone-100 bg-stone-50/70 p-2.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                          <span className="truncate font-semibold text-stone-600">{etiquetaFase}</span>
                          <span className="shrink-0 font-mono">{pct}%</span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct === 0 ? 0 : Math.max(pct, 4)}%` }}
                          />
                        </div>
                        {s.tiempoEstimado && (
                          <p className="flex items-center gap-1 text-[11px] text-stone-400">
                            <Clock className="h-3 w-3" aria-hidden />
                            Tiempo estimado: {s.tiempoEstimado}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-stone-600 whitespace-pre-line break-words">
                        {s.descripcion}
                      </p>
                      {s.respuesta && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                          <p className="text-[11px] font-bold text-emerald-800 mb-0.5">
                            Respuesta del desarrollador
                          </p>
                          <p className="text-sm text-emerald-900 whitespace-pre-line">{s.respuesta}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-[11px] text-stone-400">{haceCuando(s.fecha)}</p>
                        {s.estado !== 'publicada' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={reenviandoId === s.id}
                                className="h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                              >
                                <RefreshCcw className="h-3.5 w-3.5 mr-1" aria-hidden />
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
                                  className="bg-emerald-800 hover:bg-emerald-900 text-white"
                                >
                                  <RefreshCcw className="h-4 w-4 mr-1.5" aria-hidden />
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
      </div>
    </div>
  )
}
