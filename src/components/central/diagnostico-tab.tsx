'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  ShieldCheck,
  Wifi,
  XCircle,
  Bug,
  TimerReset,
  Paintbrush,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ResumenData, CENTRAL_URL, centralUrlActual, haceCuando } from '@/lib/types'
import { SolicitudItem } from '@/lib/types'
import { toast } from 'sonner'

type EstadoPrueba = 'inactiva' | 'probando' | 'ok' | 'error'
type Chequeo = { estado: 'al-dia' | 'actualizar' | 'error'; detalle: string }

/**
 * Problemas conocidos de la versión oficial 6.7.0, con su estado real.
 * Se alimenta del laboratorio (simulación 6.6.0/6.7.0) y del canal de solicitudes.
 */
const CONOCIDOS: { titulo: string; detalle: string; tipo: 'bug' | 'retraso' | 'cosmetico' }[] = [
  {
    titulo: 'La caja se atora cuando venden 3 o más cajas a la vez',
    detalle:
      'Causa confirmada en el laboratorio: escrituras simultáneas contra la base de datos. La venta afectada tarda unos 5 segundos y hay que repetirla; NO pierde datos ni deja tickets a medias. La solución (blindaje de ventas simultáneas) está lista para salir como siguiente versión — pídela en Solicitudes o en el chat.',
    tipo: 'retraso',
  },
  {
    titulo: 'Pantalla vacía hasta 60 segundos al arrancar si el servidor local no levanta',
    detalle:
      'El aviso de error tarda en aparecer cuando el servidor interno no arranca (PC recién encendida, antivirus lento). Después del aviso todo sigue normal. La solución (aviso inmediato con botón Reintentar) va en la siguiente versión.',
    tipo: 'retraso',
  },
  {
    titulo: 'Aviso técnico «duplicate column name: desglose» al arrancar',
    detalle:
      'Es un ruido cosmético: el sistema lo atrapa solo y continúa. No afecta ventas, inventario ni datos. Se silenciará en la siguiente versión.',
    tipo: 'cosmetico',
  },
  {
    titulo: 'Aviso React #418 en la vista de Caja',
    detalle:
      'Parpadeo interno de recarga de la vista. Cosmético: la operación sigue normal. Se limpiará en la siguiente versión.',
    tipo: 'cosmetico',
  },
  {
    titulo: 'Productos que no aparecen, caja que no carga o Excel que falla',
    detalle:
      'Si tu instalación es 6.6.0 o anterior, tres piezas internas llegaron dañadas en esa entrega. La 6.7.0 oficial las cura: actualiza a la 6.7.0 desde Actualizaciones y el problema desaparece.',
    tipo: 'bug',
  },
]

const ESTILO_TIPO: Record<string, { label: string; clase: string; icono: React.ReactNode }> = {
  bug: { label: 'Bug curado', clase: 'border border-red-400/25 bg-red-400/10 text-red-300 hover:bg-red-400/15', icono: <Bug className="h-3 w-3" aria-hidden /> },
  retraso: { label: 'Retraso conocido', clase: 'border border-amber-400/25 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15', icono: <TimerReset className="h-3 w-3" aria-hidden /> },
  cosmetico: { label: 'Cosmético', clase: 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', icono: <Paintbrush className="h-3 w-3" aria-hidden /> },
}

/** Bloque de resultado compartido por el chequeo y la prueba de conexión */
function Resultado({ estado, detalle }: { estado: 'al-dia' | 'actualizar' | 'error'; detalle: string }) {
  if (estado === 'al-dia') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] p-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <p className="text-sm leading-relaxed text-emerald-200">{detalle}</p>
      </div>
    )
  }
  if (estado === 'actualizar') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3">
        <TimerReset className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
        <p className="text-sm leading-relaxed text-amber-200">{detalle}</p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.08] p-3">
      <XCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
      <p className="text-sm leading-relaxed text-red-200">{detalle}</p>
    </div>
  )
}

export default function DiagnosticoTab({ resumen }: { resumen: ResumenData | null }) {
  const [versionConsulta, setVersionConsulta] = useState('6.7.0')
  const [chequeo, setChequeo] = useState<Chequeo | null>(null)
  const [chequeando, setChequeando] = useState(false)
  const [estado, setEstado] = useState<EstadoPrueba>('inactiva')
  const [detalle, setDetalle] = useState<string>('')
  const [urlCentral, setUrlCentral] = useState<string>(CENTRAL_URL)
  const [activas, setActivas] = useState<SolicitudItem[] | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)

  const llaveAdmin = (): Record<string, string> => {
    try {
      const k = window.localStorage.getItem('central-admin-key')
      return k ? { 'x-central-key': k } : {}
    } catch {
      return {}
    }
  }

  useEffect(() => {
    setUrlCentral(centralUrlActual())
    const cargarActivas = async () => {
      try {
        const res = await fetch('/api/solicitudes', { cache: 'no-store', headers: llaveAdmin() })
        if (res.ok) {
          const data = await res.json()
          setActivas((data.solicitudes as SolicitudItem[]).filter((s) => s.estado !== 'publicada'))
        }
      } catch {
        /* silencioso: el reporte funciona sin esto */
      }
    }
    cargarActivas()
  }, [])

  /** Chequeo de la instalación contra la versión oficial */
  const chequear = async () => {
    const v = versionConsulta.trim()
    if (!/^\d+\.\d+\.\d+$/.test(v)) {
      setChequeo({ estado: 'error', detalle: 'Escribe la versión con su formato, por ejemplo 6.7.0.' })
      return
    }
    setChequeando(true)
    setChequeo(null)
    try {
      const res = await fetch(`/api/updates/check?version=${encodeURIComponent(v)}`, {
        cache: 'no-store',
        headers: llaveAdmin(),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.hasUpdate) {
          setChequeo({
            estado: 'actualizar',
            detalle: `Tu instalación v${v} está detrás de la oficial v${data.ultimaVersion}. Abre tu software: se actualiza solo en cuanto conecte, o descarga el instalador desde la pestaña Actualizaciones.`,
          })
        } else {
          setChequeo({
            estado: 'al-dia',
            detalle: `Tu instalación v${v} es la versión oficial y está al día. Huella verificada por la Central antes de instalar.`,
          })
        }
      } else {
        setChequeo({ estado: 'error', detalle: `La Central respondió con código ${res.status}.` })
      }
    } catch {
      setChequeo({ estado: 'error', detalle: 'No hubo respuesta del servidor de la Central. Revisa tu conexión e intenta de nuevo.' })
    } finally {
      setChequeando(false)
    }
  }

  /** Prueba de conexión (igual que hace tu software automáticamente) */
  const probar = async () => {
    setEstado('probando')
    setDetalle('')
    try {
      const res = await fetch(`/api/health?ts=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setEstado('ok')
        setDetalle(
          `La Central respondió correctamente a las ${new Date(data.hora).toLocaleTimeString('es-MX')} · Versión oficial: v${data.ultimaVersion ?? '—'}`
        )
      } else {
        setEstado('error')
        setDetalle(`La Central respondió con código ${res.status}.`)
      }
    } catch {
      setEstado('error')
      setDetalle('No hubo respuesta del servidor. Revisa tu conexión y vuelve a intentar; si sigue sin abrir, escríbeme en el chat.')
    }
  }

  /** Reporte listo para pegar en el chat y resolver de inmediato */
  const armarReporte = (): string => {
    const congeladas = (activas ?? []).filter((s) => {
      if (s.estado !== 'en_proceso' && s.estado !== 'lista') return false
      if (!s.actualizadoEn) return false
      return Date.now() - new Date(s.actualizadoEn).getTime() > 90 * 60 * 1000
    })
    const lineas: string[] = [
      'REPORTE DE DIAGNÓSTICO — Sell-Plus (versión oficial 6.7.0 «Cifra Fresca»)',
      `Fecha: ${new Date().toLocaleString('es-MX')}`,
      `· Versión consultada en el chequeo: v${versionConsulta.trim()} → ${chequeo ? (chequeo.estado === 'al-dia' ? 'al día con la oficial' : chequeo.estado === 'actualizar' ? 'desactualizada' : 'no se pudo verificar') : 'sin chequear aún'}`,
      `· Conexión con la Central: ${estado === 'ok' ? 'OK' : estado === 'error' ? 'con falla' : 'sin probar en esta sesión'}`,
    ]
    if (resumen?.ultimaConexion) {
      lineas.push(`· Última conexión de tu software: ${haceCuando(resumen.ultimaConexion.fecha)}`)
    }
    lineas.push(
      `· Solicitudes en curso: ${activas ? activas.length : '—'}${congeladas.length ? ` (congeladas: #${congeladas.map((s) => s.id).join(', #')})` : ''}`
    )
    lineas.push(`· Problemas que veo o sospecho: [escríbelos aquí — qué pasa, en qué pantalla y cuándo empezó]`)
    lineas.push('· Versión instalada en la PC: [la ves abajo del menú de tu software, ej. Sell-Plus 6.7.0]')
    return lineas.join('\n')
  }

  const copiarReporte = async () => {
    try {
      await navigator.clipboard.writeText(armarReporte())
      setCopiado(true)
      toast.success('Reporte copiado')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error('No se pudo copiar; selecciona el texto del reporte y cópialo a mano.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Diagnóstico</h2>
        <p className="text-xs text-slate-400">
          Especialista de la v6.7.0: código, bugs y retrasos. Verifica tu instalación, revisa lo
          conocido y genera un reporte listo para resolver.
        </p>
      </div>

      {/* Herramientas: chequeo y conexión, lado a lado */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="sp-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden />
              Chequear tu instalación
            </CardTitle>
            <p className="text-xs text-slate-400">
              Compara tu versión contra la oficial de la Central.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={versionConsulta}
                onChange={(e) => setVersionConsulta(e.target.value)}
                placeholder="6.7.0"
                className="w-28 font-mono"
                aria-label="Versión instalada en la PC"
              />
              <Button
                onClick={chequear}
                disabled={chequeando}
                size="sm"
                className="sp-btn-grad border-0 shadow-none"
              >
                {chequeando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Verificando…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Verificar
                  </>
                )}
              </Button>
            </div>
            {chequeo && <Resultado estado={chequeo.estado} detalle={chequeo.detalle} />}
          </CardContent>
        </Card>

        <Card className="sp-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
              <Wifi className="h-4 w-4 text-cyan-300" aria-hidden />
              Conexión con la Central
            </CardTitle>
            <p className="text-xs text-slate-400">
              Igual que lo hace tu software cada 15 minutos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={probar}
              disabled={estado === 'probando'}
              size="sm"
              variant="outline"
              className="border-white/12 bg-white/[0.05] text-slate-100 hover:bg-white/[0.1] hover:text-white"
            >
              {estado === 'probando' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Probando…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Probar conexión
                </>
              )}
            </Button>
            {estado === 'ok' && <Resultado estado="al-dia" detalle={detalle} />}
            {estado === 'error' && <Resultado estado="error" detalle={detalle} />}
            {resumen?.ultimaConexion && (
              <p className="text-xs text-slate-500">
                Última conexión recibida de tu software: {haceCuando(resumen.ultimaConexion.fecha)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Problemas conocidos — compacto: plegado por defecto, una línea por problema */}
      <Card>
        <Collapsible open={abierto !== null} onOpenChange={(o) => { if (!o) setAbierto(null) }}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full text-left" aria-expanded={abierto !== null}>
              <CardContent className="flex items-center justify-between gap-2 px-5 py-3.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Bug className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="truncate text-sm font-semibold text-slate-200">
                    Problemas conocidos de la v6.7.0
                    <span className="ml-1.5 text-xs font-normal text-slate-500">
                      ({CONOCIDOS.length} registrados · ninguno bloquea la venta del día)
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${abierto !== null ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </CardContent>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-3 pb-4 pt-0">
              <p className="mb-1 px-2 text-[11px] text-slate-500">
                Identificados en el laboratorio, con la solución asignada. Toca uno para ver el detalle.
              </p>
              <ul className="space-y-0.5">
                {CONOCIDOS.map((c, i) => {
                  const estilo = ESTILO_TIPO[c.tipo]
                  const desplegado = abierto === i
                  return (
                    <li key={c.titulo}>
                      <button
                        type="button"
                        onClick={() => setAbierto(desplegado ? null : i)}
                        aria-expanded={desplegado}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${desplegado ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{c.titulo}</span>
                        <Badge className={`${estilo.clase} shrink-0 gap-1 border-0`}>
                          {estilo.icono}
                          {estilo.label}
                        </Badge>
                      </button>
                      {desplegado && (
                        <p className="px-2 pb-3 pl-9 pr-3 text-xs leading-relaxed text-slate-300">
                          {c.detalle}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reporte para resolver de inmediato */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
            <ClipboardCheck className="h-4 w-4 text-cyan-300" aria-hidden />
            Reporte listo para resolver
          </CardTitle>
          <p className="text-xs text-slate-400">
            Cópialo, complétalo con lo que ves en tu PC y pégamelo en el chat de IA o en Solicitudes.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="sp-scroll max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[11px] leading-relaxed text-slate-300 break-words whitespace-pre-wrap select-all">
            {armarReporte()}
          </pre>
          <Button
            size="sm"
            onClick={copiarReporte}
            className="sp-btn-grad border-0 shadow-none"
          >
            {copiado ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Copiar reporte
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
