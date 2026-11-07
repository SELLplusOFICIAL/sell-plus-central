'use client'

import { useCallback, useEffect, useState } from 'react'
import { ReceiptText, Download } from 'lucide-react'
import Shell from '@/components/pos/shell'
import { dinero, fechaHora, numero } from '@/lib/util'

type Venta = {
  id: string
  total: number
  metodo: string
  recibido: number
  cambio: number
  createdAt: string
  usuario: { nombre: string }
  items: { id: string; nombre: string; precio: number; cantidad: number; subtotal: number }[]
}

type Resumen = {
  dias: number
  total: number
  cantidad: number
  porMetodo: { metodo: string; total: number; cantidad: number }[]
}

export default function VentasPage() {
  const [dias, setDias] = useState(7)
  const [ventas, setVentas] = useState<Venta[] | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [abierta, setAbierta] = useState<Venta | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/ventas?dias=${dias}&limite=100`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setVentas(d.ventas)
        setResumen(d.resumen)
      }
    } catch {}
  }, [dias])

  useEffect(() => {
    const t = setTimeout(cargar, 150)
    return () => clearTimeout(t)
  }, [cargar])

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-emerald-400" aria-hidden />
            Historial de ventas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Toca una venta para ver su ticket completo</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="sp-input !py-2 !w-auto" value={dias} onChange={(e) => setDias(parseInt(e.target.value, 10))} aria-label="Periodo">
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <a className="sp-btn sp-btn-ghost" href={`/api/exportar?seccion=ventas&dias=${dias}`}>
            <Download className="h-4 w-4" aria-hidden /> Excel
          </a>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Ventas del periodo</p>
            <p className="text-2xl font-extrabold mt-1">{numero(resumen.cantidad)}</p>
          </div>
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total vendido</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-400">{dinero(resumen.total)}</p>
          </div>
          {resumen.porMetodo.map((m) => (
            <div key={m.metodo} className="sp-panel p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {m.metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
              </p>
              <p className="text-2xl font-extrabold mt-1">{dinero(m.total)}</p>
              <p className="text-[11px] text-slate-500">{m.cantidad} tickets</p>
            </div>
          ))}
        </div>
      )}

      <div className="sp-panel overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="sp-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Atendió</th>
                <th>Artículos</th>
                <th>Método</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas === null && (
                <tr><td colSpan={5} className="text-center text-slate-500 py-8">Cargando…</td></tr>
              )}
              {ventas !== null && ventas.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-500 py-8">
                  No hay ventas en este periodo todavía.
                </td></tr>
              )}
              {ventas?.map((v) => (
                <tr key={v.id} onClick={() => setAbierta(v)}>
                  <td className="text-[13px]">{fechaHora(v.createdAt)}</td>
                  <td>{v.usuario.nombre}</td>
                  <td className="text-slate-400">
                    {v.items.reduce((s, i) => s + i.cantidad, 0)} art.
                  </td>
                  <td>
                    <span className={`sp-badge ${v.metodo === 'efectivo' ? 'sp-badge-ok' : 'sp-badge-info'}`}>
                      {v.metodo}
                    </span>
                  </td>
                  <td className="font-bold text-emerald-400">{dinero(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Detalle de la venta">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAbierta(null)} />
          <div className="relative sp-panel p-6 w-full max-w-md max-h-[85vh] overflow-y-auto sp-animar">
            <div className="text-center border-b border-dashed border-[var(--sp-border)] pb-4 mb-4">
              <p className="font-extrabold text-lg">Sell-Plus</p>
              <p className="text-xs text-slate-400">{fechaHora(abierta.createdAt)} · {abierta.usuario.nombre}</p>
            </div>
            <div className="space-y-2 mb-4">
              {abierta.items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm gap-3">
                  <span className="min-w-0">
                    <span className="font-semibold">{i.cantidad}×</span> {i.nombre}
                    <span className="text-slate-500 block text-[11px]">{dinero(i.precio)} c/u</span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{dinero(i.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-[var(--sp-border)] pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Método</span><span className="font-semibold capitalize">{abierta.metodo}</span></div>
              {abierta.metodo === 'efectivo' && (
                <>
                  <div className="flex justify-between"><span className="text-slate-400">Recibido</span><span>{dinero(abierta.recibido)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Cambio</span><span>{dinero(abierta.cambio)}</span></div>
                </>
              )}
              <div className="flex justify-between text-lg font-extrabold pt-1">
                <span>Total</span>
                <span className="text-emerald-400">{dinero(abierta.total)}</span>
              </div>
            </div>
            <button className="sp-btn sp-btn-ghost w-full mt-5" onClick={() => setAbierta(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </Shell>
  )
}
