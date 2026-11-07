'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  Ticket as TicketIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Keyboard,
} from 'lucide-react'
import Shell from '@/components/pos/shell'
import { dinero } from '@/lib/util'

type ProdCaja = {
  id: string
  nombre: string
  precioVenta: number
  existencia: number
  categoria: string
}

type ItemCarrito = { productoId: string; nombre: string; precio: number; cantidad: number }

type VentaOK = { id: string; total: number; metodo: string; recibido: number; cambio: number }

/** Ticket en espera (v3.3.3 — ventas inteligentes) */
type Ticket = { id: string; items: ItemCarrito[] }

type MovCaja = {
  id: string
  tipo: string
  monto: number
  motivo: string
  usuario: string
  createdAt: string
}

type ResumenCaja = {
  entradas: number
  salidas: number
  ventasEfectivo: number
  enCaja: number
}

const CLAVE_TICKETS = 'sp_tickets_caja_v1'

function nuevoId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export default function CajaPage() {
  const [productos, setProductos] = useState<ProdCaja[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('') // filtro por categoría (F10)
  const [tickets, setTickets] = useState<Ticket[]>([{ id: 't1', items: [] }])
  const [activoId, setActivoId] = useState('t1')
  const [metodo, setMetodo] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [ventaOK, setVentaOK] = useState<VentaOK | null>(null)
  const [error, setError] = useState('')

  // Dinero en caja (v3.3.3)
  const [resumenCaja, setResumenCaja] = useState<ResumenCaja | null>(null)
  const [movs, setMovs] = useState<MovCaja[]>([])
  const [dialogoDinero, setDialogoDinero] = useState<null | 'entrada' | 'salida'>(null)
  const [montoDinero, setMontoDinero] = useState('')
  const [motivoDinero, setMotivoDinero] = useState('')
  const [guardandoDinero, setGuardandoDinero] = useState(false)
  const [errorDinero, setErrorDinero] = useState('')

  const buscadorRef = useRef<HTMLInputElement>(null)
  const montadosRef = useRef(false)
  const itemsRef = useRef<ItemCarrito[]>([])
  const activoIdRef = useRef(activoId)
  activoIdRef.current = activoId
  const cobrarRef = useRef<(p: unknown) => unknown>(() => {})

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/productos', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setProductos((d.productos ?? []).filter((p: ProdCaja & { activo: boolean }) => p.activo))
      }
    } catch {}
  }, [])

  const cargarCaja = useCallback(async () => {
    try {
      const res = await fetch('/api/caja/movimientos', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setResumenCaja(d.resumen ?? null)
        setMovs(d.movimientos ?? [])
      }
    } catch {}
  }, [])

  // Cargar productos + tickets guardados + caja
  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 60_000)
    try {
      const guardado = localStorage.getItem(CLAVE_TICKETS)
      if (guardado) {
        const ts = JSON.parse(guardado) as Ticket[]
        if (Array.isArray(ts) && ts.length > 0 && ts.every((x) => x && Array.isArray(x.items))) {
          setTickets(ts)
          setActivoId(ts[0].id)
        }
      }
    } catch {}
    montadosRef.current = true
    cargarCaja()
    return () => clearInterval(t)
  }, [cargar, cargarCaja])

  // Persistir tickets (sobreviven a reinicios del programa)
  useEffect(() => {
    if (!montadosRef.current) return
    try {
      localStorage.setItem(CLAVE_TICKETS, JSON.stringify(tickets))
    } catch {}
  }, [tickets])

  const ticketActivo = tickets.find((t) => t.id === activoId) ?? tickets[0]
  const items = ticketActivo?.items ?? []
  itemsRef.current = items

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [productos]
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false
      if (!q) return true
      return p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    })
  }, [productos, busqueda, categoria])

  const total = useMemo(
    () => Number(items.reduce((s, i) => s + i.precio * i.cantidad, 0).toFixed(2)),
    [items]
  )
  const totalTodos = useMemo(
    () => Number(tickets.reduce((s, t) => s + t.items.reduce((x, i) => x + i.precio * i.cantidad, 0), 0).toFixed(2)),
    [tickets]
  )
  const recibidoNum = Number(recibido || 0)
  const cambio = metodo === 'efectivo' ? Number((recibidoNum - total).toFixed(2)) : 0

  /** Cantidad de un producto sumada en TODOS los tickets en espera */
  const enTodosLosTickets = useCallback(
    (productoId: string) =>
      tickets.reduce((s, t) => s + (t.items.find((i) => i.productoId === productoId)?.cantidad ?? 0), 0),
    [tickets]
  )

  const setItems = useCallback(
    (fn: (prev: ItemCarrito[]) => ItemCarrito[]) => {
      setTickets((ts) => ts.map((t) => (t.id === (ticketActivo?.id ?? activoId) ? { ...t, items: fn(t.items) } : t)))
    },
    [ticketActivo?.id, activoId]
  )

  /** F6 — nuevo ticket en espera (no apila tickets vacíos) */
  const nuevoTicket = useCallback(() => {
    setTickets((ts) => {
      const activo = ts.find((t) => t.id === activoIdRef.current)
      if (activo && activo.items.length === 0 && ts.length > 0) return ts // ya hay uno vacío
      const t: Ticket = { id: nuevoId(), items: [] }
      setActivoId(t.id)
      return [...ts, t]
    })
    setError('')
  }, [])

  /** Eliminar ticket (X en su pestañita); nunca deja la caja sin ticket */
  const eliminarTicket = useCallback(
    (id: string) => {
      setTickets((ts) => {
        const restantes = ts.filter((t) => t.id !== id)
        if (restantes.length === 0) {
          const t: Ticket = { id: nuevoId(), items: [] }
          setActivoId(t.id)
          return [t]
        }
        if (id === activoIdRef.current) setActivoId(restantes[0].id)
        return restantes
      })
      setError('')
    },
    []
  )

  const agregar = (p: ProdCaja) => {
    setError('')
    setVentaOK(null)
    const yaHay = enTodosLosTickets(p.id)
    if (yaHay + 1 > p.existencia) {
      setError(`Solo hay ${p.existencia} de "${p.nombre}".`)
      return
    }
    setItems((c) =>
      c.find((i) => i.productoId === p.id)
        ? c.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...c, { productoId: p.id, nombre: p.nombre, precio: p.precioVenta, cantidad: 1 }]
    )
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setItems((c) =>
      c
        .map((i) => {
          if (i.productoId !== id) return i
          const prod = productos.find((p) => p.id === id)
          const nueva = i.cantidad + delta
          if (prod && yaHayOtroTicket(id) + Math.max(0, nueva) > prod.existencia) return i
          return { ...i, cantidad: nueva }
        })
        .filter((i) => i.cantidad > 0)
    )
  }

  const yaHayOtroTicket = (productoId: string) =>
    tickets.reduce(
      (s, t) => s + (t.id === (ticketActivo?.id ?? '') ? 0 : t.items.find((i) => i.productoId === productoId)?.cantidad ?? 0),
      0
    )

  const cobrar = async () => {
    if (items.length === 0 || cobrando) return
    setError('')
    if (metodo === 'efectivo' && recibidoNum < total) {
      setError('El dinero recibido no cubre el total.')
      return
    }
    setCobrando(true)
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
          metodo,
          recibido: metodo === 'efectivo' ? recibidoNum : total,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setVentaOK(d.venta)
        setRecibido('')
        setMetodo('efectivo')
        eliminarTicket(activoIdRef.current) // el ticket cobrado se consume
        cargar()
        cargarCaja()
      } else {
        setError(d.mensaje || 'No se pudo cobrar.')
      }
    } catch {
      setError('Error de conexión con el servidor local.')
    } finally {
      setCobrando(false)
    }
  }

  /** F7 / F8 — abrir diálogo de entrada o salida de dinero */
  const abrirDinero = useCallback((tipo: 'entrada' | 'salida') => {
    setMontoDinero('')
    setMotivoDinero('')
    setErrorDinero('')
    setDialogoDinero(tipo)
  }, [])

  const guardarDinero = async () => {
    if (!dialogoDinero || guardandoDinero) return
    const monto = Number(montoDinero)
    if (!isFinite(monto) || monto <= 0) {
      setErrorDinero('Captura un monto mayor a cero.')
      return
    }
    setGuardandoDinero(true)
    setErrorDinero('')
    try {
      const res = await fetch('/api/caja/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: dialogoDinero, monto, motivo: motivoDinero.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setDialogoDinero(null)
        cargarCaja()
      } else {
        setErrorDinero(d.mensaje || 'No se pudo registrar el movimiento.')
      }
    } catch {
      setErrorDinero('Error de conexión con el servidor local.')
    } finally {
      setGuardandoDinero(false)
    }
  }

  // ---- Atajos de teclado (v3.3.3 — ventas inteligentes) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      switch (e.key) {
        case 'F6': // nuevo ticket
          e.preventDefault()
          nuevoTicket()
          break
        case 'F10': // buscar producto
          e.preventDefault()
          buscadorRef.current?.focus()
          buscadorRef.current?.select()
          break
        case 'F7': // entrada de dinero
          e.preventDefault()
          abrirDinero('entrada')
          break
        case 'F8': // salida de dinero
          e.preventDefault()
          abrirDinero('salida')
          break
        case 'F12': // cobrar ticket activo
          e.preventDefault()
          if (itemsRef.current.length > 0) cobrarRef.current()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nuevoTicket, abrirDinero])

  cobrarRef.current = cobrar

  return (
    <Shell>
      {/* Leyenda de atajos */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-semibold text-slate-400">
          <Keyboard className="h-3.5 w-3.5" aria-hidden /> Atajos:
        </span>
        <span><span className="sp-tecla">F6</span> nuevo ticket</span>
        <span><span className="sp-tecla">F10</span> buscar</span>
        <span><span className="sp-tecla">F7</span> entrada de dinero</span>
        <span><span className="sp-tecla">F8</span> salida de dinero</span>
        <span><span className="sp-tecla">F12</span> cobrar</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* Productos */}
        <section>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-500" aria-hidden />
              <input
                ref={buscadorRef}
                className="sp-input !pl-11"
                placeholder="Buscar producto por nombre o categoría… (F10)"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar producto"
              />
            </div>
            <select
              className="sp-input !w-[180px] shrink-0"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {filtrados.map((p) => (
              <button key={p.id} className="sp-prod" onClick={() => agregar(p)}>
                <div>
                  <p className="font-semibold text-sm leading-snug line-clamp-2">{p.nombre}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.categoria}</p>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-emerald-400 font-extrabold">{dinero(p.precioVenta)}</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      p.existencia <= 0 ? 'text-red-400' : p.existencia <= 5 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {p.existencia <= 0 ? 'agotado' : `${p.existencia} disp.`}
                  </span>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && (
              <div className="col-span-full sp-panel p-8 text-center text-slate-400 text-sm">
                No hay productos que coincidan con la búsqueda o el filtro.
              </div>
            )}
          </div>
        </section>

        {/* Tickets */}
        <aside className="sp-panel p-5 h-fit lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-emerald-400" aria-hidden />
              <h2 className="font-bold text-lg">Tickets</h2>
            </div>
            <button
              className="sp-btn sp-btn-ghost !min-h-[34px] !px-2.5 !text-xs"
              onClick={nuevoTicket}
              title="Agregar ticket (F6)"
            >
              <Plus className="h-4 w-4" aria-hidden /> Nuevo <span className="sp-tecla ml-1">F6</span>
            </button>
          </div>

          {/* Pestañitas de tickets + contabilidad */}
          <p className="text-[11px] text-slate-500 mb-2">
            {tickets.length} ticket{tickets.length === 1 ? '' : 's'} en espera · total {dinero(totalTodos)}
          </p>
          {tickets.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
              {tickets.map((t, ix) => {
                const tot = t.items.reduce((s, i) => s + i.precio * i.cantidad, 0)
                const activo = t.id === ticketActivo?.id
                return (
                  <div
                    key={t.id}
                    className={`flex items-center rounded-lg border px-1.5 py-1 text-xs shrink-0 ${
                      activo ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-[var(--sp-border)] bg-[var(--sp-panel2)] text-slate-400'
                    }`}
                  >
                    <button className="pr-1 font-semibold" onClick={() => setActivoId(t.id)} aria-label={`Ir al ticket ${ix + 1}`}>
                      #{ix + 1} · {dinero(tot)}
                    </button>
                    <button
                      className="hover:text-red-400 p-0.5"
                      onClick={() => eliminarTicket(t.id)}
                      aria-label={`Eliminar ticket ${ix + 1}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {ventaOK && (
            <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-4 sp-animar">
              <p className="flex items-center gap-2 font-bold text-emerald-300 text-sm mb-1">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Venta cobrada
              </p>
              <p className="text-2xl font-extrabold">{dinero(ventaOK.total)}</p>
              {ventaOK.metodo === 'efectivo' && (
                <p className="text-xs text-slate-300 mt-0.5">
                  Cambio a devolver: <strong className="text-emerald-300">{dinero(ventaOK.cambio)}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5 max-h-[34vh] overflow-y-auto mb-3">
            {items.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">
                Toca un producto para agregarlo al ticket {tickets.length > 1 ? 'activo' : ''}.
              </p>
            )}
            {items.map((i) => (
              <div key={i.productoId} className="flex items-center gap-2 rounded-xl bg-[var(--sp-panel2)] border border-[var(--sp-border)] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{i.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {dinero(i.precio)} × {i.cantidad}
                  </p>
                </div>
                <button
                  className="sp-btn sp-btn-ghost !min-h-[34px] !w-[34px] !p-0"
                  onClick={() => cambiarCantidad(i.productoId, 1)}
                  aria-label={`Agregar uno más a ${i.nombre}`}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
                <button
                  className="sp-btn sp-btn-ghost !min-h-[34px] !w-[34px] !p-0"
                  onClick={() => cambiarCantidad(i.productoId, -1)}
                  aria-label={`Quitar uno de ${i.nombre}`}
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <button
                  className="sp-btn sp-btn-ghost !min-h-[34px] !w-[34px] !p-0 hover:!text-red-400"
                  onClick={() => setItems((c) => c.filter((x) => x.productoId !== i.productoId))}
                  aria-label={`Quitar ${i.nombre} del ticket`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-20 text-right font-bold text-sm">{dinero(i.precio * i.cantidad)}</span>
              </div>
            ))}
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-amber-400 mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="border-t border-[var(--sp-border)] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Total del ticket</span>
              <span className="text-3xl font-extrabold text-emerald-400">{dinero(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                className={`sp-btn ${metodo === 'efectivo' ? 'sp-btn-primary' : 'sp-btn-ghost'}`}
                onClick={() => setMetodo('efectivo')}
              >
                <Banknote className="h-[18px] w-[18px]" aria-hidden /> Efectivo
              </button>
              <button
                className={`sp-btn ${metodo === 'tarjeta' ? 'sp-btn-primary' : 'sp-btn-ghost'}`}
                onClick={() => setMetodo('tarjeta')}
              >
                <CreditCard className="h-[18px] w-[18px]" aria-hidden /> Tarjeta
              </button>
            </div>

            {metodo === 'efectivo' && (
              <div>
                <label className="text-xs text-slate-400 font-semibold" htmlFor="recibido">
                  ¿Con cuánto paga el cliente?
                </label>
                <input
                  id="recibido"
                  className="sp-input mt-1 !text-xl !font-bold text-center"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value.replace(/[^\d.]/g, ''))}
                />
                {recibidoNum >= total && recibidoNum > 0 && (
                  <p className="text-center text-sm text-emerald-300 mt-1.5 font-semibold">
                    Cambio: {dinero(cambio)}
                  </p>
                )}
              </div>
            )}

            <button
              className="sp-btn sp-btn-primary w-full !py-4 !text-lg"
              onClick={cobrar}
              disabled={items.length === 0 || cobrando}
              title="Cobrar (F12)"
            >
              {cobrando ? 'Cobrando…' : <>Cobrar {dinero(total)} <span className="sp-tecla ml-2">F12</span></>}
            </button>
          </div>

          {/* Dinero en caja (v3.3.3) */}
          <div className="border-t border-[var(--sp-border)] pt-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Wallet className="h-4 w-4 text-emerald-400" aria-hidden /> Dinero en caja (hoy)
              </span>
              <span className="text-[11px] text-slate-500">
                En caja: <b className="text-emerald-400">{dinero(resumenCaja?.enCaja ?? 0)}</b>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="sp-btn sp-btn-ghost !text-xs !min-h-[36px]" onClick={() => abrirDinero('entrada')}>
                <ArrowDownCircle className="h-4 w-4 text-emerald-400" aria-hidden /> Entrada <span className="sp-tecla ml-1">F7</span>
              </button>
              <button className="sp-btn sp-btn-ghost !text-xs !min-h-[36px]" onClick={() => abrirDinero('salida')}>
                <ArrowUpCircle className="h-4 w-4 text-red-400" aria-hidden /> Salida <span className="sp-tecla ml-1">F8</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Hoy: ventas en efectivo {dinero(resumenCaja?.ventasEfectivo ?? 0)} · entradas{' '}
              <span className="text-emerald-400">{dinero(resumenCaja?.entradas ?? 0)}</span> · salidas{' '}
              <span className="text-red-400">{dinero(resumenCaja?.salidas ?? 0)}</span>
            </p>
            {movs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {movs.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-[11px] text-slate-400">
                    {m.tipo === 'entrada' ? (
                      <ArrowDownCircle className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden />
                    ) : (
                      <ArrowUpCircle className="h-3 w-3 text-red-400 shrink-0" aria-hidden />
                    )}
                    <span className="truncate flex-1">{m.motivo || (m.tipo === 'entrada' ? 'Entrada' : 'Salida')}</span>
                    <span className={m.tipo === 'entrada' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {m.tipo === 'entrada' ? '+' : '−'}
                      {dinero(m.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Diálogo Entrada / Salida de dinero */}
      {dialogoDinero && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="sp-panel p-6 w-full max-w-sm sp-animar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 font-bold text-lg">
                {dialogoDinero === 'entrada' ? (
                  <>
                    <ArrowDownCircle className="h-5 w-5 text-emerald-400" aria-hidden /> Entrada de dinero
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="h-5 w-5 text-red-400" aria-hidden /> Salida de dinero
                  </>
                )}
              </h3>
              <button className="sp-btn sp-btn-ghost !min-h-[34px] !w-[34px] !p-0" onClick={() => setDialogoDinero(null)} aria-label="Cerrar">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <label className="text-xs text-slate-400 font-semibold" htmlFor="monto-dinero">
              Monto
            </label>
            <input
              id="monto-dinero"
              className="sp-input mt-1 !text-2xl !font-bold text-center"
              inputMode="decimal"
              placeholder="0.00"
              value={montoDinero}
              autoFocus
              onChange={(e) => setMontoDinero(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && guardarDinero()}
            />
            <label className="text-xs text-slate-400 font-semibold mt-3 block" htmlFor="motivo-dinero">
              Motivo (opcional)
            </label>
            <input
              id="motivo-dinero"
              className="sp-input mt-1"
              placeholder={dialogoDinero === 'entrada' ? 'P. ej. fondo de caja, aporte del dueño…' : 'P. ej. retiro, pago a proveedor, gasto…'}
              value={motivoDinero}
              maxLength={200}
              onChange={(e) => setMotivoDinero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardarDinero()}
            />
            {dialogoDinero === 'salida' && (resumenCaja?.enCaja ?? 0) > 0 && Number(montoDinero) > (resumenCaja?.enCaja ?? 0) && (
              <p className="flex items-center gap-2 text-xs text-amber-400 mt-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                La salida excede el dinero estimado en caja ({dinero(resumenCaja?.enCaja ?? 0)}). Puedes registrarla si es correcta.
              </p>
            )}
            {errorDinero && <p className="text-sm text-red-400 mt-2">{errorDinero}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="sp-btn sp-btn-ghost" onClick={() => setDialogoDinero(null)}>
                Cancelar
              </button>
              <button
                className={`sp-btn ${dialogoDinero === 'entrada' ? 'sp-btn-primary' : 'sp-btn-danger'}`}
                onClick={guardarDinero}
                disabled={guardandoDinero}
              >
                {guardandoDinero ? 'Guardando…' : dialogoDinero === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
