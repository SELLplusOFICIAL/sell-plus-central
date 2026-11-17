'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, RefreshCw, Layers3, MessageSquarePlus, BookOpenCheck, Activity, ArrowRight, Sparkles, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <Skeleton className="h-36 w-full rounded-2xl" />
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
    <div className="space-y-5">
      {/* Estado del software */}
      <Card className="border-cyan-400/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-cyan-400/10 to-white/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <CheckCircle2 className="h-12 w-12 text-cyan-400 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50">
              Tu software está al día
            </h2>
            {ultima && (
              <p className="text-sm text-slate-300 mt-0.5">
                Última versión publicada:{' '}
                <span className="font-semibold text-cyan-200">v{ultima.version}</span>
                {' — '}
                {ultima.titulo}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {resumen.ultimaConexion
                ? `Última conexión de tu software: ${haceCuando(resumen.ultimaConexion.fecha)}`
                : 'Tu software se conectará solo en cuanto esté abierto (revisa cada 15 min)'}
              {minutos > 0 && resumen.ultimaConexion ? ` · página abierta ${minutos} min` : ''}
            </p>
          </div>
          <Button
            onClick={() => irA('actualizaciones')}
            className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
          >
            Ver novedades
          </Button>
        </div>
      </Card>

      {/* Cifras rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Layers3 className="h-5 w-5 text-cyan-300" aria-hidden />
            <span className="text-2xl font-bold text-slate-100">{resumen.totalVersiones}</span>
            <span className="text-[11px] sm:text-xs text-slate-400 leading-tight">
              versiones publicadas
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <BookOpenCheck className="h-5 w-5 text-cyan-300" aria-hidden />
            <span className="text-2xl font-bold text-slate-100">1</span>
            <span className="text-[11px] sm:text-xs text-slate-400 leading-tight">
              instructivo oficial (v6.7.0)
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <MessageSquarePlus className="h-5 w-5 text-cyan-300" aria-hidden />
            <span className="text-2xl font-bold text-slate-100">{resumen.solicitudesAbiertas}</span>
            <span className="text-[11px] sm:text-xs text-slate-400 leading-tight">
              solicitudes abiertas
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="shadow-sm border-white/10 hover:border-cyan-400/30 transition-colors cursor-pointer" onClick={() => irA('solicitudes')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="h-5 w-5 text-amber-300" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100">¿Quieres un cambio en tu software?</p>
              <p className="text-xs text-slate-400">Pídelo en Solicitudes y lo trabajamos</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-white/10 hover:border-cyan-400/30 transition-colors cursor-pointer" onClick={() => irA('aprende')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-400/15 flex items-center justify-center shrink-0">
              <BookOpenCheck className="h-5 w-5 text-cyan-300" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100">Aprende a usar funciones nuevas</p>
              <p className="text-xs text-slate-400">Guías cortas, en español y sin tecnicismos</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden />
          </CardContent>
        </Card>
      </div>

      {/* Poder de IA */}
      <Card className="shadow-sm border-violet-400/30 overflow-hidden">
        <div className="bg-gradient-to-br from-violet-50 to-white/5 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-400/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-100">Poder de IA — tu desarrollador a un clic</h3>
              <p className="text-sm text-slate-300 mt-1">
                Esta Central ya trabaja sola en internet. Cuando quieras añadir funciones o cambios,
                abre el chat de IA, pega la frase de contexto y el asistente retomará tu proyecto.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.open('https://chat.z.ai', '_blank', 'noopener')}
              className="bg-violet-700 hover:bg-violet-800 text-white"
            >
              <Sparkles className="h-4 w-4 mr-1.5" aria-hidden />
              Abrir chat de IA
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copiarFrase}
              className="border-violet-300 text-violet-300 hover:bg-violet-400/15"
            >
              {copiada ? (
                <Check className="h-4 w-4 mr-1.5" aria-hidden />
              ) : (
                <Copy className="h-4 w-4 mr-1.5" aria-hidden />
              )}
              {copiada ? '¡Copiada!' : 'Copiar frase de contexto'}
            </Button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-violet-400/30 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-300 select-all whitespace-pre-wrap break-words">
            {fraseContexto}
          </pre>
          <p className="mt-2 text-[11px] text-slate-400">
            Consejo: si abres este mismo chat desde tu historial de Z.ai, continúa con todo el
            contexto. Para subir cambios, el asistente te pedirá un token de GitHub.
          </p>
        </div>
      </Card>

      {/* Bitácora */}
      <Card className="shadow-sm border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-cyan-300" aria-hidden />
            Bitácora reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {resumen.actividad.length === 0 ? (
            <p className="text-sm text-slate-400 py-3">
              Aún no hay actividad registrada. Cuando tu software se conecte, lo verás aquí.
            </p>
          ) : (
            <ul className="max-h-56 divide-y divide-white/10 overflow-y-auto pr-1">
              {resumen.actividad.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-2.5">
                  {ICONOS_TIPO[a.tipo] ?? ICONOS_TIPO.sistema}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 break-words line-clamp-2">{a.detalle}</p>
                    <p className="text-[11px] text-slate-500">{haceCuando(a.fecha)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" onClick={recargar} className="mt-2 text-cyan-200 hover:text-cyan-300 hover:bg-cyan-400/10">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
