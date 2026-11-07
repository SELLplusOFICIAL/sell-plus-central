import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirSesion, exigirDueno } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/**
 * GET — Catálogo de productos con agregados de inventario:
 * existencia total, lotes activos, próxima caducidad y ventas del periodo.
 * Query: ?busqueda=&categoria=&periodo=30&ventas=con|sin|todos&caducidad=todos|30|vencidos&stockBajo=1
 */
export async function GET(req: NextRequest) {
  const r = await exigirSesion()
  if (!r.ok) return r.respuesta

  const sp = req.nextUrl.searchParams
  const busqueda = (sp.get('busqueda') || '').trim().toLowerCase()
  const categoria = (sp.get('categoria') || '').trim()
  const periodo = Math.max(1, Math.min(365, parseInt(sp.get('periodo') || '30', 10) || 30))
  const filtroVentas = sp.get('ventas') || 'todos' // todos | con | sin
  const filtroCaducidad = sp.get('caducidad') || 'todos' // todos | 30 | 7 | vencidos
  const soloStockBajo = sp.get('stockBajo') === '1'
  const incluirInactivos = sp.get('inactivos') === '1'

  const desde = new Date(Date.now() - periodo * 86400000)

  const productos = await db.producto.findMany({
    where: {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda } },
              { codigo: { contains: busqueda } },
              { categoria: { contains: busqueda } },
            ],
          }
        : {}),
      ...(categoria ? { categoria } : {}),
    },
    include: {
      lotes: { where: { activo: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  // Ventas del periodo por producto
  const ventasPeriodo = await db.ventaItem.groupBy({
    by: ['productoId'],
    where: { venta: { createdAt: { gte: desde } } },
    _sum: { cantidad: true },
  })
  const vendidosMap = new Map(ventasPeriodo.map((v) => [v.productoId, v._sum.cantidad ?? 0]))

  const ahora = new Date()
  const limite30 = new Date(ahora.getTime() + 30 * 86400000)
  const limite7 = new Date(ahora.getTime() + 7 * 86400000)

  const filas = productos.map((p) => {
    const lotesActivos = p.lotes
    const existencia = lotesActivos.reduce((s, l) => s + l.cantidad, 0)
    const proxima = lotesActivos
      .filter((l) => l.caducidad && l.cantidad > 0)
      .map((l) => l.caducidad as Date)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    const costosInventario = lotesActivos.reduce((s, l) => s + l.cantidad * l.costoUnitario, 0)

    return {
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      codigo: p.codigo,
      precioVenta: p.precioVenta,
      costo: p.costo,
      minimo: p.minimo,
      activo: p.activo,
      existencia,
      valorInventario: costosInventario,
      lotesCount: lotesActivos.length,
      proximaCaducidad: proxima ? proxima.toISOString() : null,
      vendidosPeriodo: vendidosMap.get(p.id) ?? 0,
    }
  })

  let filtradas = filas
  if (soloStockBajo) filtradas = filtradas.filter((f) => f.existencia <= f.minimo)
  if (filtroVentas === 'con') filtradas = filtradas.filter((f) => f.vendidosPeriodo > 0)
  if (filtroVentas === 'sin') filtradas = filtradas.filter((f) => f.vendidosPeriodo === 0)
  if (filtroCaducidad === '30')
    filtradas = filtradas.filter(
      (f) => f.proximaCaducidad && new Date(f.proximaCaducidad) <= limite30
    )
  if (filtroCaducidad === '7')
    filtradas = filtradas.filter(
      (f) => f.proximaCaducidad && new Date(f.proximaCaducidad) <= limite7
    )
  if (filtroCaducidad === 'vencidos')
    filtradas = filtradas.filter(
      (f) => f.proximaCaducidad && new Date(f.proximaCaducidad) < ahora
    )

  const categorias = Array.from(
    new Set((await db.producto.findMany({ select: { categoria: true }, distinct: ['categoria'] })).map((c) => c.categoria))
  ).sort()

  const resumen = {
    totalProductos: filtradas.length,
    valorInventario: filtradas.reduce((s, f) => s + f.valorInventario, 0),
    enRiesgoCaducidad: filtradas.filter((f) => {
      if (!f.proximaCaducidad) return false
      const c = new Date(f.proximaCaducidad)
      return c <= limite30
    }).length,
    stockBajo: filtradas.filter((f) => f.existencia <= f.minimo).length,
  }

  return NextResponse.json({ productos: filtradas, categorias, resumen, periodo })
}

/** POST — crear producto (dueño) */
export async function POST(req: NextRequest) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta

  const body = await req.json().catch(() => null)
  const nombre = String(body?.nombre ?? '').trim()
  if (nombre.length < 2) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'Escribe el nombre del producto.' },
      { status: 400 }
    )
  }

  const producto = await db.producto.create({
    data: {
      nombre: nombre.slice(0, 120),
      categoria: String(body?.categoria ?? 'General').trim().slice(0, 60) || 'General',
      codigo: String(body?.codigo ?? '').trim().slice(0, 60),
      precioVenta: Math.max(0, Number(body?.precioVenta ?? 0)),
      costo: Math.max(0, Number(body?.costo ?? 0)),
      minimo: Math.max(0, Math.round(Number(body?.minimo ?? 5))),
      activo: body?.activo !== false,
    },
  })

  // Opcional: primer lote al crear
  const cantidadInicial = Number(body?.loteInicial?.cantidad ?? 0)
  if (cantidadInicial > 0) {
    const cad = body?.loteInicial?.caducidad ? new Date(body.loteInicial.caducidad) : null
    await db.lote.create({
      data: {
        productoId: producto.id,
        cantidad: cantidadInicial,
        cantidadInicial,
        caducidad: cad && !isNaN(cad.getTime()) ? cad : null,
        proveedor: String(body?.loteInicial?.proveedor ?? '').slice(0, 120),
        costoUnitario: Math.max(0, Number(body?.loteInicial?.costoUnitario ?? body?.costo ?? 0)),
      },
    })
    await db.movimientoInventario.create({
      data: {
        productoId: producto.id,
        tipo: 'entrada',
        cantidad: cantidadInicial,
        motivo: 'Alta de producto',
        usuario: r.sesion.nombre,
      },
    })
  }

  return NextResponse.json({ ok: true, producto }, { status: 201 })
}
