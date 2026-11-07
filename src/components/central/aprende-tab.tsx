'use client'

import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, BookOpen, FileText, PlayCircle, Clock3, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TutorialItem } from '@/lib/types'
import { toast } from 'sonner'

function IconoTipo({ tipo }: { tipo: string }) {
  if (tipo === 'pdf') return <FileText className="h-6 w-6 text-emerald-700" aria-hidden />
  if (tipo === 'video') return <PlayCircle className="h-6 w-6 text-emerald-700" aria-hidden />
  return <BookOpen className="h-6 w-6 text-emerald-700" aria-hidden />
}

function EtiquetaAccion({ tipo }: { tipo: string }) {
  if (tipo === 'pdf') return 'Abrir PDF'
  if (tipo === 'video') return 'Ver video'
  return 'Leer guía'
}

export default function AprendeTab() {
  const [tutoriales, setTutoriales] = useState<TutorialItem[] | null>(null)
  const [abierto, setAbierto] = useState<TutorialItem | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/tutoriales', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTutoriales(data.tutoriales)
      }
    } catch {
      toast.error('No se pudieron cargar las guías')
    }
  }, [])

  useEffect(() => {
    const primera = setTimeout(cargar, 0)
    return () => clearTimeout(primera)
  }, [cargar])

  const abrir = (t: TutorialItem) => {
    if (t.tipo === 'pdf') {
      if (t.id) window.open(`/api/tutoriales/${t.id}/file`, '_blank')
      return
    }
    if (t.tipo === 'video' && t.url) {
      window.open(t.url, '_blank')
      return
    }
    setAbierto(t)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-emerald-700" aria-hidden />
          Aprende
        </h2>
        <p className="text-xs text-stone-500">
          Guías cortas en español, sin tecnicismos. Cada vez que tu software estrene algo, aquí
          encontrarás cómo sacarle provecho.
        </p>
      </div>

      {tutoriales === null ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {tutoriales.map((t) => (
            <Card
              key={t.id}
              className="shadow-sm border-stone-200 hover:border-emerald-300 hover:shadow transition-all"
            >
              <CardContent className="p-4 h-full flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <IconoTipo tipo={t.tipo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-800 leading-snug break-words">
                      {t.titulo}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{t.descripcion}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                    <Clock3 className="h-3 w-3" aria-hidden />
                    {t.minutos ? `${t.minutos} min de lectura` : t.tipo}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrir(t)}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    {EtiquetaAccion(t.tipo)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="shadow-sm border-dashed border-stone-300 bg-stone-50/60">
        <CardContent className="p-4 text-xs text-stone-500">
          <Badge variant="secondary" className="mb-1.5">Nota</Badge>
          <p>
            El <strong>Manual del Dueño</strong> (PDF de 10 capítulos) te lo entregué en el kit de
            instalación; si quieres que también viva aquí, pídelo en Solicitudes y lo publico en
            esta pestaña.
          </p>
        </CardContent>
      </Card>

      {/* Diálogo de lectura */}
      <Dialog open={abierto !== null} onOpenChange={(o) => !o && setAbierto(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base text-stone-800 pr-6 flex items-start gap-2">
              <BookOpen className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
              {abierto?.titulo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[65vh] pr-3">
            <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
              {abierto?.contenido}
            </p>
          </ScrollArea>
          <div className="pt-2 border-t border-stone-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setAbierto(null)} className="border-stone-300">
              <X className="h-3.5 w-3.5 mr-1" aria-hidden />
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
