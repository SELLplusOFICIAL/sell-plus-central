'use client'

import { useCallback, useEffect, useState } from 'react'
import { Store, RefreshCw, MonitorCheck, Layers3, MessageSquarePlus, Wrench, GraduationCap } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import InicioTab from '@/components/central/inicio-tab'
import ActualizacionesTab from '@/components/central/actualizaciones-tab'
import SolicitudesTab from '@/components/central/solicitudes-tab'
import DiagnosticoTab from '@/components/central/diagnostico-tab'
import AprendeTab from '@/components/central/aprende-tab'
import { ResumenData, CENTRAL_URL } from '@/lib/types'

export type TabKey = 'inicio' | 'actualizaciones' | 'solicitudes' | 'diagnostico' | 'aprende'

export default function CentralApp() {
  const [tab, setTab] = useState<TabKey>('inicio')
  const [resumen, setResumen] = useState<ResumenData | null>(null)

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

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Encabezado */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-700/60 border border-emerald-600/50 flex items-center justify-center shrink-0">
            <Store className="h-6 w-6 text-emerald-200" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">
              Sell-Plus Central
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-tight">
              Centro de actualizaciones y modificaciones de tu software
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 hover:bg-emerald-500/30">
              v{resumen?.ultimaVersion?.version ?? '…'}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-200/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              En línea
            </span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <div className="-mx-3 sm:mx-0 overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-full sm:w-auto bg-white border border-stone-200 shadow-sm h-11">
              <TabsTrigger value="inicio" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                <MonitorCheck className="h-4 w-4" aria-hidden />
                <span>Inicio</span>
              </TabsTrigger>
              <TabsTrigger value="actualizaciones" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                <RefreshCw className="h-4 w-4" aria-hidden />
                <span>Actualizaciones</span>
              </TabsTrigger>
              <TabsTrigger value="solicitudes" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                <MessageSquarePlus className="h-4 w-4" aria-hidden />
                <span>Solicitudes</span>
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                <Wrench className="h-4 w-4" aria-hidden />
                <span>Diagnóstico</span>
              </TabsTrigger>
              <TabsTrigger value="aprende" className="gap-1.5 px-3 sm:px-4 data-[state=active]:bg-emerald-900 data-[state=active]:text-white">
                <GraduationCap className="h-4 w-4" aria-hidden />
                <span>Aprende</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inicio" className="mt-4">
            <InicioTab resumen={resumen} recargar={cargarResumen} irA={(t) => setTab(t)} />
          </TabsContent>
          <TabsContent value="actualizaciones" className="mt-4">
            <ActualizacionesTab />
          </TabsContent>
          <TabsContent value="solicitudes" className="mt-4">
            <SolicitudesTab recargarResumen={cargarResumen} />
          </TabsContent>
          <TabsContent value="diagnostico" className="mt-4">
            <DiagnosticoTab resumen={resumen} />
          </TabsContent>
          <TabsContent value="aprende" className="mt-4">
            <AprendeTab />
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-xs text-stone-400">
          Dirección estable de tu software:{' '}
          <span className="font-mono select-all">{CENTRAL_URL}</span>
        </div>
      </main>

      {/* Pie pegado abajo */}
      <footer className="mt-auto bg-emerald-950 text-emerald-200/80 text-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>Sell-Plus Central · Tu software, siempre al día</span>
          <span>Tu base de datos nunca se borra al actualizar</span>
        </div>
      </footer>
    </div>
  )
}
