'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, RefreshCw, Layers3, MessageSquarePlus, BookOpenCheck, Activity, ArrowRight, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ResumenData, PaladinData, PaladinReporteItem, haceCuando } from '@/lib/types'
import type { TabKey } from './central-app'

const ESTADO_PALADIN: Record<string, { texto: string; clase: string; iconoFondo: string; iconoColor: string }> = {
  ok: { texto: 'Todo en orden', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200', iconoFondo: 'bg-emerald-100', iconoColor: 'text-emerald-700' },
  alerta: { texto: 'Con observaciones', clase: 'bg-amber-100 text-amber-800 border-amber-300', iconoFondo: 'bg-amber-100', iconoColor: 'text-amber-700' },
  fallo: { texto: 'Detectó un problema', clase: 'bg-red-100 text-red-800 border-red-300', iconoFondo: 'bg-red-100', iconoColor: 'text-red-700' },
}

function IconoCheck({ estado }: { estado: string }) {
  if (estado === 'fallo') return <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" aria-hidden />
  if (estado === 'alerta') return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
  return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
}

function PaladinSeccion() {
  const [datos, setDatos] = useState<PaladinData | null>(null)
  const [expandido, setExpandido] = useState(false)

  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      try {
        const res = await fetch('/api/paladin', { cache: 'no-store' })
        if (res.ok && vivo) setDatos(await res.json())
      } catch {
        /* silencioso */
      }
    }
    const primera = setTimeout(cargar, 0)
    const t = setInterval(cargar, 60_000)
    return () => {
      vivo = false
      clearTimeout(primera)
      clearInterval(t)
    }
  }, [])

  const ultimo: PaladinReporteItem | null = datos?.ultimo ?? null
  const est = ultimo ? ESTADO_PALADIN[ultimo.estadoGlobal] ?? ESTADO_PALADIN.alerta : null
  const origenTexto = ultimo?.origen === 'pos' ? 'análisis del programa en tu PC' : 'análisis del build antes de publicar'

  return (
    <Card className="shadow-sm border-stone-200 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${est ? est.iconoFondo : 'bg-stone-100'}`}>
            <ShieldCheck className={`h-5 w-5 ${est ? est.iconoColor : 'text-stone-400'}`} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-stone-800">Paladín · guardián del sistema</p>
            <p className="text-xs text-stone-500 leading-snug">
              {ultimo ? ultimo.resumen : 'El Paladín vigila tu programa y revisa cada actualización antes de dejarla salir. Su análisis aparecerá aquí.'}
            </p>
          </div>
          <Badge className={`${est ? est.clase : 'bg-stone-100 text-stone-600 border-stone-200'} border shrink-0`}>
            {est ? est.texto : 'En espera'}
          </Badge>
          {ultimo && ultimo.checks.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={expandido ? 'Ocultar detalle del análisis' : 'Ver detalle del análisis'}
              onClick={() => setExpandido((v) => !v)}
              className="h-8 w-8 shrink-0 text-stone-500 hover:text-stone-700"
            >
              {expandido ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            </Button>
          )}
        </div>

        {expandido && ultimo && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">
              Verificaciones de este análisis
            </p>
            <ul className="max-h-48 overflow-y-auto divide-y divide-stone-100 pr-1">
              {ultimo.checks.map((c, i) => (
                <li key={i} className="py-1.5 flex items-start gap-2">
                  <IconoCheck estado={c.estado} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-700">{c.nombre}</p>
                    {c.detalle && <p className="text-[11px] text-stone-400 break-words">{c.detalle}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {datos && datos.anteriores.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">
                  Análisis anteriores
                </p>
                <ul className="space-y-1">
                  {datos.anteriores.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${a.estadoGlobal === 'ok' ? 'bg-emerald-500' : a.estadoGlobal === 'fallo' ? 'bg-red-500' : 'bg-amber-500'}`} aria-hidden />
                      <span className="truncate flex-1">{a.resumen}</span>
                      <span className="shrink-0 text-stone-400">{haceCuando(a.fecha)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-stone-400 mt-2">
          {ultimo
            ? `${origenTexto}${ultimo.versionPos ? ` · v${ultimo.versionPos}` : ''} · ${haceCuando(ultimo.fecha)}${ultimo.duracionMs ? ` · tomó ${(ultimo.duracionMs / 1000).toFixed(0)} s` : ''}`
            : 'Cada actualización pasa por su revisión antes de publicarse.'}
        </p>
      </CardContent>
    </Card>
  )
}

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  check_actualizacion: <RefreshCw className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />,
  solicitud: <MessageSquarePlus className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />,
  descarga: <ArrowRight className="h-4 w-4 text-stone-500 shrink-0" aria-hidden />,
  sistema: <Activity className="h-4 w-4 text-stone-400 shrink-0" aria-hidden />,
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

  return (
    <div className="space-y-5">
      {/* Estado del software */}
      <Card className="border-emerald-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50 to-stone-50 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-950">
              Tu software está al día
            </h2>
            {ultima && (
              <p className="text-sm text-stone-600 mt-0.5">
                Última versión publicada:{' '}
                <span className="font-semibold text-emerald-800">v{ultima.version}</span>
                {' — '}
                {ultima.titulo}
              </p>
            )}
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {resumen.ultimaConexion
                ? `Última conexión de tu software: ${haceCuando(resumen.ultimaConexion.fecha)}`
                : 'Tu software se conectará solo en cuanto esté abierto (revisa cada 15 min)'}
              {minutos > 0 && resumen.ultimaConexion ? ` · página abierta ${minutos} min` : ''}
            </p>
          </div>
          <Button
            onClick={() => irA('actualizaciones')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white shrink-0"
          >
            Ver novedades
          </Button>
        </div>
      </Card>

      {/* Cifras rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm border-stone-200">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Layers3 className="h-5 w-5 text-emerald-700" aria-hidden />
            <span className="text-2xl font-bold text-stone-800">{resumen.totalVersiones}</span>
            <span className="text-[11px] sm:text-xs text-stone-500 leading-tight">
              versiones publicadas
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-stone-200">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <BookOpenCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            <span className="text-2xl font-bold text-stone-800">{resumen.tutorialesCount}</span>
            <span className="text-[11px] sm:text-xs text-stone-500 leading-tight">
              guías en Aprende
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-stone-200">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <MessageSquarePlus className="h-5 w-5 text-emerald-700" aria-hidden />
            <span className="text-2xl font-bold text-stone-800">{resumen.solicitudesAbiertas}</span>
            <span className="text-[11px] sm:text-xs text-stone-500 leading-tight">
              solicitudes abiertas
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Paladín · resumen de su análisis (solicitud #4) */}
      <PaladinSeccion />

      {/* Accesos rápidos */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="shadow-sm border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => irA('solicitudes')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="h-5 w-5 text-amber-700" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800">¿Quieres un cambio en tu software?</p>
              <p className="text-xs text-stone-500">Pídelo en Solicitudes y lo trabajamos</p>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400" aria-hidden />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => irA('aprende')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <BookOpenCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-800">Aprende a usar funciones nuevas</p>
              <p className="text-xs text-stone-500">Guías cortas, en español y sin tecnicismos</p>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400" aria-hidden />
          </CardContent>
        </Card>
      </div>

      {/* Bitácora */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <Activity className="h-4 w-4 text-emerald-700" aria-hidden />
            Bitácora reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {resumen.actividad.length === 0 ? (
            <p className="text-sm text-stone-500 py-3">
              Aún no hay actividad registrada. Cuando tu software se conecte, lo verás aquí.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {resumen.actividad.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-2.5">
                  {ICONOS_TIPO[a.tipo] ?? ICONOS_TIPO.sistema}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 break-words">{a.detalle}</p>
                    <p className="text-[11px] text-stone-400">{haceCuando(a.fecha)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" onClick={recargar} className="mt-2 text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
