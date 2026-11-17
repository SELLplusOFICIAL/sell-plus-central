'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw,
  PackageCheck,
  ShieldCheck,
  FileDown,
  Download,
  ChevronDown,
  Archive,
  Clock,
  Smartphone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VersionItem, fechaCorta, mb } from '@/lib/types'
import { VISIBLE_DESDE } from '@/lib/resumenes'
import ComparadorVersiones from '@/components/central/comparador-versiones'
import { toast } from 'sonner'

/**
 * Etiqueta corta de la versión: el codename («Cifra Viva») sin repetir el
 * número, o la descripción corta para títulos antiguos (Sell-Plus 5.x — …).
 */
function etiqueta(titulo: string): string {
  if (titulo.includes('Cifra')) {
    const base = titulo.split('—')[0].trim()
    return base.replace(/\s*v?\d+(?:\.\d+)*\s*$/, '').trim() || base
  }
  const partes = titulo.split('—')
  const desc = partes.slice(1).join('—').trim()
  return (desc || partes[0].trim()).slice(0, 60)
}

/**
 * Notas completas de una versión, traídas SOLO cuando el dueño las pide.
 * El registro por defecto es resumido (entrega «Cifra Fresca»).
 */
function NotasCompletas({ version }: { version: string }) {
  const [notas, setNotas] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const abrir = async () => {
    if (notas !== null) {
      setNotas(null)
      return
    }
    setCargando(true)
    try {
      const res = await fetch(`/api/versiones?notas=${encodeURIComponent(version)}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setNotas((data.notas?.[version] || '').trim() || 'Esta versión no tiene notas registradas.')
      } else {
        toast.error('No se pudieron cargar las notas')
      }
    } catch {
      toast.error('No se pudieron cargar las notas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={abrir}
        aria-expanded={notas !== null}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 -mx-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${notas !== null ? 'rotate-180' : ''}`}
          aria-hidden
        />
        {cargando ? 'Buscando notas…' : notas !== null ? 'Ocultar notas completas' : 'Ver notas completas'}
      </button>
      {notas !== null && (
        <ul className="space-y-1 mt-2">
          {notas.split('\n').filter(Boolean).map((linea, i) => (
            <li key={i} className="text-xs text-slate-300 flex gap-2">
              <span className="text-cyan-400 mt-0.5" aria-hidden>•</span>
              <span>{linea.replace(/^[-•]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Tarjeta del APK móvil — canal propio, independiente de las versiones de PC.
 * La Central siempre ofrece la versión vigente (/api/apk) y el teléfono se
 * actualiza desde aquí instalando la nueva versión encima.
 */
function TarjetaApk() {
  const [apk, setApk] = useState<{
    version: string
    fileName?: string
    fileSize?: number
    sha256?: string
    fecha?: string
    notas?: string[]
    url?: string
  } | null>(null)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch('/api/apk', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d && d.version) setApk(d)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (!apk) return null

  return (
    <Card className="shadow-[0_0_30px_rgba(34,211,238,0.08)] border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 via-sky-400/5 to-blue-500/10">
      <CardContent className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <div className="sp-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-gradient-to-br from-cyan-400/80 to-blue-600/80">
          <Smartphone className="h-6 w-6 text-white" aria-hidden />
        </div>
        <div className="min-w-[230px] flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cyan-200">
            CipherPoint Móvil (APK) v{apk.version}
            <Badge className="bg-cyan-400/25 text-cyan-100 hover:bg-cyan-400/35 shrink-0">
              Disponible en la Central
            </Badge>
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            La app Android de la tienda. Se instala aparte de la versión de PC 6.7.0
            (no la toca) y recibe sus actualizaciones desde la Central: descarga la
            nueva versión e instálala encima, sin desinstalar.
          </p>
        </div>
        <a
          href="/api/apk/download"
          className="sp-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:from-cyan-400 hover:to-blue-500"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
          Descargar APK para Android
        </a>
      </CardContent>
      {(apk.fileSize || apk.sha256 || (apk.notas && apk.notas.length > 0)) && (
        <CardContent className="px-4 pb-4 pt-0 sm:px-5">
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 -mx-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200 transition-colors"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`}
              aria-hidden
            />
            {abierto ? 'Ocultar detalles del APK' : 'Detalles del APK'}
          </button>
          {abierto && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono text-[11px] text-slate-300">{apk.fileName}</span>
                {apk.fileSize ? ` · ${mb(apk.fileSize)}` : ''}
                {apk.fecha ? ` · ${apk.fecha}` : ''}
              </p>
              {apk.sha256 && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  SHA-256 verificado: <span className="font-mono">{apk.sha256.slice(0, 16)}…</span>
                </p>
              )}
              {apk.notas?.map((n, i) => (
                <p key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-cyan-400 mt-0.5 shrink-0" aria-hidden>•</span>
                  <span>{n}</span>
                </p>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function ActualizacionesTab() {
  const [versiones, setVersiones] = useState<VersionItem[] | null>(null)
  const [ultima, setUltima] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/versiones', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setVersiones(data.versiones)
        setUltima(data.ultimaVersion)
      }
    } catch {
      toast.error('No se pudo cargar la lista de versiones')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const primera = setTimeout(cargar, 0)
    return () => clearTimeout(primera)
  }, [cargar])

  if (versiones === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Versiones de tu software</h2>
            <p className="text-xs text-slate-400">
              Cada actualización se instala sola y conserva tu base de datos
            </p>
          </div>
          <Button variant="outline" size="sm" disabled className="border-white/15 text-slate-200">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden />
            Actualizar
          </Button>
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }

  const visibles = versiones.filter((v) => v.version >= VISIBLE_DESDE)
  const archivo = versiones.filter((v) => v.version < VISIBLE_DESDE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Versiones de tu software</h2>
          <p className="text-xs text-slate-400">
            La versión oficial está siempre disponible aquí; las demás quedan como historial de cambios. Tu software se actualiza solo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando} className="border-white/15 text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-300">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${cargando ? 'animate-spin' : ''}`} aria-hidden />
          Actualizar
        </Button>
      </div>

      {/* App móvil (APK) — canal propio, siempre disponible en la Central */}
      <TarjetaApk />

      {/* Kit de configuración para otras PCs (clientes) */}
      <Card className="shadow-sm border-cyan-400/20 bg-cyan-400/10">
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-[230px] flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
              <Download className="h-4 w-4" aria-hidden />
              ¿Instalando Sell-Plus en otra computadora?
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Baja el kit de configuración: apunta tu Sell-Plus a esta Central en un clic y abre
              directamente las actualizaciones y soluciones (solo información y descargas).
            </p>
          </div>
          <a
            href="/Sell-Plus-Kit-Clientes.zip"
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden />
            Descargar kit para tu PC
          </a>
        </CardContent>
      </Card>

      {/* Registro resumido: 6.0.0 en adelante */}
      <ol className="relative space-y-3 border-l-2 border-cyan-400/20 ml-3">
        {visibles.map((v) => {
          const esUltima = v.version === ultima
          return (
            <li key={v.id} className="ml-6">
              <span
                className={`absolute -left-[9px] mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  esUltima ? 'bg-cyan-500 border-cyan-400/20' : 'bg-slate-600 border-white/10'
                }`}
                aria-hidden
              />
              <Card className={`shadow-sm ${esUltima ? 'border-cyan-400/30 bg-cyan-400/10/40' : 'border-white/10'}`}>
                <CardContent className="px-4 sm:px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base text-slate-50">v{v.version}</CardTitle>
                    <span className="text-sm font-semibold text-cyan-300">
                      «{etiqueta(v.titulo)}»
                    </span>
                    {esUltima && (
                      <Badge className="bg-cyan-600 hover:bg-cyan-600 text-white">
                        <PackageCheck className="h-3 w-3 mr-1" aria-hidden />
                        Versión oficial — siempre disponible
                      </Badge>
                    )}
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {fechaCorta(v.fecha)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5">{v.resumen}</p>
                  {esUltima && (
                    <p className="text-xs text-cyan-200 mt-1">
                      Esta es la versión que tu software instala y reinstala; la puedes descargar aquí siempre. El resto de versiones queda como historial de cambios.
                    </p>
                  )}

                  {esUltima && v.fileName && (
                    <div className="rounded-lg bg-white/5/5 border border-cyan-400/20 p-3 mt-3 space-y-1.5">
                      <p className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                        <FileDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        <span className="font-mono text-[11px]">{v.fileName}</span>
                        {v.fileSize ? ` · ${mb(v.fileSize)}` : ''}
                      </p>
                      {v.sha256 && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                          SHA-256 verificado: <span className="font-mono">{v.sha256.slice(0, 16)}…</span>
                        </p>
                      )}
                      <a
                        href={`/api/updates/download/${v.version}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 hover:text-cyan-300 underline underline-offset-2"
                      >
                        <FileDown className="h-3.5 w-3.5" aria-hidden />
                        Descargar instalador
                      </a>
                    </div>
                  )}

                  <NotasCompletas version={v.version} />
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ol>

      {/* Archivo: versiones anteriores (3.x – 5.x), colapsadas y sin notas */}
      {archivo.length > 0 && (
        <Collapsible>
          <Card className="shadow-sm border-white/10">
            <CollapsibleTrigger className="w-full text-left">
              <CardHeader className="py-3 px-4 sm:px-5">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-slate-500" aria-hidden />
                    Versiones anteriores ({archivo.length})
                    <span className="text-slate-500 font-normal">
                      · de la v{archivo[archivo.length - 1].version} a la v{archivo[0].version} — historial de cambios
                    </span>
                  </span>
                  <Badge variant="secondary">Historial</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                <p className="text-xs text-slate-400 mb-2">
                  Historial completo antes de la v{VISIBLE_DESDE}. Instaladores antiguos disponibles
                  en GitHub; tu software nunca necesita reinstalarlas.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {archivo.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-baseline gap-2 border-b border-white/10 py-1.5 text-sm"
                    >
                      <span className="font-mono text-xs text-slate-200 shrink-0">v{v.version}</span>
                      <span className="text-xs text-slate-400 truncate flex-1">{etiqueta(v.titulo)}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(v.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Comparador de versiones: qué cambia entre una versión y otra, por área */}
      {versiones.length >= 2 && <ComparadorVersiones versiones={versiones} />}

      <Collapsible>
        <Card className="shadow-sm border-white/10">
          <CollapsibleTrigger className="w-full text-left">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                ¿Tengo que hacer algo cuando sale una versión nueva?
                <Badge variant="secondary">No</Badge>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm text-slate-300">
              <p>
                No. Tu software revisa la Central cada 15 minutos mientras está abierto (y cada 6
                horas también). Cuando publico una versión nueva aquí, tu equipo la descarga, la
                verifica e instala solo, normalmente en menos de 15 minutos.
              </p>
              <p className="mt-2 text-slate-400">
                Tus ventas, productos, inventarios y usuarios <strong>nunca</strong> se borran al
                actualizar.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
