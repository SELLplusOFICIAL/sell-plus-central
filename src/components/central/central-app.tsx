'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Store,
  RefreshCw,
  MonitorCheck,
  MessageSquarePlus,
  Wrench,
  GraduationCap,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import InicioTab from '@/components/central/inicio-tab'
import ActualizacionesTab from '@/components/central/actualizaciones-tab'
import SolicitudesTab from '@/components/central/solicitudes-tab'
import DiagnosticoTab from '@/components/central/diagnostico-tab'
import AprendeTab from '@/components/central/aprende-tab'
import { ResumenData, CENTRAL_URL, centralUrlActual } from '@/lib/types'
import { toast } from 'sonner'

export type TabKey = 'inicio' | 'actualizaciones' | 'solicitudes' | 'diagnostico' | 'aprende'

type TabDef = {
  key: TabKey
  label: string
  icon: ReactNode
  soloAdmin: boolean
}

const TABS: TabDef[] = [
  { key: 'inicio', label: 'Inicio', icon: <MonitorCheck className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'actualizaciones', label: 'Actualizaciones', icon: <RefreshCw className="h-4 w-4" aria-hidden />, soloAdmin: false },
  { key: 'solicitudes', label: 'Solicitudes', icon: <MessageSquarePlus className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'diagnostico', label: 'Diagnóstico', icon: <Wrench className="h-4 w-4" aria-hidden />, soloAdmin: true },
  { key: 'aprende', label: 'Aprende', icon: <GraduationCap className="h-4 w-4" aria-hidden />, soloAdmin: false },
]

const CLAVE_ADMIN_LS = 'central-admin-key'

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
    return <AprendeTab />
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      {/* Encabezado */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-600/50 bg-emerald-700/60">
            <Store className="h-6 w-6 text-emerald-200" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">
              Sell-Plus Central
            </h1>
            <p className="text-xs leading-tight text-emerald-200/90 sm:text-sm">
              {esAdmin
                ? 'Centro de actualizaciones y modificaciones · modo administrador'
                : 'Actualizaciones, soluciones y descargas de tu software'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className="border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30">
              v{resumen?.ultimaVersion?.version ?? '…'}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-200/90">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              En línea
            </span>
          </div>
          <div className="shrink-0">
            {esAdmin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={salirDeAdmin}
                className="border-emerald-400/50 bg-transparent text-emerald-100 hover:bg-emerald-800 hover:text-white"
              >
                <ShieldCheck className="mr-1 h-4 w-4" aria-hidden /> Salir de admin
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={entrarComoAdmin}
                className="border-emerald-400/50 bg-transparent text-emerald-100 hover:bg-emerald-800 hover:text-white"
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
            <TabsList className="inline-flex h-11 min-w-full border border-stone-200 bg-white shadow-sm sm:w-auto">
              {tabsVisibles.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="gap-1.5 px-3 data-[state=active]:bg-emerald-900 data-[state=active]:text-white sm:px-4"
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

        <div className="mt-6 text-center text-xs text-stone-400">
          Dirección estable de tu software:{' '}
          <span className="select-all font-mono">{urlCentral || CENTRAL_URL}</span>
        </div>
      </main>

      {/* Pie pegado abajo */}
      <footer className="mt-auto bg-emerald-950 text-xs text-emerald-200/80">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-4 py-3 sm:flex-row">
          <span>Sell-Plus Central · Tu software, siempre al día</span>
          <span>Tu base de datos nunca se borra al actualizar</span>
        </div>
      </footer>
    </div>
  )
}
