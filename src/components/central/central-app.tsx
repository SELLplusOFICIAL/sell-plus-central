'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  RefreshCw,
  MonitorCheck,
  Monitor,
  MessageSquarePlus,
  Wrench,
  GraduationCap,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import InicioTab from '@/components/central/inicio-tab'
import ActualizacionesTab from '@/components/central/actualizaciones-tab'
import SolicitudesTab from '@/components/central/solicitudes-tab'
import DiagnosticoTab from '@/components/central/diagnostico-tab'
import AprendeTab from '@/components/central/aprende-tab'
import { PanelTab } from '@/components/central/panel-tab'
import AccesoTab from '@/components/central/acceso-tab'
import { ResumenData, CENTRAL_URL, centralUrlActual } from '@/lib/types'
import { toast } from 'sonner'

export type TabKey = 'inicio' | 'actualizaciones' | 'solicitudes' | 'diagnostico' | 'equipos' | 'acceso' | 'aprende'

type TabDef = {
  key: TabKey
  label: string
  icon: ReactNode
  soloAdmin: boolean
}

/* Secciones reacomodadas: lo del día primero, el material de estudio al final. */
const TABS: TabDef[] = [
  { key: 'inicio', label: 'Inicio', icon: <MonitorCheck className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'actualizaciones', label: 'Actualizaciones', icon: <RefreshCw className="h-4 w-4" aria-hidden />, soloAdmin: false },
  { key: 'solicitudes', label: 'Solicitudes', icon: <MessageSquarePlus className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'diagnostico', label: 'Diagnóstico', icon: <Wrench className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'equipos', label: 'Equipos', icon: <Monitor className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'acceso', label: 'Acceso maestro', icon: <KeyRound className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'aprende', label: 'Aprende', icon: <GraduationCap className="h-4 w-4" aria-hidden />, soloAdmin: false },
]

const CLAVE_ADMIN_LS = 'central-admin-key'
const URL_ASISTENTE_IA = 'https://chat.z.ai'

export default function CentralApp() {
  const [tab, setTab] = useState<TabKey>('actualizaciones')
  const [resumen, setResumen] = useState<ResumenData | null>(null)
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [urlCentral, setUrlCentral] = useState<string>('')

  const cargarResumen = useCallback(async () => {
    try {
      const res = await fetch('/api/resumen', { cache: 'no-store' })
      if (res.ok) setResumen(await res.json())
    } catch {
      /* silencioso */
    }
  }, [])

  useEffect(() => {
    const primera = setTimeout(cargarResumen, 0)
    const t = setInterval(cargarResumen, 60_000)
    return () => {
      clearTimeout(primera)
      clearInterval(t)
    }
  }, [cargarResumen])

  // Modo administrador guardado en este navegador + pestaña inicial por hash (#actualizaciones)
  useEffect(() => {
    setUrlCentral(centralUrlActual())
    const guardada = window.localStorage.getItem(CLAVE_ADMIN_LS)
    if (guardada) {
      setAdminKey(guardada)
      setTab('inicio')
    } else {
      const hash = window.location.hash.replace('#', '') as TabKey
      const valido = TABS.find((t) => t.key === hash && !t.soloAdmin)
      if (valido) setTab(hash)
    }
  }, [])

  const entrarComoAdmin = () => {
    const llave = window.prompt('Llave de administrador de la Central:')
    if (!llave) return
    window.localStorage.setItem(CLAVE_ADMIN_LS, llave)
    setAdminKey(llave)
    setTab('inicio')
    toast.success('Modo administrador activado')
  }

  const salirDeAdmin = () => {
    window.localStorage.removeItem(CLAVE_ADMIN_LS)
    setAdminKey(null)
    setTab('actualizaciones')
  }

  const esAdmin = adminKey !== null
  const tabsVisibles = TABS.filter((t) => esAdmin || !t.soloAdmin)

  const contenidoTab = (t: TabDef) => {
    if (t.key === 'inicio') return <InicioTab resumen={resumen} recargar={cargarResumen} irA={(k) => setTab(k)} />
    if (t.key === 'actualizaciones') return <ActualizacionesTab />
    if (t.key === 'solicitudes') return <SolicitudesTab recargarResumen={cargarResumen} />
    if (t.key === 'diagnostico') return <DiagnosticoTab resumen={resumen} />
    if (t.key === 'equipos') return <PanelTab refreshKey={0} />
    if (t.key === 'acceso') return <AccesoTab />
    return <AprendeTab />
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Encabezado fino, always-on-top, vidrio oscuro */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05060b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          {/* Logo con aro degradado */}
          <div className="sp-story flex shrink-0 rounded-[14px] p-[1.5px]">
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12.5px] bg-[#0a0e17]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                <defs>
                  <linearGradient id="sp-logo-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="55%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                  fill="none"
                  stroke="url(#sp-logo-g)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M9.2 12.4v3.4h5.6v-3.4" fill="none" stroke="url(#sp-logo-g)" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M7.8 10.2h8.4" stroke="url(#sp-logo-g)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="sp-chrome-text truncate text-[17px] font-bold leading-tight tracking-tight">
              Sell-Plus Central
            </h1>
            <p className="truncate text-xs leading-tight text-slate-400">
              {esAdmin
                ? 'Modo administrador · centro de control'
                : 'Tu software, siempre al día'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300 sm:flex">
              <span className="sp-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              En línea
            </span>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-200">
              v{resumen?.ultimaVersion?.version ?? '—'}
            </span>
            {esAdmin && (
              <button
                type="button"
                onClick={() => window.open(URL_ASISTENTE_IA, '_blank', 'noopener')}
                title="Poder de IA — hablar con el asistente que desarrolla tu software"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
              </button>
            )}
            {esAdmin ? (
              <button
                type="button"
                onClick={salirDeAdmin}
                className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Salir</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={entrarComoAdmin}
                className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Admin
              </button>
            )}
          </div>
        </div>

        {/* Navegación segmentada, pegada al encabezado */}
        <div className="border-t border-white/[0.04]">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <div className="mx-auto max-w-5xl px-4">
              <div className="-mx-1 overflow-x-auto sp-scroll pb-0">
                <TabsList className="sp-glass mt-2 inline-flex h-10 min-w-full gap-0.5 rounded-full p-1 sm:min-w-0">
                  {tabsVisibles.map((t) => (
                    <TabsTrigger
                      key={t.key}
                      value={t.key}
                      className="gap-1.5 rounded-full px-3 text-[13px] font-medium text-slate-400 transition-all hover:text-slate-100 data-[state=active]:bg-[linear-gradient(135deg,#06b6d4,#3b82f6)] data-[state=active]:text-white data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_14px_-4px_rgba(59,130,246,0.6)] sm:px-3.5"
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </Tabs>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          {TABS.map((t) => {
            if (t.soloAdmin && !esAdmin) return null // sección de administración: no se monta sin llave
            return (
              <TabsContent key={t.key} value={t.key} className="sp-rise mt-2">
                {contenidoTab(t)}
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="mt-10 text-center text-[11px] text-slate-600">
          Dirección estable de tu software:{' '}
          <span className="select-all font-mono text-slate-500">{urlCentral || CENTRAL_URL}</span>
        </div>
      </main>

      {/* Pie mínimo */}
      <footer className="mt-auto border-t border-white/[0.06] bg-[#05060b]/80">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-4 py-4 text-[11px] text-slate-500 sm:flex-row">
          <span className="sp-chrome-text font-semibold">Sell-Plus Central</span>
          <span>Tu base de datos nunca se borra al actualizar</span>
        </div>
      </footer>
    </div>
  )
}
