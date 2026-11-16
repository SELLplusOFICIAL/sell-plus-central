'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  ShieldCheck,
  Wrench,
  Wifi,
  XCircle,
  Bug,
  TimerReset,
  Paintbrush,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  bug: { label: 'Bug curado', clase: 'bg-red-100 text-red-800 hover:bg-red-100', icono: <Bug className="h-3.5 w-3.5" aria-hidden /> },
  retraso: { label: 'Retraso conocido', clase: 'bg-amber-100 text-amber-900 hover:bg-amber-100', icono: <TimerReset className="h-3.5 w-3.5" aria-hidden /> },
  cosmetico: { label: 'Cosmético', clase: 'bg-stone-100 text-stone-600 hover:bg-stone-100', icono: <Paintbrush className="h-3.5 w-3.5" aria-hidden /> },
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
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-emerald-700" aria-hidden />
          Diagnóstico — especialista de la versión 6.7.0
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Resolvemos problemas de funcionalidad de código, bugs y retrasos de funciones de la
          versión oficial. Verifica tu instalación, revisa los problemas conocidos y genera un
          reporte listo para resolver.
        </p>
      </div>

      {/* Chequeo de la instalación */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            Chequear tu instalación
          </CardTitle>
          <p className="text-xs text-stone-500">
            Compara la versión que corre en tu PC contra la oficial de la Central.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={versionConsulta}
              onChange={(e) => setVersionConsulta(e.target.value)}
              placeholder="6.7.0"
              className="w-32 font-mono border-stone-300 focus-visible:ring-emerald-700"
              aria-label="Versión instalada en la PC"
            />
            <Button
              onClick={chequear}
              disabled={chequeando}
              className="bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              {chequeando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                  Verificando…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden />
                  Verificar versión
                </>
              )}
            </Button>
          </div>
          {chequeo?.estado === 'al-dia' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden />
              <p className="text-sm text-emerald-900">{chequeo.detalle}</p>
            </div>
          )}
          {chequeo?.estado === 'actualizar' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <TimerReset className="h-5 w-5 text-amber-600 shrink-0" aria-hidden />
              <p className="text-sm text-amber-900">{chequeo.detalle}</p>
            </div>
          )}
          {chequeo?.estado === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden />
              <p className="text-sm text-red-900">{chequeo.detalle}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conexión con la Central */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <Wifi className="h-5 w-5 text-emerald-700" aria-hidden />
            Conexión con la Central
          </CardTitle>
          <p className="text-xs text-stone-500">
            Igual que lo hace tu software automáticamente, cada 15 minutos.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={probar} disabled={estado === 'probando'} variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-50">
            {estado === 'probando' ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                Probando…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden />
                Probar conexión
              </>
            )}
          </Button>
          {estado === 'ok' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden />
              <p className="text-sm text-emerald-900">{detalle}</p>
            </div>
          )}
          {estado === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden />
              <p className="text-sm text-red-900">{detalle}</p>
            </div>
          )}
          {resumen?.ultimaConexion && (
            <p className="text-xs text-stone-500">
              Última conexión recibida de tu software: {haceCuando(resumen.ultimaConexion.fecha)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Problemas conocidos de la 6.7.0 */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <Bug className="h-5 w-5 text-emerald-700" aria-hidden />
            Problemas conocidos de la v6.7.0 y su estado
          </CardTitle>
          <p className="text-xs text-stone-500">
            Lo que ya identificamos en el laboratorio, con la solución asignada. Ninguno bloquea la
            venta del día.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONOCIDOS.map((c) => {
            const estilo = ESTILO_TIPO[c.tipo]
            return (
              <div key={c.titulo} className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-stone-800 flex-1 min-w-0 break-words">{c.titulo}</p>
                  <Badge className={estilo.clase + ' gap-1 shrink-0'}>
                    {estilo.icono}
                    {estilo.label}
                  </Badge>
                </div>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{c.detalle}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Reporte para resolver de inmediato */}
      <Card className="shadow-sm border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <ClipboardCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            Reporte listo para resolver
          </CardTitle>
          <p className="text-xs text-stone-500">
            Copia este reporte, complétalo con lo que ves en tu PC y pégamelo en el chat de IA
            (botón IA arriba) o en Solicitudes: lo resuelvo de inmediato.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="rounded-lg border border-stone-200 bg-white p-3 text-[11px] leading-relaxed text-stone-600 whitespace-pre-wrap break-words select-all">
            {armarReporte()}
          </pre>
          <Button
            size="sm"
            onClick={copiarReporte}
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            {copiado ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" aria-hidden />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" aria-hidden />
                Copiar reporte
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
