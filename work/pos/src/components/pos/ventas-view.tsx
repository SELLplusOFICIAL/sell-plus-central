'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Banknote, CreditCard, CalendarDays } from 'lucide-react'

interface Venta {
  id: string
  total: number
  metodo: string
  recibido: number
  cambio: number
  createdAt: string
  usuario: { nombre: string }
  items: { nombre: string; cantidad: number; subtotal: number }[]
}

const fmt = (n: number) => `$${n.toFixed(2)}`

export function VentasView() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [total, setTotal] = useState(0)
  const [todas, setTodas] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = (t: boolean) => {
    setCargando(true)
    fetch(`/api/ventas${t ? '?todas=1' : ''}`)
      .then((r) => r.json())
      .then((d) => {
        setVentas(d.ventas || [])
        setTotal(d.total || 0)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    const t0 = setTimeout(() => cargar(todas), 0)
    return () => clearTimeout(t0)
  }, [todas])

  const fecha = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={!todas ? 'default' : 'outline'} className={!todas ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setTodas(false)}>
            <CalendarDays className="h-4 w-4 mr-1" /> Hoy
          </Button>
          <Button size="sm" variant={todas ? 'default' : 'outline'} className={todas ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setTodas(true)}>
            Historial completo
          </Button>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2">
          <span className="text-sm text-emerald-800">
            {todas ? 'Total histórico' : 'Total de hoy'}: <b className="text-lg">{fmt(total)}</b> · {ventas.length} venta{ventas.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {cargando ? (
        <p className="text-center text-sm text-muted-foreground py-8">Cargando ventas…</p>
      ) : ventas.length ? (
        <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {ventas.map((v) => (
            <div key={v.id} className="rounded-xl border bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Receipt className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{fmt(v.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fecha(v.createdAt)} · {v.usuario?.nombre || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {v.metodo === 'tarjeta' ? <CreditCard className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                    {v.metodo}
                  </Badge>
                  {v.metodo === 'efectivo' && v.cambio > 0 && (
                    <span className="text-xs text-muted-foreground">Cambio: {fmt(v.cambio)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground border-t pt-2">
                {v.items.map((i, ix) => (
                  <span key={ix}>
                    {i.cantidad} × {i.nombre}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {todas ? 'Aún no hay ventas registradas.' : 'Todavía no hay ventas hoy.'}
        </div>
      )}
    </div>
  )
}
