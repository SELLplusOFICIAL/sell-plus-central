'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Plus, Upload, Download, Pencil, Trash2, PackagePlus, AlertTriangle,
  Boxes, X, CheckCircle2, CalendarClock, TrendingUp, Package, Filter, RotateCcw,
} from 'lucide-react'
import Shell from '@/components/pos/shell'
import { dinero, numero, fechaCorta, diasParaCaducar } from '@/lib/util'

type Fila = {
  id: string
  nombre: string
  categoria: string
  codigo: string
  precioVenta: number
  costo: number
  minimo: number
  activo: boolean
  existencia: number
  valorInventario: number
  lotesCount: number
  proximaCaducidad: string | null
  vendidosPeriodo: number
}

type Resumen = {
  totalProductos: number
  valorInventario: number
  enRiesgoCaducidad: number
  stockBajo: number
}

type Lote = {
  id: string
  cantidad: number
  cantidadInicial: number
  caducidad: string | null
  proveedor: string
  costoUnitario: number
  activo: boolean
}

type Movimiento = {
  id: string
  tipo: string
  cantidad: number
  motivo: string
  usuario: string
  createdAt: string
}

type Detalle = {
  producto: Fila & { lotes: Lote[]; movimientos: Movimiento[]; vendidos90: number }
}

type SesionInfo = { rol: 'dueno' | 'empleado'; nombre: string }

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function aInputFecha(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function InventariosPage() {
  const [sesion, setSesion] = useState<SesionInfo | null>(null)
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [categorias, setCategorias] = useState<string[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [periodo, setPeriodo] = useState(30)
  const [fStockBajo, setFStockBajo] = useState(false)
  const [fCaducidad, setFCaducidad] = useState<'todos' | '30' | '7' | 'vencidos'>('todos')
  const [fVentas, setFVentas] = useState<'todos' | 'con' | 'sin'>('todos')
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [dialogoAlta, setDialogoAlta] = useState(false)
  const [dialogoImportar, setDialogoImportar] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const esDueno = sesion?.rol === 'dueno'

  const cargar = useCallback(async () => {
    const qs = new URLSearchParams({
      periodo: String(periodo),
      ventas: fVentas,
      caducidad: fCaducidad,
    })
    if (busqueda.trim()) qs.set('busqueda', busqueda.trim())
    if (categoria) qs.set('categoria', categoria)
    if (fStockBajo) qs.set('stockBajo', '1')
    if (incluirInactivos) qs.set('inactivos', '1')
    try {
      const res = await fetch(`/api/productos?${qs}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setFilas(d.productos)
        setCategorias(d.categorias)
        setResumen(d.resumen)
      }
    } catch {}
  }, [busqueda, categoria, periodo, fStockBajo, fCaducidad, fVentas, incluirInactivos])

  useEffect(() => {
    fetch('/api/sesion', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSesion(d.sesion))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [cargar])

  const abrirDetalle = async (id: string) => {
    const res = await fetch(`/api/productos/${id}`, { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setDetalle(d)
    }
  }

  const notificar = (tipo: 'ok' | 'error', texto: string) => {
    setAviso({ tipo, texto })
    setTimeout(() => setAviso(null), 4000)
  }

  const exportar = () => {
    window.open(`/api/exportar?seccion=inventario`, '_blank')
  }

  return (
    <Shell>
      {/* Aviso flotante */}
      {aviso && (
        <div
          className={`fixed top-20 right-6 z-50 sp-animar rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            aviso.tipo === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-red-500/15 border-red-500/50 text-red-300'
          }`}
        >
          {aviso.tipo === 'ok' ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <AlertTriangle className="h-4 w-4" aria-hidden />
          )}
          {aviso.texto}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-emerald-400" aria-hidden />
            Inventarios
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Productos, lotes y caducidades en un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="sp-btn sp-btn-ghost" onClick={exportar} title="Descargar inventario en Excel">
            <Download className="h-4 w-4" aria-hidden /> Exportar
          </button>
          {esDueno && (
            <>
              <button className="sp-btn sp-btn-ghost" onClick={() => setDialogoImportar(true)} title="Importar inventario desde Excel">
                <Upload className="h-4 w-4" aria-hidden /> Importar
              </button>
              <button className="sp-btn sp-btn-primary" onClick={() => setDialogoAlta(true)}>
                <Plus className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden /> Agregar producto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" aria-hidden /> Productos
            </p>
            <p className="text-2xl font-extrabold mt-1">{resumen.totalProductos}</p>
          </div>
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Valor del inventario
            </p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-400">{dinero(resumen.valorInventario)}</p>
          </div>
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Por caducar ≤30 días
            </p>
            <p className={`text-2xl font-extrabold mt-1 ${resumen.enRiesgoCaducidad > 0 ? 'text-amber-400' : ''}`}>
              {resumen.enRiesgoCaducidad}
            </p>
          </div>
          <div className="sp-panel p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Stock bajo
            </p>
            <p className={`text-2xl font-extrabold mt-1 ${resumen.stockBajo > 0 ? 'text-red-400' : ''}`}>
              {resumen.stockBajo}
            </p>
          </div>
        </div>
      )}

      {/* Filtros (Bloque 2) */}
      <div className="sp-panel p-3.5 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden />
            <input
              className="sp-input !pl-9 !py-2"
              placeholder="Buscar por nombre, código o categoría…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select className="sp-input !py-2 !w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" aria-hidden /> Filtros:
          </span>
          <button
            className={`sp-btn !min-h-[36px] !py-1.5 !px-3 !text-[13px] ${fStockBajo ? 'sp-btn-danger' : 'sp-btn-ghost'}`}
            onClick={() => setFStockBajo((v) => !v)}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Stock bajo
          </button>
          <select
            className="sp-input !py-1.5 !min-h-[36px] !w-auto !text-[13px]"
            value={fCaducidad}
            onChange={(e) => setFCaducidad(e.target.value as typeof fCaducidad)}
            aria-label="Filtrar por caducidad"
          >
            <option value="todos">Caducidad: todas</option>
            <option value="30">Caducan ≤ 30 días</option>
            <option value="7">Caducan ≤ 7 días</option>
            <option value="vencidos">Vencidos</option>
          </select>
          <select
            className="sp-input !py-1.5 !min-h-[36px] !w-auto !text-[13px]"
            value={fVentas}
            onChange={(e) => setFVentas(e.target.value as typeof fVentas)}
            aria-label="Filtrar por ventas del periodo"
          >
            <option value="todos">Ventas: todos</option>
            <option value="con">Con ventas del periodo</option>
            <option value="sin">Sin ventas del periodo</option>
          </select>
          <select
            className="sp-input !py-1.5 !min-h-[36px] !w-auto !text-[13px]"
            value={periodo}
            onChange={(e) => setPeriodo(parseInt(e.target.value, 10))}
            aria-label="Periodo de ventas"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          {incluirInactivos && (
            <span className="sp-badge sp-badge-muted">inactivos incluidos</span>
          )}
          <button
            className="sp-btn sp-btn-ghost !min-h-[36px] !py-1.5 !px-3 !text-[13px] ml-auto"
            onClick={() => {
              setBusqueda(''); setCategoria(''); setFStockBajo(false)
              setFCaducidad('todos'); setFVentas('todos'); setPeriodo(30); setIncluirInactivos(false)
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Limpiar
          </button>
          {esDueno && (
            <button
              className="sp-btn sp-btn-ghost !min-h-[36px] !py-1.5 !px-3 !text-[13px]"
              onClick={() => setIncluirInactivos((v) => !v)}
            >
              {incluirInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
            </button>
          )}
        </div>
      </div>

      {/* Tabla del catálogo */}
      <div className="sp-panel overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-420px)] min-h-[200px]">
          <table className="sp-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Existencia</th>
                <th>Lotes</th>
                <th>Próx. caducidad</th>
                <th>Vendidos ({periodo}d)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas === null && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">Cargando inventario…</td></tr>
              )}
              {filas !== null && filas.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">
                  No hay productos con estos filtros. Agrega tu primer producto o ajusta los filtros.
                </td></tr>
              )}
              {filas?.map((f) => {
                const dias = diasParaCaducar(f.proximaCaducidad)
                return (
                  <tr key={f.id} onClick={() => abrirDetalle(f.id)}>
                    <td>
                      <p className="font-semibold leading-tight">{f.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        {f.categoria}
                        {f.codigo ? ` · ${f.codigo}` : ''}
                        {!f.activo ? ' · inactivo' : ''}
                      </p>
                    </td>
                    <td className="font-bold text-emerald-400">{dinero(f.precioVenta)}</td>
                    <td>
                      <span className={f.existencia <= f.minimo ? 'text-red-400 font-bold' : 'font-bold'}>
                        {numero(f.existencia)}
                      </span>
                    </td>
                    <td className="text-slate-400">{f.lotesCount}</td>
                    <td className="text-slate-300 text-[13px]">{f.proximaCaducidad ? fechaCorta(f.proximaCaducidad) : '—'}</td>
                    <td className="text-slate-300">{numero(f.vendidosPeriodo)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {f.existencia <= f.minimo && f.activo && (
                          <span className="sp-badge sp-badge-danger">stock bajo</span>
                        )}
                        {dias !== null && dias < 0 && <span className="sp-badge sp-badge-danger">vencido</span>}
                        {dias !== null && dias >= 0 && dias <= 7 && <span className="sp-badge sp-badge-warn">caduca ≤7d</span>}
                        {dias !== null && dias > 7 && dias <= 30 && <span className="sp-badge sp-badge-info">caduca ≤30d</span>}
                        {!f.activo && <span className="sp-badge sp-badge-muted">inactivo</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <PanelDetalle
          detalle={detalle}
          esDueno={!!esDueno}
          cerrar={() => setDetalle(null)}
          recargar={() => {
            cargar()
            if (detalle) abrirDetalle(detalle.producto.id)
          }}
          notificar={notificar}
        />
      )}

      {dialogoAlta && (
        <DialogoAlta
          cerrar={() => setDialogoAlta(false)}
          creado={(nombre) => {
            setDialogoAlta(false)
            notificar('ok', `Producto "${nombre}" agregado al inventario`)
            cargar()
          }}
          error={(t) => notificar('error', t)}
        />
      )}

      {dialogoImportar && (
        <DialogoImportar
          cerrar={() => setDialogoImportar(false)}
          listo={(resumenTexto) => {
            setDialogoImportar(false)
            notificar('ok', resumenTexto)
            cargar()
          }}
        />
      )}
    </Shell>
  )
}

/* ============================================================
   Panel de detalle del producto (Bloque 1: editar / eliminar / lotes)
   ============================================================ */
function PanelDetalle({
  detalle,
  esDueno,
  cerrar,
  recargar,
  notificar,
}: {
  detalle: Detalle
  esDueno: boolean
  cerrar: () => void
  recargar: () => void
  notificar: (t: 'ok' | 'error', x: string) => void
}) {
  const p = detalle.producto
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    nombre: p.nombre,
    categoria: p.categoria,
    codigo: p.codigo,
    precioVenta: String(p.precioVenta),
    costo: String(p.costo),
    minimo: String(p.minimo),
  })
  const [dialogoEntrada, setDialogoEntrada] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const guardarEdicion = async () => {
    if (ocupado) return
    setOcupado(true)
    try {
      const res = await fetch(`/api/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          categoria: form.categoria,
          codigo: form.codigo,
          precioVenta: Number(form.precioVenta) || 0,
          costo: Number(form.costo) || 0,
          minimo: Number(form.minimo) || 0,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        notificar('ok', 'Producto actualizado')
        setEditando(false)
        recargar()
      } else {
        notificar('error', d.mensaje || 'No se pudo guardar')
      }
    } finally {
      setOcupado(false)
    }
  }

  const alternarActivo = async () => {
    const res = await fetch(`/api/productos/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo }),
    })
    if (res.ok) {
      notificar('ok', p.activo ? 'Producto desactivado (no aparece en caja)' : 'Producto reactivado')
      recargar()
    }
  }

  const eliminar = async () => {
    if (ocupado) return
    setOcupado(true)
    try {
      const res = await fetch(`/api/productos/${p.id}?forzar=1`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) {
        notificar('ok', `"${p.nombre}" eliminado del inventario`)
        cerrar()
        recargar()
      } else {
        notificar('error', d.mensaje || 'No se pudo eliminar')
      }
    } finally {
      setOcupado(false)
    }
  }

  const ajustarLote = async (loteId: string, nuevaCantidad: number, esMerma: boolean) => {
    const res = await fetch(`/api/lotes/${loteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: nuevaCantidad, esMerma, motivo: esMerma ? 'Merma reportada' : 'Ajuste de conteo' }),
    })
    if (res.ok) {
      notificar('ok', 'Lote ajustado y registrado en la bitácora')
      recargar()
    } else {
      notificar('error', 'No se pudo ajustar el lote')
    }
  }

  const cambiarCaducidad = async (loteId: string, valor: string) => {
    const res = await fetch(`/api/lotes/${loteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caducidad: valor || null }),
    })
    if (res.ok) {
      notificar('ok', 'Caducidad actualizada')
      recargar()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label={`Detalle de ${p.nombre}`}>
      <div className="absolute inset-0 bg-black/60" onClick={cerrar} />
      <aside className="relative w-full max-w-xl h-full bg-[var(--sp-panel)] border-l border-[var(--sp-border)] overflow-y-auto sp-animar">
        {/* Encabezado */}
        <div className="sticky top-0 bg-[var(--sp-panel)] border-b border-[var(--sp-border)] p-5 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold truncate">{p.nombre}</h2>
            <p className="text-xs text-slate-400">
              {p.categoria}
              {p.codigo ? ` · código ${p.codigo}` : ''} · vendidos 90d: {numero(p.vendidos90)}
            </p>
          </div>
          <button className="sp-btn sp-btn-ghost !min-h-[36px] !w-[36px] !p-0" onClick={cerrar} aria-label="Cerrar">
            <X className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Datos y edición (Bloque 1) */}
          <section className="sp-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Datos del producto</h3>
              {esDueno && !editando && (
                <button className="sp-btn sp-btn-ghost !min-h-[34px] !py-1 !px-2.5 !text-[13px]" onClick={() => setEditando(true)}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                </button>
              )}
            </div>

            {!editando ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <dt className="text-slate-500">Precio de venta</dt>
                <dd className="font-bold text-emerald-400 text-right">{dinero(p.precioVenta)}</dd>
                <dt className="text-slate-500">Costo de referencia</dt>
                <dd className="text-right">{dinero(p.costo)}</dd>
                <dt className="text-slate-500">Existencia total</dt>
                <dd className="font-bold text-right">{numero(p.existencia)}</dd>
                <dt className="text-slate-500">Aviso de stock bajo</dt>
                <dd className="text-right">≤ {p.minimo} unidades</dd>
                <dt className="text-slate-500">Valor en inventario</dt>
                <dd className="text-right">{dinero(p.valorInventario)}</dd>
                <dt className="text-slate-500">Estado</dt>
                <dd className="text-right">{p.activo ? 'Activo' : 'Inactivo'}</dd>
              </dl>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs font-semibold text-slate-400">
                  Nombre
                  <input className="sp-input mt-1" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Categoría
                  <input className="sp-input mt-1" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Código (opcional)
                  <input className="sp-input mt-1" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Precio de venta
                  <input className="sp-input mt-1" inputMode="decimal" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value.replace(/[^\d.]/g, '') })} />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Costo
                  <input className="sp-input mt-1" inputMode="decimal" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value.replace(/[^\d.]/g, '') })} />
                </label>
                <label className="text-xs font-semibold text-slate-400">
                  Aviso stock bajo (unidades)
                  <input className="sp-input mt-1" inputMode="numeric" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value.replace(/[^\d]/g, '') })} />
                </label>
                <div className="col-span-2 flex gap-2">
                  <button className="sp-btn sp-btn-primary flex-1" onClick={guardarEdicion} disabled={ocupado}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Guardar cambios
                  </button>
                  <button className="sp-btn sp-btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </section>

          {/* Lotes */}
          <section className="sp-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">
                Lotes ({p.lotes.filter((l) => l.activo).length} activos)
              </h3>
              <button className="sp-btn sp-btn-primary !min-h-[34px] !py-1 !px-3 !text-[13px]" onClick={() => setDialogoEntrada(true)}>
                <PackagePlus className="h-4 w-4" aria-hidden /> Entrada de mercancía
              </button>
            </div>

            <div className="space-y-2.5">
              {p.lotes.length === 0 && (
                <p className="text-sm text-slate-500 py-3 text-center">
                  Este producto aún no tiene lotes. Registra una entrada de mercancía.
                </p>
              )}
              {p.lotes.map((l) => {
                const dias = diasParaCaducar(l.caducidad)
                return (
                  <div
                    key={l.id}
                    className={`rounded-xl border p-3 ${l.activo ? 'border-[var(--sp-border)] bg-[var(--sp-panel2)]' : 'border-slate-700 bg-slate-800/40 opacity-70'}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm">
                        <span className="font-extrabold">{numero(l.cantidad)}</span>
                        <span className="text-slate-500"> / {numero(l.cantidadInicial)} u.</span>
                        {l.proveedor && <span className="text-slate-400"> · {l.proveedor}</span>}
                        {l.costoUnitario > 0 && (
                          <span className="text-slate-500"> · costo {dinero(l.costoUnitario)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {dias === null ? null : dias < 0 ? (
                          <span className="sp-badge sp-badge-danger">vencido</span>
                        ) : dias <= 7 ? (
                          <span className="sp-badge sp-badge-warn">caduca en {dias}d</span>
                        ) : dias <= 30 ? (
                          <span className="sp-badge sp-badge-info">caduca en {dias}d</span>
                        ) : (
                          <span className="sp-badge sp-badge-ok">en regla</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                        Caduca:
                        <input
                          type="date"
                          className="sp-input !py-1 !px-2 !w-auto !text-[13px]"
                          value={aInputFecha(l.caducidad)}
                          onChange={(e) => cambiarCaducidad(l.id, e.target.value)}
                        />
                      </label>
                      {l.activo && (
                        <>
                          <button
                            className="sp-btn sp-btn-ghost !min-h-[30px] !py-1 !px-2 !text-[12px]"
                            onClick={() => {
                              const v = prompt(`Cantidad correcta del lote (conteo físico):`, String(l.cantidad))
                              if (v === null) return
                              const n = Number(v.replace(/[^\d.]/g, ''))
                              if (isNaN(n) || n < 0) return
                              if (n !== l.cantidad) ajustarLote(l.id, n, n < l.cantidad)
                            }}
                          >
                            Ajustar conteo
                          </button>
                          <button
                            className="sp-btn sp-btn-danger !min-h-[30px] !py-1 !px-2 !text-[12px]"
                            onClick={() => {
                              if (confirm(`¿Retirar el lote completo (${numero(l.cantidad)} u.) por merma? Se registra en la bitácora.`))
                                fetch(`/api/lotes/${l.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ activo: false, motivo: 'Merma: lote retirado' }),
                                }).then(() => recargar())
                            }}
                          >
                            Merma total
                          </button>
                        </>
                      )}
                      {!l.activo && (
                        <button
                          className="sp-btn sp-btn-ghost !min-h-[30px] !py-1 !px-2 !text-[12px]"
                          onClick={() =>
                            fetch(`/api/lotes/${l.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ activo: true }),
                            }).then(() => recargar())
                          }
                        >
                          Reactivar (sin cantidad)
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Bitácora */}
          <section className="sp-panel p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-3">
              Bitácora reciente
            </h3>
            {p.movimientos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
            ) : (
              <ul className="space-y-1.5">
                {p.movimientos.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-[13px]">
                    <span
                      className={`sp-badge ${
                        m.tipo === 'entrada'
                          ? 'sp-badge-ok'
                          : m.tipo === 'venta'
                          ? 'sp-badge-info'
                          : m.tipo === 'merma'
                          ? 'sp-badge-danger'
                          : 'sp-badge-muted'
                      }`}
                    >
                      {m.tipo}
                    </span>
                    <span className="font-semibold">{numero(m.cantidad)}</span>
                    <span className="text-slate-400 truncate flex-1">{m.motivo}</span>
                    <span className="text-slate-600 text-[11px] whitespace-nowrap">{fechaCorta(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Zona de acciones de dueño */}
          {esDueno && (
            <section className="sp-panel p-4 border-red-500/30">
              <h3 className="font-bold text-sm uppercase tracking-wider text-red-400/80 mb-3">
                Zona delicada
              </h3>
              <div className="flex flex-wrap gap-2">
                <button className="sp-btn sp-btn-ghost" onClick={alternarActivo}>
                  {p.activo ? 'Desactivar producto' : 'Reactivar producto'}
                </button>
                {!confirmarEliminar ? (
                  <button className="sp-btn sp-btn-danger" onClick={() => setConfirmarEliminar(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden /> Eliminar producto
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] text-red-300 font-semibold">
                      ¿Eliminar "{p.nombre}" y todos sus lotes? Esto no se puede deshacer.
                    </span>
                    <button className="sp-btn sp-btn-danger" onClick={eliminar} disabled={ocupado}>
                      Sí, eliminar
                    </button>
                    <button className="sp-btn sp-btn-ghost" onClick={() => setConfirmarEliminar(false)}>
                      Mejor no
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Si el producto tiene ventas, lo ideal es desactivarlo para conservar el historial.
              </p>
            </section>
          )}
        </div>
      </aside>

      {dialogoEntrada && (
        <DialogoEntrada
          productoId={p.id}
          cerrar={() => setDialogoEntrada(false)}
          listo={() => {
            setDialogoEntrada(false)
            notificar('ok', 'Entrada de mercancía registrada')
            recargar()
          }}
        />
      )}
    </div>
  )
}

/* ============================================================
   Diálogo: alta de producto (Bloque 1)
   ============================================================ */
function DialogoAlta({
  cerrar,
  creado,
  error,
}: {
  cerrar: () => void
  creado: (nombre: string) => void
  error: (t: string) => void
}) {
  const [f, setF] = useState({
    nombre: '',
    categoria: '',
    codigo: '',
    precioVenta: '',
    costo: '',
    minimo: '5',
    conLote: false,
    cantidad: '',
    caducidad: '',
    proveedor: '',
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (guardando) return
    if (f.nombre.trim().length < 2) {
      error('Escribe el nombre del producto')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: f.nombre,
          categoria: f.categoria || 'General',
          codigo: f.codigo,
          precioVenta: Number(f.precioVenta) || 0,
          costo: Number(f.costo) || 0,
          minimo: Number(f.minimo) || 0,
          loteInicial:
            f.conLote && Number(f.cantidad) > 0
              ? {
                  cantidad: Number(f.cantidad),
                  caducidad: f.caducidad || null,
                  proveedor: f.proveedor,
                  costoUnitario: Number(f.costo) || 0,
                }
              : null,
        }),
      })
      const d = await res.json()
      if (res.ok) creado(d.producto.nombre)
      else error(d.mensaje || 'No se pudo crear el producto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Agregar producto">
      <div className="absolute inset-0 bg-black/60" onClick={cerrar} />
      <div className="relative sp-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto sp-animar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-400" aria-hidden /> Agregar producto
          </h2>
          <button className="sp-btn sp-btn-ghost !min-h-[36px] !w-[36px] !p-0" onClick={cerrar} aria-label="Cerrar">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs font-semibold text-slate-400">
            Nombre del producto *
            <input className="sp-input mt-1" autoFocus value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Leche Entera 1L" />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Categoría
            <input className="sp-input mt-1" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ej. Abarrotes" />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Código / barra (opcional)
            <input className="sp-input mt-1" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Precio de venta *
            <input className="sp-input mt-1" inputMode="decimal" value={f.precioVenta} onChange={(e) => setF({ ...f, precioVenta: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Costo (opcional)
            <input className="sp-input mt-1" inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Aviso de stock bajo
            <input className="sp-input mt-1" inputMode="numeric" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value.replace(/[^\d]/g, '') })} />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--sp-border)] p-4">
          <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-500"
              checked={f.conLote}
              onChange={(e) => setF({ ...f, conLote: e.target.checked })}
            />
            Registrar mercancía inicial (lote)
          </label>
          {f.conLote && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="text-xs font-semibold text-slate-400">
                Cantidad *
                <input className="sp-input mt-1" inputMode="decimal" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value.replace(/[^\d.]/g, '') })} />
              </label>
              <label className="text-xs font-semibold text-slate-400">
                Caducidad (opcional)
                <input type="date" className="sp-input mt-1" value={f.caducidad} onChange={(e) => setF({ ...f, caducidad: e.target.value })} />
              </label>
              <label className="col-span-2 text-xs font-semibold text-slate-400">
                Proveedor (opcional)
                <input className="sp-input mt-1" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} />
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button className="sp-btn sp-btn-primary flex-1" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar producto'}
          </button>
          <button className="sp-btn sp-btn-ghost" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Diálogo: entrada de mercancía (nuevo lote)
   ============================================================ */
function DialogoEntrada({
  productoId,
  cerrar,
  listo,
}: {
  productoId: string
  cerrar: () => void
  listo: () => void
}) {
  const [f, setF] = useState({ cantidad: '', caducidad: '', proveedor: '', costoUnitario: '' })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (guardando || Number(f.cantidad) <= 0) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/productos/${productoId}/lotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: Number(f.cantidad),
          caducidad: f.caducidad || null,
          proveedor: f.proveedor,
          costoUnitario: Number(f.costoUnitario) || 0,
        }),
      })
      if (res.ok) listo()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-label="Entrada de mercancía">
      <div className="absolute inset-0 bg-black/60" onClick={cerrar} />
      <div className="relative sp-panel p-6 w-full max-w-md sp-animar">
        <h2 className="text-lg font-extrabold mb-1 flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-emerald-400" aria-hidden /> Entrada de mercancía
        </h2>
        <p className="text-xs text-slate-400 mb-4">Se crea un lote nuevo y queda en la bitácora.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-400">
            Cantidad que entra *
            <input className="sp-input mt-1" autoFocus inputMode="decimal" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Caducidad
            <input type="date" className="sp-input mt-1" value={f.caducidad} onChange={(e) => setF({ ...f, caducidad: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Proveedor
            <input className="sp-input mt-1" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-400">
            Costo por unidad
            <input className="sp-input mt-1" inputMode="decimal" value={f.costoUnitario} onChange={(e) => setF({ ...f, costoUnitario: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="sp-btn sp-btn-primary flex-1" onClick={guardar} disabled={guardando || Number(f.cantidad) <= 0}>
            {guardando ? 'Registrando…' : 'Registrar entrada'}
          </button>
          <button className="sp-btn sp-btn-ghost" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Diálogo: importar Excel (Bloque 3)
   ============================================================ */
function DialogoImportar({
  cerrar,
  listo,
}: {
  cerrar: () => void
  listo: (resumen: string) => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState<{ resumen: { filas: number; creados: number; actualizados: number; errores: number }; resultados: { fila: number; nombre: string; accion: string; detalle: string }[] } | null>(null)
  const [fallo, setFallo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const enviar = async () => {
    if (!archivo || procesando) return
    setProcesando(true)
    setFallo('')
    try {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const res = await fetch('/api/importar', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) {
        setResultado(d)
      } else {
        setFallo(d.mensaje || 'No se pudo importar el archivo')
      }
    } catch {
      setFallo('No se pudo enviar el archivo')
    } finally {
      setProcesando(false)
    }
  }

  const descargarPlantilla = () => {
    // Genera la plantilla localmente para que el dueño vea el formato
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet([
        {
          Nombre: 'Leche Entera 1L',
          Categoria: 'Lácteos',
          Codigo: '7501234567890',
          Precio: 24.5,
          Costo: 18,
          Minimo: 6,
          Existencia: 24,
          Caducidad: '2026-12-15',
          Proveedor: 'Lacteos del Valle',
          CostoUnitario: 18,
        },
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'Productos')
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Plantilla-Inventario-Sell-Plus.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Importar Excel">
      <div className="absolute inset-0 bg-black/60" onClick={cerrar} />
      <div className="relative sp-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto sp-animar">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-400" aria-hidden /> Importar inventario
          </h2>
          <button className="sp-btn sp-btn-ghost !min-h-[36px] !w-[36px] !p-0" onClick={cerrar} aria-label="Cerrar">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Crea o actualiza productos desde Excel. Nunca borra información: solo agrega existencia y datos.
        </p>

        {!resultado ? (
          <>
            <button
              className="w-full rounded-xl border-2 border-dashed border-[var(--sp-border)] hover:border-emerald-500/60 p-8 text-center transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-slate-500 mb-2" aria-hidden />
              <p className="text-sm font-semibold">{archivo ? archivo.name : 'Toca para elegir tu archivo Excel'}</p>
              <p className="text-xs text-slate-500 mt-1">.xlsx, .xls o .csv</p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />

            <div className="mt-4 text-xs text-slate-400 rounded-xl bg-[var(--sp-panel2)] border border-[var(--sp-border)] p-3.5">
              <p className="font-bold text-slate-300 mb-1.5">Columnas que entiende Sell-Plus:</p>
              <p>Nombre · Categoria · Codigo · Precio · Costo · Minimo · Existencia · Caducidad (2026-12-31 o 31/12/2026) · Proveedor · CostoUnitario</p>
              <button className="text-emerald-400 font-semibold underline underline-offset-2 mt-2" onClick={descargarPlantilla}>
                Descargar plantilla de ejemplo
              </button>
            </div>

            {fallo && <p className="text-sm text-red-400 mt-3">{fallo}</p>}

            <div className="flex gap-2 mt-5">
              <button className="sp-btn sp-btn-primary flex-1" onClick={enviar} disabled={!archivo || procesando}>
                {procesando ? 'Importando…' : 'Importar'}
              </button>
              <button className="sp-btn sp-btn-ghost" onClick={cerrar}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-4 mb-4">
              <p className="font-bold text-emerald-300 flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Importación terminada
              </p>
              <p className="text-sm">
                {resultado.resumen.creados} productos nuevos · {resultado.resumen.actualizados} actualizados
                {resultado.resumen.errores > 0 ? ` · ${resultado.resumen.errores} con problema` : ''}
              </p>
            </div>
            {resultado.resultados.length > 0 && (
              <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--sp-border)]">
                <table className="sp-tabla">
                  <thead>
                    <tr><th>Fila</th><th>Producto</th><th>Resultado</th></tr>
                  </thead>
                  <tbody>
                    {resultado.resultados.map((r, i) => (
                      <tr key={i} className="!cursor-default">
                        <td className="text-slate-500">{r.fila}</td>
                        <td className="font-semibold">{r.nombre}</td>
                        <td>
                          <span
                            className={`sp-badge ${
                              r.accion === 'creado' ? 'sp-badge-ok' : r.accion === 'actualizado' ? 'sp-badge-info' : 'sp-badge-danger'
                            }`}
                          >
                            {r.accion}
                          </span>
                          <span className="text-xs text-slate-400 ml-1.5">{r.detalle}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="sp-btn sp-btn-primary w-full mt-4" onClick={() => listo(`Inventario importado: ${resultado.resumen.creados} nuevos, ${resultado.resumen.actualizados} actualizados`)}>
              Terminar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
