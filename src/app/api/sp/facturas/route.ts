import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { CORS_HEADERS } from '@/lib/central'
import { rfcValido } from '@/lib/fiscal'
import { intentarTimbrarInterno } from '@/lib/fiscal-proceso'

export const dynamic = 'force-dynamic'

/**
 * CipherPoint 7.0.9 «Cifra Fiscal» — puente de facturación CFDI 4.0.
 * El POS del dueño (PC local) manda solicitudes de timbrado; esta ruta
 * guarda la cola y al consultar estado intenta timbrar con el PAC
 * configurado (o en modo SIMULADO para pruebas). Cada llamada del POS
 * lleva su «clave de tienda» (se obtiene con accion=activar).
 */

const ID_CLAVE = /^[A-Za-z0-9._:-]{1,120}$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'cuerpo_invalido' }, { status: 400, headers: CORS_HEADERS })
  }
  const b = body as Record<string, unknown>
  const accion = String(b.accion || '')

  // — Activar tienda (sin clave: registra el RFC o devuelve la clave guardada) —
  if (accion === 'activar') {
    const rfc = String(b.rfc || '').trim().toUpperCase()
    const nombre = String(b.nombre || '').trim().slice(0, 200)
    if (!rfcValido(rfc)) {
      return NextResponse.json({ ok: false, error: 'rfc_invalido', mensaje: 'El RFC del emisor no es válido (12 o 13 caracteres).' }, { status: 400, headers: CORS_HEADERS })
    }
    const existente = await db.facturaTienda.findUnique({ where: { rfc } })
    const clave = existente?.clave || ('spf-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24))
    const tienda = await db.facturaTienda.upsert({
      where: { rfc },
      update: { nombre, ultima: new Date() },
      create: { clave, rfc, nombre },
    })
    return NextResponse.json({ ok: true, clave: tienda.clave, rfc, nombre: tienda.nombre }, { headers: CORS_HEADERS })
  }

  // — Todo lo demás requiere la clave de tienda —
  const clave = req.headers.get('x-tienda-clave') || ''
  if (!clave) {
    return NextResponse.json({ ok: false, error: 'sin_clave', mensaje: 'Conecta tu PC con la Central primero (botón Conectar).' }, { status: 401, headers: CORS_HEADERS })
  }
  const tienda = await db.facturaTienda.findUnique({ where: { clave } })
  if (!tienda) {
    return NextResponse.json({ ok: false, error: 'clave_invalida', mensaje: 'La clave de tienda no es válida. Reconecta desde la PC.' }, { status: 401, headers: CORS_HEADERS })
  }
  const pref = tienda.clave + '::'

  if (accion === 'enviar') {
    const fx = b.factura as Record<string, unknown> | undefined
    if (!fx) return NextResponse.json({ ok: false, error: 'falta_factura' }, { status: 400, headers: CORS_HEADERS })
    const idLocal = String(fx.idLocal || '')
    if (!ID_CLAVE.test(idLocal)) return NextResponse.json({ ok: false, error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
    const datos = {
      id: pref + idLocal,
      claveTienda: tienda.clave,
      rfcEmisor: tienda.rfc,
      serie: String(fx.serie || 'A').slice(0, 10),
      folio: Math.max(0, Math.round(Number(fx.folio || 0))),
      formaPago: String(fx.formaPago || 'PUE') === 'PPD' ? 'PPD' : 'PUE',
      metodoPago: String(fx.metodoPago || '01').slice(0, 2),
      emisorJson: JSON.stringify(fx.emisor || {}),
      receptorJson: JSON.stringify(fx.receptor || {}),
      conceptosJson: JSON.stringify(Array.isArray(fx.conceptos) ? fx.conceptos.slice(0, 300) : []),
      tasaIva: Math.max(0, Math.min(30, Number(fx.tasaIva ?? 16))),
      estado: 'pendiente',
      error: null,
      simulado: false,
    }
    const fila = await db.facturaCola.upsert({ where: { id: datos.id }, update: datos, create: datos })
    return NextResponse.json({ ok: true, idLocal, estado: fila.estado }, { headers: CORS_HEADERS })
  }

  if (accion === 'estado') {
    const idLocal = String(b.idLocal || '')
    if (!ID_CLAVE.test(idLocal)) return NextResponse.json({ ok: false, error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
    const id = pref + idLocal
    const fila = await db.facturaCola.findUnique({ where: { id } })
    if (!fila) return NextResponse.json({ ok: false, error: 'no_existe', mensaje: 'Esa factura no está en la cola de la Central.' }, { status: 404, headers: CORS_HEADERS })
    if (fila.estado === 'pendiente') await intentarTimbrarInterno(id)
    const f2 = await db.facturaCola.findUnique({ where: { id } })
    return NextResponse.json({
      ok: true, idLocal, estado: f2?.estado, uuid: f2?.uuid, serieSat: f2?.serieSat,
      fechaTimbrado: f2?.fechaTimbrado, error: f2?.error, simulado: f2?.simulado,
      xml: f2?.xml || null,
    }, { headers: CORS_HEADERS })
  }

  if (accion === 'estados') {
    const ids = Array.isArray(b.idsLocal) ? (b.idsLocal as string[]).slice(0, 200) : []
    const validos = ids.filter((x) => ID_CLAVE.test(x)).map((x) => pref + x)
    let filas = await db.facturaCola.findMany({ where: { id: { in: validos } } })
    const pendientes = filas.filter((f) => f.estado === 'pendiente').slice(0, 10)
    for (const p of pendientes) {
      try { await intentarTimbrarInterno(p.id) } catch { /* sigue con la siguiente */ }
    }
    if (pendientes.length) filas = await db.facturaCola.findMany({ where: { id: { in: validos } } })
    return NextResponse.json({
      ok: true,
      estados: filas.map((f) => ({
        idLocal: f.id.slice(pref.length), estado: f.estado, uuid: f.uuid, fechaTimbrado: f.fechaTimbrado,
        error: f.error, simulado: f.simulado,
      })),
    }, { headers: CORS_HEADERS })
  }

  if (accion === 'reintentar') {
    const idLocal = String(b.idLocal || '')
    if (!ID_CLAVE.test(idLocal)) return NextResponse.json({ ok: false, error: 'id_invalido' }, { status: 400, headers: CORS_HEADERS })
    await db.facturaCola.updateMany({ where: { id: pref + idLocal, estado: 'error' }, data: { estado: 'pendiente', error: null } })
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }

  return NextResponse.json({ ok: false, error: 'accion_invalida' }, { status: 400, headers: CORS_HEADERS })
}

export async function GET() {
  // Salud del puente fiscal + configuración visible (sin secretos)
  const modo = (await db.facturaConfig.findUnique({ where: { clave: 'pac-modo' } }))?.valor || 'ninguno'
  const csdNo = (await db.facturaConfig.findUnique({ where: { clave: 'csd-no' } }))?.valor || ''
  return NextResponse.json({
    ok: true, modulo: 'facturas', version: '7.0.9',
    pac: modo, csdCargado: !!csdNo,
  }, { headers: CORS_HEADERS })
}
