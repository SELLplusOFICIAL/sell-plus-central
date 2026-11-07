'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, MessageSquarePlus, Sparkles, Clock, Hammer, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SolicitudItem, haceCuando } from '@/lib/types'
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

export default function SolicitudesTab({ recargarResumen }: { recargarResumen: () => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudItem[] | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState('media')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/solicitudes', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSolicitudes(data.solicitudes)
      }
    } catch {
      toast.error('No se pudieron cargar las solicitudes')
    }
  }, [])

  useEffect(() => {
    const primera = setTimeout(cargar, 0)
    // Auto-refresco: el indicador de trabajo en vivo se actualiza solo cada 30 s
    const intervalo = setInterval(cargar, 30000)
    return () => {
      clearTimeout(primera)
      clearInterval(intervalo)
    }
  }, [cargar])

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
        headers: { 'Content-Type': 'application/json' },
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
                      </div>
                      {/* Indicador de trabajo en vivo (con tiempo estimado y fase) */}
                      {(s.estado === 'en_proceso' || s.estado === 'lista') && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" aria-hidden />
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900 flex-1">
                              {s.progreso >= 100
                                ? 'Trabajo terminado — listo para publicar'
                                : 'Trabajo en curso · avance en vivo'}
                            </p>
                            <span className="text-xs font-extrabold text-emerald-800 tabular-nums">
                              {s.progreso}%
                            </span>
                          </div>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-emerald-100"
                            role="progressbar"
                            aria-valuenow={s.progreso}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-700 ease-out"
                              style={{ width: `${Math.max(4, s.progreso)}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-950/80">
                            {s.tiempoEstimado && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden />
                                Tiempo estimado: <b>{s.tiempoEstimado}</b>
                              </span>
                            )}
                            {s.fase && (
                              <span className="inline-flex items-center gap-1">
                                <Hammer className="h-3 w-3" aria-hidden />
                                {s.fase}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-emerald-800/60">
                            Último avance {haceCuando(s.actualizadoEn)} · se actualiza solo cada 30 s
                          </p>
                        </div>
                      )}
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
                      <p className="text-[11px] text-stone-400">{haceCuando(s.fecha)}</p>
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
