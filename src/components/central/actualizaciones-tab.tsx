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

/** Codename corto del título: «Cifra Viva 6.6.2 — …» → «Cifra Viva». */
function codename(titulo: string): string {
  const m = titulo.match(/«([^»]+)»/)
  if (m) return m[1]
  return titulo.split('—')[0].trim()
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
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 -mx-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
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
            <li key={i} className="text-xs text-stone-600 flex gap-2">
              <span className="text-emerald-600 mt-0.5" aria-hidden>•</span>
              <span>{linea.replace(/^[-•]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
            <h2 className="text-lg font-bold text-stone-800">Versiones de tu software</h2>
            <p className="text-xs text-stone-500">
              Cada actualización se instala sola y conserva tu base de datos
            </p>
          </div>
          <Button variant="outline" size="sm" disabled className="border-stone-300 text-stone-700">
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
          <h2 className="text-lg font-bold text-stone-800">Versiones de tu software</h2>
          <p className="text-xs text-stone-500">
            Registro resumido: una línea por versión. Tu software se actualiza solo.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando} className="border-stone-300 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${cargando ? 'animate-spin' : ''}`} aria-hidden />
          Actualizar
        </Button>
      </div>

      {/* Kit de configuración para otras PCs (clientes) */}
      <Card className="shadow-sm border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-[230px] flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
              <Download className="h-4 w-4" aria-hidden />
              ¿Instalando Sell-Plus en otra computadora?
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              Baja el kit de configuración: apunta tu Sell-Plus a esta Central en un clic y abre
              directamente las actualizaciones y soluciones (solo información y descargas).
            </p>
          </div>
          <a
            href="/Sell-Plus-Kit-Clientes.zip"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden />
            Descargar kit para tu PC
          </a>
        </CardContent>
      </Card>

      {/* Registro resumido: 6.0.0 en adelante */}
      <ol className="relative space-y-3 border-l-2 border-emerald-200 ml-3">
        {visibles.map((v) => {
          const esUltima = v.version === ultima
          return (
            <li key={v.id} className="ml-6">
              <span
                className={`absolute -left-[9px] mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  esUltima ? 'bg-emerald-600 border-emerald-200' : 'bg-stone-300 border-stone-100'
                }`}
                aria-hidden
              />
              <Card className={`shadow-sm ${esUltima ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200'}`}>
                <CardContent className="px-4 sm:px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base text-stone-900">v{v.version}</CardTitle>
                    <span className="text-sm font-semibold text-emerald-900">
                      «{codename(v.titulo)}»
                    </span>
                    {esUltima && (
                      <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white">
                        <PackageCheck className="h-3 w-3 mr-1" aria-hidden />
                        Última disponible
                      </Badge>
                    )}
                    <span className="text-[11px] text-stone-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden />
                      {fechaCorta(v.fecha)}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 mt-1.5">{v.resumen}</p>

                  {esUltima && v.fileName && (
                    <div className="rounded-lg bg-white/70 border border-emerald-200 p-3 mt-3 space-y-1.5">
                      <p className="text-xs text-stone-600 flex items-center gap-1.5 flex-wrap">
                        <FileDown className="h-3.5 w-3.5 text-stone-500" aria-hidden />
                        <span className="font-mono text-[11px]">{v.fileName}</span>
                        {v.fileSize ? ` · ${mb(v.fileSize)}` : ''}
                      </p>
                      {v.sha256 && (
                        <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          SHA-256 verificado: <span className="font-mono">{v.sha256.slice(0, 16)}…</span>
                        </p>
                      )}
                      <a
                        href={`/api/updates/download/${v.version}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
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
          <Card className="shadow-sm border-stone-200">
            <CollapsibleTrigger className="w-full text-left">
              <CardHeader className="py-3 px-4 sm:px-5">
                <CardTitle className="text-sm text-stone-700 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-stone-400" aria-hidden />
                    Versiones anteriores ({archivo.length})
                    <span className="text-stone-400 font-normal">
                      · de la v{archivo[archivo.length - 1].version} a la v{archivo[0].version}
                    </span>
                  </span>
                  <Badge variant="secondary">Archivo</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                <p className="text-xs text-stone-500 mb-2">
                  Historial completo antes de la v{VISIBLE_DESDE}. Instaladores antiguos disponibles
                  en GitHub; tu software nunca necesita reinstalarlas.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {archivo.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-baseline gap-2 border-b border-stone-100 py-1.5 text-sm"
                    >
                      <span className="font-mono text-xs text-stone-700 shrink-0">v{v.version}</span>
                      <span className="text-xs text-stone-500 truncate flex-1">{codename(v.titulo)}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">
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
        <Card className="shadow-sm border-stone-200">
          <CollapsibleTrigger className="w-full text-left">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-stone-700 flex items-center justify-between">
                ¿Tengo que hacer algo cuando sale una versión nueva?
                <Badge variant="secondary">No</Badge>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 text-sm text-stone-600">
              <p>
                No. Tu software revisa la Central cada 15 minutos mientras está abierto (y cada 6
                horas también). Cuando publico una versión nueva aquí, tu equipo la descarga, la
                verifica e instala solo, normalmente en menos de 15 minutos.
              </p>
              <p className="mt-2 text-stone-500">
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
