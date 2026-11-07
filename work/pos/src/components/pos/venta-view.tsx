'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Minus, Trash2, Banknote, CreditCard, CheckCircle2, Printer, ShoppingCart as CartIcon } from 'lucide-react'

interface Producto {
  id: string
  nombre: string
  precioVenta: number
  stock: number
  categoria: string
}

interface CarritoItem {
  productoId: string
  nombre: string
  precio: number
  cantidad: number
}

interface VentaHecha {
  total: number
  cambio: number
  metodo: string
  items: { nombre: string; cantidad: number; subtotal: number }[]
}

const fmt = (n: number) => `$${n.toFixed(2)}`

export function VentaView({ usuario, refrescarAlertas }: { usuario: { id: string; nombre: string; rol: string }; refrescarAlertas?: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [cobrando, setCobrando] = useState(false)
  const [metodo, setMetodo] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [ventaHecha, setVentaHecha] = useState<VentaHecha | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = () =>
    fetch('/api/productos')
      .then((r) => r.json())
      .then((d) => setProductos((d.productos || []).filter((p: Producto & { activo: boolean }) => p.stock > 0)))
      .catch(() => {})

  useEffect(() => {
    const t0 = setTimeout(cargar, 0)
    return () => clearTimeout(t0)
  }, [])

  const filtrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.categoria.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [productos, busqueda]
  )

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const cambio = Math.max(0, (Number(recibido) || 0) - total)

  const agregar = (p: Producto) => {
    setError('')
    setCarrito((c) => {
      const ya = c.find((i) => i.productoId === p.id)
      if (ya) {
        if (ya.cantidad + 1 > p.stock) {
          setError(`Solo quedan ${p.stock} de ${p.nombre}`)
          return c
        }
        return c.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...c, { productoId: p.id, nombre: p.nombre, precio: p.precioVenta, cantidad: 1 }]
    })
  }

  const cambiar = (id: string, delta: number) =>
    setCarrito((c) =>
      c.map((i) => (i.productoId === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)).filter((i) => i.cantidad > 0)
    )

  const cobrar = async () => {
    setError('')
    setGuardando(true)
    try {
      const r = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          items: carrito.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
          metodo,
          recibido: metodo === 'efectivo' ? Number(recibido) || 0 : total,
        }),
      })
      const d = await r.json()
      if (!d.ok) {
        setError(d.error || 'No se pudo registrar la venta')
        return
      }
      setVentaHecha({ total: d.venta.total, cambio: d.cambio, metodo, items: d.venta.items })
      setCarrito([])
      setRecibido('')
      setCobrando(false)
      cargar()
      refrescarAlertas?.()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 h-full">
      {/* Productos */}
      <div className="min-w-0">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9 h-11" />
        </div>
        {filtrados.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                className="rounded-xl border bg-white p-3 text-left hover:border-emerald-500 hover:shadow transition-all flex flex-col gap-1"
              >
                <span className="font-semibold text-sm leading-tight">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">{p.categoria}</span>
                <div className="flex items-center justify-between mt-auto pt-1.5">
                  <span className="font-bold text-emerald-700">{fmt(p.precioVenta)}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.stock} u.</Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No hay productos con stock. Agrega inventario en la sección <b>Inventarios</b>.
          </div>
        )}
      </div>

      {/* Ticket en curso */}
      <div className="rounded-2xl border bg-white flex flex-col h-fit lg:sticky lg:top-4">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CartIcon className="h-5 w-5 text-emerald-600" /> Venta en curso
          </div>
          {carrito.length > 0 && (
            <Button size="sm" variant="ghost" className="text-red-600 h-8" onClick={() => setCarrito([])}>
              <Trash2 className="h-4 w-4" /> Vaciar
            </Button>
          )}
        </div>
        <div className="p-3 space-y-1.5 max-h-[40vh] overflow-y-auto min-h-[80px]">
          {carrito.length ? (
            carrito.map((i) => (
              <div key={i.productoId} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">{fmt(i.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cambiar(i.productoId, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{i.cantidad}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cambiar(i.productoId, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="w-16 text-right text-sm font-semibold">{fmt(i.precio * i.cantidad)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Toca un producto para agregarlo</p>
          )}
        </div>
        {error && <p className="text-sm text-red-600 px-4 pb-2">{error}</p>}
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Total</span>
            <span className="text-3xl font-bold text-emerald-700">{fmt(total)}</span>
          </div>
          <Button className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700" disabled={!carrito.length} onClick={() => { setCobrando(true); setError('') }}>
            Cobrar
          </Button>
        </div>
      </div>

      {/* Cobro */}
      <Dialog open={cobrando} onOpenChange={setCobrando}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar {fmt(total)}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={metodo === 'efectivo' ? 'default' : 'outline'} className={`h-12 ${metodo === 'efectivo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setMetodo('efectivo')}>
              <Banknote className="h-4 w-4 mr-1" /> Efectivo
            </Button>
            <Button variant={metodo === 'tarjeta' ? 'default' : 'outline'} className={`h-12 ${metodo === 'tarjeta' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setMetodo('tarjeta')}>
              <CreditCard className="h-4 w-4 mr-1" /> Tarjeta
            </Button>
          </div>
          {metodo === 'efectivo' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">¿Con cuánto paga el cliente?</p>
              <div className="grid grid-cols-4 gap-2">
                {[total, 100, 200, 500].map((v, i) => (
                  <Button key={i} variant="outline" className="h-10" onClick={() => setRecibido(String(i === 0 ? v.toFixed(2) : v))}>
                    {i === 0 ? 'Exacto' : fmt(v)}
                  </Button>
                ))}
              </div>
              <Input inputMode="decimal" placeholder="Cantidad recibida" value={recibido} onChange={(e) => setRecibido(e.target.value)} className="h-12 text-lg" />
              <div className="flex justify-between rounded-lg bg-emerald-50 px-4 py-3">
                <span>Cambio a devolver</span>
                <span className="font-bold text-emerald-700 text-lg">{fmt(cambio)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cobra con la terminal y confirma.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="h-12 text-lg bg-emerald-600 hover:bg-emerald-700" onClick={cobrar} disabled={guardando || (metodo === 'efectivo' && (Number(recibido) || 0) < total)}>
            {guardando ? 'Registrando…' : 'Terminar venta'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Ticket listo */}
      <Dialog open={!!ventaHecha} onOpenChange={(o) => !o && setVentaHecha(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" /> Venta registrada
            </DialogTitle>
          </DialogHeader>
          {ventaHecha && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 text-sm space-y-1">
                {ventaHecha.items.map((i, ix) => (
                  <div key={ix} className="flex justify-between">
                    <span>{i.cantidad} × {i.nombre}</span>
                    <span>{fmt(i.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t pt-1.5 mt-1.5 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{fmt(ventaHecha.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pago {ventaHecha.metodo}</span>
                  {ventaHecha.metodo === 'efectivo' && <span>Cambio: {fmt(ventaHecha.cambio)}</span>}
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setVentaHecha(null)}>
                Listo, siguiente cliente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
