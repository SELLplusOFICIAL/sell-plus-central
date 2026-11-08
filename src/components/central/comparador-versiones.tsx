'use client'

import { useMemo, useState } from 'react'
import {
  GitCompareArrows,
  Plus,
  Wrench,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VersionItem, fechaCorta } from '@/lib/types'
import { AREAS, NOMBRE_AREA, clasificarArea, huella, parseNotas } from '@/lib/areas'

type Grupo = {
  anade: string[]
  ajusta: string[]
  retirada: string[]
}

type Analisis = {
  totalAnade: number
  totalAjusta: number
  totalRetirada: number
  grupos: { area: string; grupo: Grupo }[]
}

const ORDEN_AREAS = [...AREAS.map((a) => a.id), 'otros']

export default function ComparadorVersiones({ versiones }: { versiones: VersionItem[] }) {
  const ordenadas = useMemo(
    () => [...versiones].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)),
    [versiones],
  )
  const [antSel, setAntSel] = useState<string | null>(null)
  const [nuevaSel, setNuevaSel] = useState<string | null>(null)

  const anterior = antSel ?? ordenadas[1]?.version ?? ''
  const nueva = nuevaSel ?? ordenadas[0]?.version ?? ''

  const analisis = useMemo<Analisis | null>(() => {
    if (!anterior || !nueva || anterior === nueva) return null
    const vA = ordenadas.find((v) => v.version === anterior)
    const vN = ordenadas.find((v) => v.version === nueva)
    if (!vA || !vN) return null
    const nA = parseNotas(vA.notas)
    const nN = parseNotas(vN.notas)

    const mapa = new Map<string, Grupo>()
    const push = (area: string, campo: keyof Grupo, linea: string) => {
      const g = mapa.get(area) ?? { anade: [], ajusta: [], retirada: [] }
      g[campo].push(linea)
      mapa.set(area, g)
    }
    nN.seAnade.forEach((l) => push(clasificarArea(l), 'anade', l))
    nN.seAjusta.forEach((l) => push(clasificarArea(l), 'ajusta', l))

    const presentes = new Set([...nN.seAnade, ...nN.seConserva, ...nN.seAjusta].map(huella))
    ;[...nA.seAnade, ...nA.seConserva]
      .filter((l) => !presentes.has(huella(l)))
      .forEach((l) => push(clasificarArea(l), 'retirada', l))

    const grupos = ORDEN_AREAS.filter((a) => mapa.has(a)).map((area) => ({
      area,
      grupo: mapa.get(area)!,
    }))
    return {
      totalAnade: nN.seAnade.length,
      totalAjusta: nN.seAjusta.length,
      totalRetirada: grupos.reduce((n, g) => n + g.grupo.retirada.length, 0),
      grupos,
    }
  }, [anterior, nueva, ordenadas])

  return (
    <Card className="shadow-sm border-stone-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-stone-800">
          <GitCompareArrows className="h-5 w-5 text-emerald-700" aria-hidden />
          Comparar versiones
        </CardTitle>
        <p className="text-xs text-stone-500">
          Qué cambia entre una versión y otra, organizado por área: novedades, correcciones y
          líneas que ya no aparecen (para ubicar ajustes en zonas específicas del software).
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={anterior} onValueChange={setAntSel}>
            <SelectTrigger aria-label="Versión anterior" className="border-stone-300 focus:ring-emerald-700">
              <SelectValue placeholder="Versión anterior" />
            </SelectTrigger>
            <SelectContent>
              {ordenadas.map((v) => (
                <SelectItem key={v.id} value={v.version}>
                  v{v.version} · {fechaCorta(v.fecha)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ArrowRight className="h-4 w-4 text-stone-400 rotate-90 sm:rotate-0 self-center shrink-0" aria-hidden />
          <Select value={nueva} onValueChange={setNuevaSel}>
            <SelectTrigger aria-label="Versión nueva" className="border-stone-300 focus:ring-emerald-700">
              <SelectValue placeholder="Versión nueva" />
            </SelectTrigger>
            <SelectContent>
              {ordenadas.map((v) => (
                <SelectItem key={v.id} value={v.version}>
                  v{v.version} · {fechaCorta(v.fecha)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {analisis === null ? (
          <p className="mt-3 text-sm text-stone-500">
            Elige dos versiones distintas para ver la comparación.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-100">
                <Plus className="h-3 w-3 mr-1" aria-hidden />
                {analisis.totalAnade} novedades
              </Badge>
              <Badge className="bg-sky-100 text-sky-900 border-sky-200 hover:bg-sky-100">
                <Wrench className="h-3 w-3 mr-1" aria-hidden />
                {analisis.totalAjusta} correcciones
              </Badge>
              <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3 mr-1" aria-hidden />
                {analisis.totalRetirada} por revisar
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {analisis.grupos.map(({ area, grupo }) => (
                <div key={area} className="rounded-lg border border-stone-200 overflow-hidden">
                  <div className="bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
                    {NOMBRE_AREA[area] ?? area}
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {grupo.anade.map((l, i) => (
                      <li key={`a${i}`} className="px-3 py-2 text-sm text-stone-700 flex gap-2">
                        <Plus className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" aria-hidden />
                        <span>{l}</span>
                      </li>
                    ))}
                    {grupo.ajusta.map((l, i) => (
                      <li key={`j${i}`} className="px-3 py-2 text-sm text-stone-700 flex gap-2">
                        <Wrench className="h-3.5 w-3.5 mt-0.5 text-sky-600 shrink-0" aria-hidden />
                        <span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 mr-1">
                            Corrección:
                          </span>
                          {l}
                        </span>
                      </li>
                    ))}
                    {grupo.retirada.map((l, i) => (
                      <li key={`r${i}`} className="px-3 py-2 text-sm text-stone-600 flex gap-2 bg-amber-50/50">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" aria-hidden />
                        <span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mr-1">
                            No aparece en la nueva:
                          </span>
                          {l}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-stone-400">
              Las versiones son acumulativas y el Paladín verifica que nada se pierda en cada
              publicación: si una línea «no aparece», casi siempre es porque se reescribió con
              otras palabras.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
