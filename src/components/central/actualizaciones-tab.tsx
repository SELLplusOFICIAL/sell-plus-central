'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, PackageCheck, ShieldCheck, FileDown, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VersionItem, fechaCorta, mb } from '@/lib/types'
import { toast } from 'sonner'

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Versiones de tu software</h2>
          <p className="text-xs text-stone-500">
            Cada actualización se instala sola y conserva tu base de datos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando} className="border-stone-300 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${cargando ? 'animate-spin' : ''}`} aria-hidden />
          Actualizar
        </Button>
      </div>

      {versiones === null ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-emerald-200 ml-3">
          {versiones.map((v) => {
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
                  <CardHeader className="pb-2 px-4 sm:px-5 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base text-stone-900">v{v.version}</CardTitle>
                      {esUltima && (
                        <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white">
                          <PackageCheck className="h-3 w-3 mr-1" aria-hidden />
                          Última disponible
                        </Badge>
                      )}
                      {!esUltima && <Badge variant="secondary">Histórica</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-emerald-900">{v.titulo}</p>
                    <p className="text-[11px] text-stone-400">{fechaCorta(v.fecha)}</p>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                    <ul className="space-y-1 mb-3">
                      {v.notas.split('\n').filter(Boolean).map((linea, i) => (
                        <li key={i} className="text-sm text-stone-600 flex gap-2">
                          <span className="text-emerald-600 mt-0.5" aria-hidden>•</span>
                          <span>{linea.replace(/^•\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>

                    {v.fileName ? (
                      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1.5">
                        <p className="text-xs text-stone-600 flex items-center gap-1.5 flex-wrap">
                          <FileDown className="h-3.5 w-3.5 text-stone-500" aria-hidden />
                          Instalador: <span className="font-mono text-[11px]">{v.fileName}</span>
                          {v.fileSize ? ` · ${mb(v.fileSize)}` : ''}
                        </p>
                        {v.sha256 && (
                          <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                            SHA-256 verificado: <span className="font-mono">{v.sha256.slice(0, 16)}…</span>
                          </p>
                        )}
                        {esUltima && (
                          <a
                            href={`/api/updates/download/${v.version}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 underline underline-offset-2"
                          >
                            <FileDown className="h-3.5 w-3.5" aria-hidden />
                            Descargar instalador
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                        <p className="text-xs text-amber-800">
                          Esta versión se entregó mediante instalador directo (kit). No está alojada en
                          la Central; si necesitas reinstalarla, escríbeme y te la preparo.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ol>
      )}

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
