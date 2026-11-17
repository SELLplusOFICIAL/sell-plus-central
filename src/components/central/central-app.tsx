'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Store,
  RefreshCw,
  MonitorCheck,
  Monitor,
  MessageSquarePlus,
  Wrench,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
      {/* Encabezado chrome */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1220]/85 shadow-[0_8px_30px_rgba(2,8,20,0.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="sp-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700">
            <Store className="h-6 w-6 text-white drop-shadow" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="sp-chrome-text text-lg font-bold leading-tight tracking-tight sm:text-xl">
              Sell-Plus Central
            </h1>
            <p className="text-xs leading-tight text-slate-400 sm:text-sm">
              {esAdmin
                ? 'Centro de actualizaciones y modificaciones · modo administrador'
                : 'Actualizaciones, soluciones y descargas de tu software'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className="border border-cyan-300/40 bg-cyan-400/15 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.25)] hover:bg-cyan-400/25">
              v{resumen?.ultimaVersion?.version ?? '…'}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              En línea
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {esAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(URL_ASISTENTE_IA, '_blank', 'noopener')}
                title="Poder de IA — hablar con el asistente que desarrolla tu software"
                className="text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">IA</span>
              </Button>
            )}
            {esAdmin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={salirDeAdmin}
                className="border-cyan-400/40 bg-transparent text-cyan-100 hover:bg-cyan-400/10 hover:text-white"
              >
                <ShieldCheck className="mr-1 h-4 w-4" aria-hidden /> Salir de admin
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={entrarComoAdmin}
                className="border-cyan-400/40 bg-transparent text-cyan-100 hover:bg-cyan-400/10 hover:text-white"
              >
                <Lock className="mr-1 h-4 w-4" aria-hidden /> Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-5 sm:px-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <div className="-mx-3 overflow-x-auto pb-1 sm:mx-0">
            <TabsList className="sp-glass inline-flex h-11 min-w-full rounded-full p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:w-auto">
              {tabsVisibles.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="gap-1.5 rounded-full px-3 text-slate-300 transition-all hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(34,211,238,0.35)] sm:px-4"
                >
                  {t.icon}
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TABS.map((t) => {
            if (t.soloAdmin && !esAdmin) return null // sección de administración: no se monta sin llave
            return (
              <TabsContent key={t.key} value={t.key} className="mt-4">
                {contenidoTab(t)}
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="mt-6 text-center text-xs text-slate-500">
          Dirección estable de tu software:{' '}
          <span className="select-all font-mono text-slate-400">{urlCentral || CENTRAL_URL}</span>
        </div>
      </main>

      {/* Pie chrome */}
      <footer className="mt-auto border-t border-white/10 bg-[#0a1220]/80 text-xs text-slate-400 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-4 py-3 sm:flex-row">
          <span>Sell-Plus Central · Tu software, siempre al día</span>
          <span>Tu base de datos nunca se borra al actualizar</span>
        </div>
      </footer>
    </div>
  )
}
