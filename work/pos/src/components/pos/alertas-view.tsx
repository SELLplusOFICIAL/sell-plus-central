'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CalendarClock, PackageX, History } from 'lucide-react'

interface Resumen {
  stockBajo: { id: string; nombre: string; stock: number; minimo: number }[]
  porCaducar: { id: string; nombre: string; unidades: number; dias: number; caducidad: string }[]
  vencidos: { id: string; nombre: string; unidades: number; caducidad: string }[]
}

interface Movimiento {
  id: string
  tipo: string
  cantidad: number
  motivo: string
  usuario: string
  createdAt: string
  producto: { nombre: string }
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function AlertasView() {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [movs, setMovs] = useState<Movimiento[]>([])

  useEffect(() => {
    const t0 = setTimeout(() => {
      fetch('/api/inventario/resumen').then((r) => r.json()).then((d) => setResumen(d)).catch(() => {})
      fetch('/api/movimientos').then((r) => r.json()).then((d) => setMovs(d.movimientos || [])).catch(() => {})
    }, 0)
    return () => clearTimeout(t0)
  }, [])

  const colorTipo = (t: string) =>
    t === 'venta' ? 'bg-emerald-100 text-emerald-700' : t === 'entrada' ? 'bg-sky-100 text-sky-700' : t === 'merma' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Stock bajo
          </h3>
          {resumen?.stockBajo?.length ? (
            <div className="space-y-2">
              {resumen.stockBajo.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{s.nombre}</span>
                  <Badge className="bg-amber-100 text-amber-800">Quedan {s.stock} · mínimo {s.minimo}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nada por reabastecer por ahora. ¡Bien!</p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <CalendarClock className="h-5 w-5 text-amber-600" /> Por caducar (30 días)
          </h3>
          {resumen?.porCaducar?.length ? (
            <div className="space-y-2">
              {resumen.porCaducar.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>
                    {s.nombre} · {s.unidades} u.
                  </span>
                  <Badge className="bg-amber-100 text-amber-800">Vence en {s.dias} días</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ningún lote próximo a caducar. ¡Bien!</p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <PackageX className="h-5 w-5 text-red-600" /> Vencidos — retirar del estante
          </h3>
          {resumen?.vencidos?.length ? (
            <div className="space-y-2">
              {resumen.vencidos.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>
                    {s.nombre} · {s.unidades} u.
                  </span>
                  <Badge className="bg-red-100 text-red-700">Venció {fecha(s.caducidad)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay producto vencido en inventario. ¡Perfecto!</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 h-fit">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-emerald-600" /> Bitácora de inventario
        </h3>
        {movs.length ? (
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {movs.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    <b>{m.producto?.nombre}</b> · {m.cantidad} u.
                    {m.motivo ? ` — ${m.motivo}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fechaHora(m.createdAt)}{m.usuario ? ` · ${m.usuario}` : ''}
                  </p>
                </div>
                <Badge className={`text-[10px] capitalize shrink-0 ${colorTipo(m.tipo)}`}>{m.tipo}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aquí verás entradas, ventas, mermas y ajustes de tu inventario.</p>
        )}
      </div>
    </div>
  )
}
