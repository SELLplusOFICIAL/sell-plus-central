'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw,
  PackageCheck,
  ShieldCheck,
  FileDown,
  ChevronDown,
  Archive,
  Clock,
  Smartphone,
  Download,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VersionItem, fechaCorta, mb } from '@/lib/types'
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
        className="-mx-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-cyan-300/90 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${notas !== null ? 'rotate-180' : ''}`}
          aria-hidden
        />
        {cargando ? 'Buscando notas…' : notas !== null ? 'Ocultar notas completas' : 'Ver notas completas'}
      </button>
      {notas !== null && (
        <ul className="sp-scroll mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
          {notas.split('\n').filter(Boolean).map((linea, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-300">
              <span className="mt-0.5 text-cyan-400/80" aria-hidden>•</span>
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
    <Card className="sp-hover-lift">
      <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400/25 to-blue-500/25">
          <Smartphone className="h-5 w-5 text-cyan-300" aria-hidden />
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
            CipherPoint Móvil <span className="text-slate-400">v{apk.version}</span>
            <Badge className="border border-cyan-300/25 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20">
              Actualizable desde la Central
            </Badge>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            La app Android de la tienda. Se instala aparte de la versión de PC y recibe sus
            actualizaciones desde aquí: instala la nueva encima, sin desinstalar.
          </p>
        </div>
        <a
          href="/api/apk/download"
          className="sp-btn-grad inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-[0.97]"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
          Descargar APK
        </a>
      </CardContent>
      {(apk.fileSize || apk.sha256 || (apk.notas && apk.notas.length > 0)) && (
        <CardContent className="px-4 pb-3.5 pt-0 sm:px-5">
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className="-mx-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`}
              aria-hidden
            />
            {abierto ? 'Ocultar detalles' : 'Detalles del APK'}
          </button>
          {abierto && (
            <div className="mt-1.5 space-y-1.5">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono text-[11px] text-slate-300">{apk.fileName}</span>
                {apk.fileSize ? ` · ${mb(apk.fileSize)}` : ''}
                {apk.fecha ? ` · ${apk.fecha}` : ''}
              </p>
              {apk.sha256 && (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                  SHA-256 verificado: <span className="font-mono">{apk.sha256.slice(0, 16)}…</span>
                </p>
              )}
              {apk.notas?.map((n, i) => (
                <p key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="mt-0.5 shrink-0 text-cyan-400/80" aria-hidden>•</span>
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

/** Fila compacta de una versión del historial: se expande con un clic. */
function FilaHistorial({ v }: { v: VersionItem }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <li className="border-b border-white/[0.06] last:border-0">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className="shrink-0 font-mono text-xs font-semibold text-slate-200">v{v.version}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{etiqueta(v.titulo)}</span>
        <span className="hidden shrink-0 items-center gap-1 text-[10px] text-slate-600 sm:flex">
          <Clock className="h-3 w-3" aria-hidden />
          {fechaCorta(v.fecha)}
        </span>
      </button>
      {abierto && (
        <div className="px-2 pb-3 pl-9 pr-3">
          <p className="text-xs leading-relaxed text-slate-300">{v.resumen}</p>
          <NotasCompletas version={v.version} />
        </div>
      )}
    </li>
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
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    )
  }

  /* Solo la versión oficial se despliega completa; todo lo demás queda plegado. */
  const oficial = versiones.find((v) => v.version === ultima) ?? versiones[0] ?? null
  const demas = versiones.filter((v) => v.id !== oficial?.id)

  return (
    <div className="space-y-4">
      {/* Encabezado de sección */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Actualizaciones</h2>
          <p className="text-xs text-slate-400">
            La versión oficial se instala sola y conserva tu base de datos.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
          aria-label="Actualizar lista"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>

      {/* Versión oficial — la única tarjeta desplegada */}
      {oficial && (
        <div className="sp-story rounded-[18px] p-[1.5px]">
          <Card className="border-0 bg-[#0a0e17] shadow-none">
            <CardContent className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-2xl font-bold tracking-tight text-white">
                  v{oficial.version}
                </span>
                <span className="text-sm font-semibold text-cyan-300">«{etiqueta(oficial.titulo)}»</span>
                <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/15">
                  <PackageCheck className="h-3 w-3" aria-hidden />
                  Oficial
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" aria-hidden />
                  {fechaCorta(oficial.fecha)}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{oficial.resumen}</p>

              {oficial.fileName && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <a
                    href={`/api/updates/download/${oficial.version}`}
                    className="sp-btn-grad inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform active:scale-[0.97]"
                  >
                    <FileDown className="h-4 w-4" aria-hidden />
                    Descargar instalador
                  </a>
                  <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-400">
                    <span className="font-mono">{mb(oficial.fileSize ?? 0)}</span>
                    {oficial.sha256 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        <span className="font-mono">{oficial.sha256.slice(0, 12)}…</span>
                      </>
                    )}
                  </span>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Tu software la descarga, verifica e instala solo; aquí siempre está disponible.
              </p>
              <div className="mt-2">
                <NotasCompletas version={oficial.version} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* App móvil (APK) */}
      <TarjetaApk />

      {/* Kit para otras PCs */}
      <Card className="sp-hover-lift">
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-400/25 to-violet-500/25">
            <Download className="h-5 w-5 text-indigo-300" aria-hidden />
          </div>
          <div className="min-w-[220px] flex-1">
            <p className="text-sm font-semibold text-slate-100">¿Instalando en otra computadora?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Kit de configuración: apunta tu Sell-Plus a esta Central en un clic.
            </p>
          </div>
          <a
            href="/Sell-Plus-Kit-Clientes.zip"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.11] hover:text-white"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden />
            Kit para PC
          </a>
        </CardContent>
      </Card>

      {/* Historial de versiones — compacto y plegado por defecto */}
      {demas.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full text-left">
              <CardContent className="flex items-center justify-between gap-2 px-5 py-3.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Archive className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="truncate text-sm font-semibold text-slate-200">
                    Historial de versiones
                    <span className="ml-1.5 text-xs font-normal text-slate-500">
                      ({demas.length} · de v{demas[demas.length - 1].version} a v{demas[0].version})
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="border border-white/10 bg-white/[0.06] text-slate-300">
                    Historial
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
                </span>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 sm:px-5">
                <p className="mb-1 px-2 text-[11px] text-slate-500">
                  Una línea por versión; tócala para ver su resumen y notas. Nada de esto necesita
                  instalarse: son solo el historial de cambios.
                </p>
                <ul>
                  {demas.map((v) => (
                    <FilaHistorial key={v.id} v={v} />
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Comparador: qué cambia entre una versión y otra, por área */}
      {versiones.length >= 2 && <ComparadorVersiones versiones={versiones} />}

      {/* FAQ — plegada */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full text-left">
            <CardContent className="flex items-center justify-between gap-2 px-5 py-3.5">
              <span className="text-sm font-semibold text-slate-200">
                ¿Tengo que hacer algo cuando sale una versión nueva?
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge className="border border-emerald-300/25 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20">
                  No
                </Badge>
                <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
              </span>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-5 pb-5 pt-0 text-sm leading-relaxed text-slate-300">
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
