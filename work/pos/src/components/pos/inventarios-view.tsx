'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, ChevronDown, ChevronRight, Pencil, Trash2, AlertTriangle, CalendarClock, PackageX, PackagePlus, RefreshCw } from 'lucide-react'

interface Lote {
  id: string
  cantidad: number
  cantidadInicial: number
  caducidad: string | null
  proveedor: string
}

interface Producto {
  id: string
  nombre: string
  categoria: string
  precioVenta: number
  costo: number
  minimo: number
  stock: number
  stockBajo: boolean
  unidadesPorCaducar: number
  unidadesVencidas: number
  lotes: Lote[]
}

const fmt = (n: number) => `$${n.toFixed(2)}`
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function estadoCaducidad(iso: string | null): { texto: string; clase: string } | null {
  if (!iso) return null
  const c = new Date(iso)
  const hoy = new Date()
  if (c < hoy) return { texto: `VENCIDO ${fecha(iso)}`, clase: 'bg-red-100 text-red-700' }
  const dias = Math.ceil((c.getTime() - hoy.getTime()) / 86400000)
  if (dias <= 30) return { texto: `Vence en ${dias} días`, clase: 'bg-amber-100 text-amber-800' }
  return { texto: `Vence ${fecha(iso)}`, clase: 'bg-emerald-50 text-emerald-700' }
}

export function InventariosView({ usuarioNombre }: { usuarioNombre: string }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'bajo' | 'caducar' | 'vencidos'>('todos')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Diálogos
  const [dlgProducto, setDlgProducto] = useState<null | 'nuevo' | 'editar'>(null)
  const [prodEditar, setProdEditar] = useState<Producto | null>(null)
  const [formP, setFormP] = useState({ nombre: '', categoria: 'General', precioVenta: '', costo: '', minimo: '5', stockInicial: '', caducidad: '', proveedor: '' })
  const [dlgLote, setDlgLote] = useState<Producto | null>(null)
  const [formL, setFormL] = useState({ cantidad: '', caducidad: '', proveedor: '', costoUnitario: '' })
  const [dlgAjuste, setDlgAjuste] = useState<{ lote: Lote; producto: Producto } | null>(null)
  const [formA, setFormA] = useState({ cantidad: '', motivo: '' })
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    setCargando(true)
    return fetch('/api/productos')
      .then((r) => r.json())
      .then((d) => setProductos(d.productos || []))
      .catch(() => {})
      .finally(() => setCargando(false))
  }
  useEffect(() => {
    const t0 = setTimeout(cargar, 0)
    return () => clearTimeout(t0)
  }, [])

  const stats = useMemo(() => {
    const unidades = productos.reduce((s, p) => s + p.stock, 0)
    const valor = productos.reduce((s, p) => s + p.stock * (p.costo || p.precioVenta), 0)
    const bajo = productos.filter((p) => p.stockBajo).length
    const caducar = productos.reduce((s, p) => s + (p.unidadesPorCaducar > 0 ? 1 : 0), 0)
    const venc = productos.reduce((s, p) => s + (p.unidadesVencidas > 0 ? 1 : 0), 0)
    return { unidades, valor, bajo, caducar, venc }
  }, [productos])

  const lista = useMemo(
    () =>
      productos
        .filter((p) =>
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.categoria.toLowerCase().includes(busqueda.toLowerCase())
        )
        .filter((p) => {
          if (filtro === 'bajo') return p.stockBajo
          if (filtro === 'caducar') return p.unidadesPorCaducar > 0
          if (filtro === 'vencidos') return p.unidadesVencidas > 0
          return true
        }),
    [productos, busqueda, filtro]
  )

  const guardarProducto = async () => {
    setGuardando(true)
    try {
      const esNuevo = dlgProducto === 'nuevo'
      const url = esNuevo ? '/api/productos' : `/api/productos/${prodEditar?.id}`
      const body = esNuevo
        ? {
            nombre: formP.nombre,
            categoria: formP.categoria,
            precioVenta: Number(formP.precioVenta),
            costo: Number(formP.costo) || 0,
            minimo: Number(formP.minimo) || 0,
            stockInicial: Number(formP.stockInicial) || 0,
            caducidad: formP.caducidad || null,
            proveedor: formP.proveedor,
            usuario: usuarioNombre,
          }
        : {
            nombre: formP.nombre,
            categoria: formP.categoria,
            precioVenta: Number(formP.precioVenta),
            costo: Number(formP.costo) || 0,
            minimo: Number(formP.minimo) || 0,
          }
      const d = await (await fetch(url, { method: esNuevo ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
      if (d.ok) {
        setDlgProducto(null)
        setProdEditar(null)
        setFormP({ nombre: '', categoria: 'General', precioVenta: '', costo: '', minimo: '5', stockInicial: '', caducidad: '', proveedor: '' })
        await cargar()
      }
    } finally {
      setGuardando(false)
    }
  }

  const guardarLote = async () => {
    if (!dlgLote) return
    setGuardando(true)
    try {
      const d = await (
        await fetch(`/api/productos/${dlgLote.id}/lotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cantidad: Number(formL.cantidad),
            caducidad: formL.caducidad || null,
            proveedor: formL.proveedor,
            costoUnitario: Number(formL.costoUnitario) || dlgLote.costo || 0,
            usuario: usuarioNombre,
          }),
        })
      ).json()
      if (d.ok) {
        setDlgLote(null)
        setFormL({ cantidad: '', caducidad: '', proveedor: '', costoUnitario: '' })
        await cargar()
      }
    } finally {
      setGuardando(false)
    }
  }

  const guardarAjuste = async () => {
    if (!dlgAjuste) return
    setGuardando(true)
    try {
      const d = await (
        await fetch(`/api/lotes/${dlgAjuste.lote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cantidad: Number(formA.cantidad), motivo: formA.motivo, usuario: usuarioNombre }),
        })
      ).json()
      if (d.ok) {
        setDlgAjuste(null)
        setFormA({ cantidad: '', motivo: '' })
        await cargar()
      }
    } finally {
      setGuardando(false)
    }
  }

  const retirarLote = async (lote: Lote) => {
    await fetch(`/api/lotes/${lote.id}?usuario=${encodeURIComponent(usuarioNombre)}`, { method: 'DELETE' })
    cargar()
  }

  const retirarProducto = async (p: Producto) => {
    await fetch(`/api/productos/${p.id}`, { method: 'DELETE' })
    cargar()
  }

  const abrirEditar = (p: Producto) => {
    setProdEditar(p)
    setFormP({ nombre: p.nombre, categoria: p.categoria, precioVenta: String(p.precioVenta), costo: String(p.costo), minimo: String(p.minimo), stockInicial: '', caducidad: '', proveedor: '' })
    setDlgProducto('editar')
  }

  return (
    <div className="space-y-4">
      {/* Resumen del inventario */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { et: 'Productos', val: productos.length, icon: <PackagePlus className="h-4 w-4" /> },
          { et: 'Unidades', val: stats.unidades, icon: <RefreshCw className="h-4 w-4" /> },
          { et: 'Stock bajo', val: stats.bajo, icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
          { et: 'Por caducar', val: stats.caducar, icon: <CalendarClock className="h-4 w-4 text-amber-600" /> },
          { et: 'Vencidos', val: stats.venc, icon: <PackageX className="h-4 w-4 text-red-600" /> },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-white p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">{s.icon} {s.et}</p>
            <p className="text-2xl font-bold mt-0.5">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Barra: búsqueda, filtros y nuevo producto */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9 h-11" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            ['todos', 'Todos'],
            ['bajo', 'Stock bajo'],
            ['caducar', 'Por caducar'],
            ['vencidos', 'Vencidos'],
          ] as const).map(([k, et]) => (
            <Button key={k} size="sm" variant={filtro === k ? 'default' : 'outline'} className={filtro === k ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setFiltro(k)}>
              {et}
            </Button>
          ))}
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFormP({ nombre: '', categoria: 'General', precioVenta: '', costo: '', minimo: '5', stockInicial: '', caducidad: '', proveedor: '' }); setDlgProducto('nuevo') }}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo producto
        </Button>
      </div>

      {/* Lista unificada producto + lotes */}
      <div className="space-y-2 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">
        {lista.map((p) => {
          const abierto = expandido === p.id
          return (
            <div key={p.id} className={`rounded-xl border bg-white overflow-hidden ${p.stockBajo ? 'border-amber-300' : ''}`}>
              <button className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-gray-50" onClick={() => setExpandido(abierto ? null : p.id)}>
                {abierto ? <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.nombre}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
                    {p.stockBajo && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Stock bajo</Badge>}
                    {p.unidadesPorCaducar > 0 && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Por caducar: {p.unidadesPorCaducar} u.</Badge>}
                    {p.unidadesVencidas > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">Vencido: {p.unidadesVencidas} u.</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {p.lotes.length} lote{p.lotes.length === 1 ? '' : 's'} · Stock total: <b className="text-foreground">{p.stock} u.</b> · Venta: {fmt(p.precioVenta)}
                  </div>
                </div>
              </button>
              {abierto && (
                <div className="border-t bg-gray-50/60 p-3 space-y-2">
                  {p.lotes.map((l) => {
                    const est = estadoCaducidad(l.caducidad)
                    return (
                      <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{l.cantidad} de {l.cantidadInicial} u.</span>
                            {est && <Badge className={`text-[10px] ${est.clase}`}>{est.texto}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Caducidad: {fecha(l.caducidad)}{l.proveedor ? ` · ${l.proveedor}` : ''}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setDlgAjuste({ lote: l, producto: p }); setFormA({ cantidad: String(l.cantidad), motivo: '' }) }}>
                          <Pencil className="h-3.5 w-3.5" /> Ajustar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => retirarLote(l)}>
                          <Trash2 className="h-3.5 w-3.5" /> Retirar
                        </Button>
                      </div>
                    )
                  })}
                  {!p.lotes.length && <p className="text-sm text-muted-foreground py-1">Sin lotes con existencias. Agrega mercancía con «+ Lote».</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setDlgLote(p); setFormL({ cantidad: '', caducidad: '', proveedor: '', costoUnitario: String(p.costo) }) }}>
                      <Plus className="h-4 w-4" /> Lote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(p)}>
                      <Pencil className="h-4 w-4" /> Editar producto
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => retirarProducto(p)}>
                      <Trash2 className="h-4 w-4" /> Retirar del catálogo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!cargando && !lista.length && (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No hay productos aquí. Agrega el primero con «Nuevo producto».
          </div>
        )}
        {cargando && <p className="text-center text-sm text-muted-foreground py-6">Cargando inventario…</p>}
      </div>

      {/* Dialogo nuevo/editar producto */}
      <Dialog open={!!dlgProducto} onOpenChange={(o) => !o && setDlgProducto(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dlgProducto === 'nuevo' ? 'Nuevo producto' : `Editar ${prodEditar?.nombre}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={formP.nombre} onChange={(e) => setFormP({ ...formP, nombre: e.target.value })} placeholder="Ej. Leche Lala 1L" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Input value={formP.categoria} onChange={(e) => setFormP({ ...formP, categoria: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Aviso de stock bajo (unid.)</Label>
                <Input inputMode="numeric" value={formP.minimo} onChange={(e) => setFormP({ ...formP, minimo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Precio de venta</Label>
                <Input inputMode="decimal" value={formP.precioVenta} onChange={(e) => setFormP({ ...formP, precioVenta: e.target.value })} placeholder="25.00" />
              </div>
              <div className="space-y-1">
                <Label>Costo (opcional)</Label>
                <Input inputMode="decimal" value={formP.costo} onChange={(e) => setFormP({ ...formP, costo: e.target.value })} placeholder="18.50" />
              </div>
            </div>
            {dlgProducto === 'nuevo' && (
              <>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-3">
                  <p className="text-xs font-medium text-emerald-800">Mercancía inicial (primer lote) — opcional</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Cantidad</Label>
                      <Input inputMode="numeric" value={formP.stockInicial} onChange={(e) => setFormP({ ...formP, stockInicial: e.target.value })} placeholder="20" />
                    </div>
                    <div className="space-y-1">
                      <Label>¿Caduca el…?</Label>
                      <Input type="date" value={formP.caducidad} onChange={(e) => setFormP({ ...formP, caducidad: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Proveedor (opcional)</Label>
                    <Input value={formP.proveedor} onChange={(e) => setFormP({ ...formP, proveedor: e.target.value })} />
                  </div>
                </div>
              </>
            )}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={guardarProducto} disabled={guardando || !formP.nombre.trim() || !formP.precioVenta}>
              {guardando ? 'Guardando…' : dlgProducto === 'nuevo' ? 'Crear producto' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo nuevo lote */}
      <Dialog open={!!dlgLote} onOpenChange={(o) => !o && setDlgLote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entrada de mercancía — {dlgLote?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cantidad que entra</Label>
                <Input inputMode="numeric" value={formL.cantidad} onChange={(e) => setFormL({ ...formL, cantidad: e.target.value })} placeholder="24" />
              </div>
              <div className="space-y-1">
                <Label>¿Caduca el…?</Label>
                <Input type="date" value={formL.caducidad} onChange={(e) => setFormL({ ...formL, caducidad: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Proveedor</Label>
                <Input value={formL.proveedor} onChange={(e) => setFormL({ ...formL, proveedor: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Costo unitario</Label>
                <Input inputMode="decimal" value={formL.costoUnitario} onChange={(e) => setFormL({ ...formL, costoUnitario: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Los lotes sin caducidad son cosas como refrescos o papelería. La venta descuenta primero lo que antes caduca.</p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={guardarLote} disabled={guardando || !formL.cantidad}>
              {guardando ? 'Guardando…' : 'Registrar entrada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo ajustar lote */}
      <Dialog open={!!dlgAjuste} onOpenChange={(o) => !o && setDlgAjuste(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar lote — {dlgAjuste?.producto.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cantidad real en estante</Label>
              <Input inputMode="numeric" value={formA.cantidad} onChange={(e) => setFormA({ ...formA, cantidad: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Motivo (merma, conteo, daño…)</Label>
              <Input value={formA.motivo} onChange={(e) => setFormA({ ...formA, motivo: e.target.value })} placeholder="Ej. Merma por daño" />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={guardarAjuste} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar ajuste'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
