import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { exigirDueno } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/**
 * POST — IMPORTAR inventario desde Excel (.xlsx / .xls / .csv).
 * Recibe multipart/form-data con campo "archivo".
 *
 * Hoja esperada "Productos" (o la primera hoja) con columnas:
 *   Nombre (obligatorio) | Categoria | Codigo | Precio | Costo | Minimo |
 *   Existencia | Caducidad (AAAA-MM-DD) | Proveedor | CostoUnitario
 *
 * Reglas:
 *  - Si el producto existe por Código (o por Nombre si no hay código): se
 *    actualizan sus datos y se SUMA la existencia como lote nuevo.
 *  - Si no existe: se crea con su lote inicial.
 *  - Nunca borra nada: solo crea/actualiza.
 */
export async function POST(req: NextRequest) {
  const r = await exigirDueno()
  if (!r.ok) return r.respuesta

  const form = await req.formData().catch(() => null)
  const archivo = form?.get('archivo')
  if (!archivo || typeof archivo === 'string') {
    return NextResponse.json(
      { error: 'sin_archivo', mensaje: 'Adjunta el archivo Excel a importar.' },
      { status: 400 }
    )
  }

  let libro: XLSX.WorkBook
  try {
    const buffer = Buffer.from(await archivo.arrayBuffer())
    libro = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  } catch {
    return NextResponse.json(
      { error: 'archivo_invalido', mensaje: 'No se pudo leer el archivo. ¿Es un Excel o CSV válido?' },
      { status: 400 }
    )
  }

  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (!hoja) {
    return NextResponse.json(
      { error: 'sin_hojas', mensaje: 'El archivo no tiene hojas de datos.' },
      { status: 400 }
    )
  }

  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })

  // Normalizador de encabezados (acepta variantes)
  const norm = (s: unknown) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const num = (v: unknown, def = 0): number => {
    if (v === '' || v === null || v === undefined) return def
    const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
    return isNaN(n) ? def : Math.max(0, n)
  }

  const aFecha = (v: unknown): Date | null => {
    if (!v) return null
    if (v instanceof Date && !isNaN(v.getTime())) return v
    const s = String(v).trim()
    if (!s) return null
    // AAAA-MM-DD o DD/MM/AAAA
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  const resultados: {
    fila: number
    nombre: string
    accion: 'creado' | 'actualizado' | 'error'
    detalle: string
  }[] = []

  let creados = 0
  let actualizados = 0
  let errores = 0

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    let nombre = '', categoria = '', codigo = '', precio = '', costo = '', minimo = '', existencia = '', caducidad = '', proveedor = '', costoUnitario = ''
    for (const [k, v] of Object.entries(fila)) {
      const nk = norm(k)
      if (nk.startsWith('nombre') || nk === 'producto') nombre = String(v).trim()
      else if (nk.startsWith('categoria')) categoria = String(v).trim()
      else if (nk === 'codigo' || nk.startsWith('código')) codigo = String(v).trim()
      else if (nk.startsWith('precio')) precio = v
      else if (nk === 'costo' || nk.startsWith('costo ')) costo = v
      else if (nk.startsWith('minimo') || nk.startsWith('mínimo')) minimo = v
      else if (nk.startsWith('existencia') || nk.startsWith('cantidad') || nk.startsWith('stock')) existencia = v
      else if (nk.startsWith('caducidad') || nk.startsWith('vencimiento')) caducidad = v
      else if (nk.startsWith('proveedor')) proveedor = String(v).trim()
      else if (nk.startsWith('costounit') || nk.startsWith('costo unit')) costoUnitario = v
    }

    if (!nombre) continue // fila vacía
    if (nombre.length < 2) {
      errores++
      resultados.push({ fila: i + 2, nombre, accion: 'error', detalle: 'Nombre demasiado corto' })
      continue
    }

    try {
      const precioVenta = num(precio)
      const costoVal = num(costo)
      const minimoVal = Math.round(num(minimo, 5))
      const existenciaVal = num(existencia)
      const cadVal = aFecha(caducidad)
      const costoUnit = existenciaVal > 0 ? (num(costoUnitario) || costoVal) : 0

      // Buscar por código, luego por nombre
      let producto = null
      if (codigo) producto = await db.producto.findFirst({ where: { codigo } })
      if (!producto) producto = await db.producto.findFirst({ where: { nombre } })

      if (producto) {
        await db.producto.update({
          where: { id: producto.id },
          data: {
            categoria: categoria || producto.categoria,
            precioVenta: precioVenta || producto.precioVenta,
            costo: costoVal || producto.costo,
            minimo: minimoVal ?? producto.minimo,
            activo: true,
          },
        })
        if (existenciaVal > 0) {
          await db.lote.create({
            data: {
              productoId: producto.id,
              cantidad: existenciaVal,
              cantidadInicial: existenciaVal,
              caducidad: cadVal,
              proveedor,
              costoUnitario: costoUnit,
            },
          })
          await db.movimientoInventario.create({
            data: {
              productoId: producto.id,
              tipo: 'entrada',
              cantidad: existenciaVal,
              motivo: 'Importación de Excel',
              usuario: r.sesion.nombre,
            },
          })
        }
        actualizados++
        resultados.push({
          fila: i + 2,
          nombre,
          accion: 'actualizado',
          detalle: existenciaVal > 0 ? `+${existenciaVal} de existencia` : 'datos actualizados',
        })
      } else {
        const nuevo = await db.producto.create({
          data: {
            nombre: nombre.slice(0, 120),
            categoria: categoria || 'General',
            codigo,
            precioVenta,
            costo: costoVal,
            minimo: minimoVal,
          },
        })
        if (existenciaVal > 0) {
          await db.lote.create({
            data: {
              productoId: nuevo.id,
              cantidad: existenciaVal,
              cantidadInicial: existenciaVal,
              caducidad: cadVal,
              proveedor,
              costoUnitario: costoUnit,
            },
          })
          await db.movimientoInventario.create({
            data: {
              productoId: nuevo.id,
              tipo: 'entrada',
              cantidad: existenciaVal,
              motivo: 'Importación de Excel',
              usuario: r.sesion.nombre,
            },
          })
        }
        creados++
        resultados.push({ fila: i + 2, nombre, accion: 'creado', detalle: 'producto nuevo' })
      }
    } catch (e) {
      errores++
      resultados.push({
        fila: i + 2,
        nombre,
        accion: 'error',
        detalle: e instanceof Error ? e.message.slice(0, 120) : 'error desconocido',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    resumen: { filas: filas.length, creados, actualizados, errores },
    resultados,
  })
}
