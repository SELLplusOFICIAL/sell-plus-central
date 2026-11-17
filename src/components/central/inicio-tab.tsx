'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Layers3,
  MessageSquarePlus,
  PlayCircle,
  BookOpenCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResumenData, haceCuando } from '@/lib/types'
import type { TabKey } from './central-app'

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  check_actualizacion: <RefreshCw className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />,
  solicitud: <MessageSquarePlus className="h-4 w-4 text-amber-400 shrink-0" aria-hidden />,
  descarga: <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />,
  sistema: <Activity className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />,
}

export default function InicioTab({
  resumen,
  recargar,
  irA,
}: {
  resumen: ResumenData | null
  recargar: () => void
  irA: (t: TabKey) => void
}) {
  const [minutos, setMinutos] = useState(0)
  const [copiada, setCopiada] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setMinutos((m) => m + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  if (!resumen) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const ultima = resumen.ultimaVersion

  // Frase de contexto: se arma en el navegador del administrador (la llave nunca vive en el código)
  const urlCentralNavegador = typeof window !== 'undefined' ? window.location.origin : ''
  const llaveNavegador =
    typeof window !== 'undefined' ? window.localStorage.getItem('central-admin-key') ?? '' : ''
  const fraseContexto =
    `Soy el administrador de Sell-Plus. Mi Central está en ${urlCentralNavegador || 'https://sell-plus-central-f7t1.vercel.app'} ` +
    `(código en GitHub: SELLplusOFICIAL/sell-plus-central, con auto-despliegue a Vercel). ` +
    `Mi llave de administrador es: ${llaveNavegador || '[mi llave de administrador]'}. ` +
    `Revisa mi Central y su bitácora (API /api/actividad con header x-central-key) y ayúdame a seguir añadiendo funciones.`

  const copiarFrase = async () => {
    try {
      await navigator.clipboard.writeText(fraseContexto)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2500)
    } catch {
      /* si el navegador bloquea el portapapeles, la frase es seleccionable a mano */
    }
  }

  return (
    <div className="space-y-4">
      {/* Estado del software — tarjeta destacada con aro degradado */}
      <div className="sp-story rounded-[18px] p-[1.5px]">
        <Card className="border-0 bg-[#0a0e17] shadow-none">
          <CardContent className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="sp-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/30 to-cyan-500/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight text-white">Tu software está al día</h2>
              {ultima && (
                <p className="mt-0.5 text-sm text-slate-300">
                  Oficial: <span className="font-semibold text-cyan-300">v{ultima.version}</span>
                  {' — '}
                  {ultima.titulo}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {resumen.ultimaConexion
                  ? `Última conexión de tu software: ${haceCuando(resumen.ultimaConexion.fecha)}`
                  : 'Tu software se conectará solo en cuanto esté abierto (revisa cada 15 min)'}
                {minutos > 0 && resumen.ultimaConexion ? ` · página abierta ${minutos} min` : ''}
              </p>
            </div>
            <Button
              onClick={() => irA('actualizaciones')}
              className="sp-btn-grad shrink-0 border-0 shadow-none"
            >
              Ver novedades
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cifras rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icono: <Layers3 className="h-5 w-5 text-cyan-300" aria-hidden />, n: resumen.totalVersiones, t: 'versiones publicadas' },
          { icono: <PlayCircle className="h-5 w-5 text-fuchsia-300" aria-hidden />, n: '6 + PDF', t: 'instructivos (v6.7.0)' },
          { icono: <MessageSquarePlus className="h-5 w-5 text-amber-300" aria-hidden />, n: resumen.solicitudesAbiertas, t: 'solicitudes abiertas' },
        ].map((c) => (
          <Card key={c.t} className="sp-hover-lift">
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              {c.icono}
              <span className="text-2xl font-bold tracking-tight text-white">{c.n}</span>
              <span className="text-[11px] leading-tight text-slate-400 sm:text-xs">{c.t}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          className="sp-hover-lift cursor-pointer"
          onClick={() => irA('solicitudes')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10">
              <MessageSquarePlus className="h-5 w-5 text-amber-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">¿Quieres un cambio en tu software?</p>
              <p className="text-xs text-slate-400">Pídelo en Solicitudes y lo trabajamos</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          </CardContent>
        </Card>
        <Card
          className="sp-hover-lift cursor-pointer"
          onClick={() => irA('aprende')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10">
              <BookOpenCheck className="h-5 w-5 text-fuchsia-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">Aprende a usar tu software</p>
              <p className="text-xs text-slate-400">Videos cortos, PDF imprimible y referencia rápida</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          </CardContent>
        </Card>
      </div>

      {/* Poder de IA */}
      <Card className="sp-hover-lift border-violet-300/15">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10">
              <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-100">Poder de IA — tu desarrollador a un clic</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                Cuando quieras añadir funciones o cambios: abre el chat de IA, pega la frase de
                contexto y el asistente retomará tu proyecto con todo el historial.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.open('https://chat.z.ai', '_blank', 'noopener')}
              className="border-0 bg-violet-500 text-white shadow-[0_4px_18px_-6px_rgba(139,92,246,0.6)] hover:bg-violet-400"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Abrir chat de IA
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copiarFrase}
              className="border-violet-300/30 bg-transparent text-violet-200 hover:bg-violet-400/10 hover:text-violet-100"
            >
              {copiada ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copiada ? '¡Copiada!' : 'Copiar frase de contexto'}
            </Button>
          </div>
          <pre className="sp-scroll mt-3 max-h-40 overflow-y-auto rounded-xl border border-violet-300/15 bg-violet-400/[0.05] p-3 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-slate-300 select-all">
            {fraseContexto}
          </pre>
          <p className="mt-2 text-[11px] text-slate-500">
            Consejo: si abres este mismo chat desde tu historial de Z.ai, continúa con todo el
            contexto. Para subir cambios, el asistente te pedirá un token de GitHub.
          </p>
        </CardContent>
      </Card>

      {/* Bitácora — contenida */}
      <Card>
        <CardContent className="px-5 py-4">
          <div className="flex items-center justify-between gap-2 pb-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Activity className="h-4 w-4 text-cyan-300" aria-hidden />
              Bitácora reciente
            </p>
            <button
              type="button"
              onClick={recargar}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Actualizar bitácora"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {resumen.actividad.length === 0 ? (
            <p className="py-3 text-sm text-slate-400">
              Aún no hay actividad registrada. Cuando tu software se conecte, lo verás aquí.
            </p>
          ) : (
            <ul className="sp-scroll max-h-56 divide-y divide-white/[0.06] overflow-y-auto pr-1">
              {resumen.actividad.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 py-2.5">
                  {ICONOS_TIPO[a.tipo] ?? ICONOS_TIPO.sistema}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm break-words text-slate-200">{a.detalle}</p>
                    <p className="text-[11px] text-slate-500">{haceCuando(a.fecha)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
