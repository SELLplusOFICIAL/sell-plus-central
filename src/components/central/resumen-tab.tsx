'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, CheckCircle2, Clock, AlertTriangle, Package, Users, Activity, GraduationCap } from 'lucide-react'

interface Resumen {
  versionPublicada: { version: string; nombre: string; notas: string; fileName: string; fileSize: number; sha256: string; createdAt: string } | null
  cajasActivas: { version: string; hostname: string; ultimo: string }[]
  totalLatidos24h: number
  descargasRecientes: { id: string; tipo: string; ref: string; createdAt: string }[]
  tutoriales: number
}

function haceCuanto(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const min = Math.floor(d / 60000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} días`
}

export function ResumenTab() {
  const [datos, setDatos] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = () => {
    setCargando(true)
    fetch('/api/resumen')
      .then((r) => r.json())
      .then(setDatos)
      .catch(() => {})
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    const t0 = setTimeout(cargar, 0)
    const t = setInterval(cargar, 60000)
    return () => {
      clearTimeout(t0)
      clearInterval(t)
    }
  }, [])

  const hayCajasRecientes = datos?.cajasActivas?.some((c) => Date.now() - new Date(c.ultimo).getTime() < 45 * 60 * 1000)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4" /> Última versión publicada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datos?.versionPublicada ? (
              <>
                <div className="text-2xl font-bold text-emerald-700">v{datos.versionPublicada.version}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{datos.versionPublicada.nombre}</p>
              </>
            ) : (
              <div className="text-lg font-semibold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Cajas conectadas (24 h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datos?.cajasActivas?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{datos?.totalLatidos24h ?? 0} latidos recibidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Descargas (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datos?.descargasRecientes?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">instaladores y tutoriales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Tutoriales publicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datos?.tutoriales ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">en la pestaña Aprende</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Estado de tu caja
              <Button size="sm" variant="ghost" onClick={cargar} disabled={cargando}>
                <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datos && datos.cajasActivas.length > 0 ? (
              <div className="space-y-2">
                {datos.cajasActivas.map((c, i) => {
                  const activa = Date.now() - new Date(c.ultimo).getTime() < 45 * 60 * 1000
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        {activa ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{c.hostname || 'Caja'}</p>
                          <p className="text-xs text-muted-foreground">
                            Sell-Plus v{c.version || '?'} · última conexión {haceCuanto(c.ultimo)}
                          </p>
                        </div>
                      </div>
                      <Badge className={activa ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                        {activa ? 'Conectada' : 'Sin conexión reciente'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Aún no hay señales de tu caja instalada.
                </p>
                <p className="text-xs">
                  Cuando abras Sell-Plus en tu computadora, se conectará aquí automáticamente cada 15 minutos.
                </p>
              </div>
            )}
            {hayCajasRecientes && (
              <p className="text-xs text-emerald-700 mt-3 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Todo funcionando — el software reporta su estado con normalidad.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {datos && datos.descargasRecientes.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {datos.descargasRecientes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium capitalize">{d.tipo}</span>
                      {d.ref && <span className="text-muted-foreground"> · {d.ref}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{haceCuanto(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividad registrada todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

