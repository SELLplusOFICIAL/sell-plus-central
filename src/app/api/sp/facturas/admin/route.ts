import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { CORS_HEADERS, esAdminValido } from '@/lib/central'
import { csdDeArchivos, cifrarSecreto, rfcValido } from '@/lib/fiscal'
import { intentarTimbrarInterno } from '@/lib/fiscal-proceso'

export const dynamic = 'force-dynamic'

/**
 * CipherPoint 7.0.9 «Cifra Fiscal» — administración del puente.
 * Modo Admin de la Central (llave x-central-key):
 *  - Configurar el PAC (simulado para pruebas / REST genérico real)
 *  - Cargar el CSD del emisor (se guarda CIFRADO con AES-256-GCM)
 *  - Ver tiendas conectadas y la cola de facturación
 *  - Procesar la cola / reintentar / limpiar
 */

const SECRETOS = { pacToken: 'pac-token', csdKey: 'csd-key-pem', csdPass: 'csd-pass' }

async function cfg(clave: string): Promise<string> {
  const f = await db.facturaConfig.findUnique({ where: { clave } })
  return f?.valor || ''
}

async function setCfg(clave: string, valor: string): Promise<void> {
  await db.facturaConfig.upsert({ where: { clave }, update: { valor }, create: { clave, valor } })
}

export async function GET(req: NextRequest) {
  if (!esAdminValido(req)) return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  const [pacModo, pacUrl, pacTokenCif, csdNo, csdCer, csdKeyCif, csdPassCif] = await Promise.all([
    cfg('pac-modo'), cfg('pac-url'), cfg(SECRETOS.pacToken), cfg('csd-no'), cfg('csd-cer'), cfg(SECRETOS.csdKey), cfg(SECRETOS.csdPass),
  ])
  const tiendas = await db.facturaTienda.findMany({ orderBy: { creada: 'desc' }, take: 100 })
  const cola = await db.facturaCola.findMany({ orderBy: { creada: 'desc' }, take: 200 })
  return NextResponse.json({
    ok: true,
    pac: { modo: pacModo || 'ninguno', url: pacUrl, tokenConfigurado: !!pacTokenCif },
    csd: { cargado: !!csdKeyCif && !!csdCer, noCertificado: csdNo, tieneContrasena: !!csdPassCif },
    tiendas: tiendas.map((t) => ({ rfc: t.rfc, nombre: t.nombre, clave: t.clave, creada: t.creada, ultima: t.ultima })),
    cola: cola.map((f) => ({
      id: f.id, idLocal: f.id.split('::')[1] || f.id, tienda: f.claveTienda.slice(0, 12) + '…',
      serie: f.serie, folio: f.folio, rfcReceptor: (JSON.parse(f.receptorJson || '{}') as { rfc?: string }).rfc || '',
      nombreReceptor: (JSON.parse(f.receptorJson || '{}') as { nombre?: string }).nombre || '',
      total: f.conceptosJson ? (JSON.parse(f.conceptosJson || '[]') as { precio?: number; cantidad?: number }[]).reduce((a, c) => a + (Number(c.precio || 0) * Number(c.cantidad || 0)), 0) : 0,
      estado: f.estado, uuid: f.uuid, fechaTimbrado: f.fechaTimbrado, error: f.error, simulado: f.simulado, intentos: f.intentos,
      creada: f.creada,
    })),
  }, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  if (!esAdminValido(req)) return NextResponse.json({ error: 'no_autorizado' }, { status: 401, headers: CORS_HEADERS })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'cuerpo_invalido' }, { status: 400, headers: CORS_HEADERS })
  const b = body as Record<string, unknown>
  const accion = String(b.accion || '')

  if (accion === 'config-pac') {
    const modo = String(b.modo || 'ninguno')
    if (!['ninguno', 'simulado', 'rest'].includes(modo)) return NextResponse.json({ ok: false, error: 'modo_invalido', mensaje: 'Modo de PAC no reconocido.' }, { status: 400, headers: CORS_HEADERS })
    await setCfg('pac-modo', modo)
    if (typeof b.url === 'string') await setCfg('pac-url', b.url.trim().slice(0, 300))
    if (typeof b.token === 'string' && b.token) await setCfg(SECRETOS.pacToken, cifrarSecreto(b.token.slice(0, 500)))
    return NextResponse.json({ ok: true, pac: { modo, url: await cfg('pac-url') } }, { headers: CORS_HEADERS })
  }

  if (accion === 'csd') {
    const cerB64 = String(b.cerB64 || '').replace(/\s+/g, '')
    const keyB64 = String(b.keyB64 || '').replace(/\s+/g, '')
    const pass = String(b.contrasena || '')
    if (!cerB64 || !keyB64 || !pass) return NextResponse.json({ ok: false, error: 'falta_datos', mensaje: 'Manda el .cer, la .key y su contraseña.' }, { status: 400, headers: CORS_HEADERS })
    try {
      const csd = csdDeArchivos(cerB64, keyB64, pass)
      await setCfg('csd-cer', csd.certificadoB64)
      await setCfg('csd-no', csd.noCertificado)
      await setCfg(SECRETOS.csdKey, cifrarSecreto(csd.keyPem))
      await setCfg(SECRETOS.csdPass, cifrarSecreto(pass))
      return NextResponse.json({ ok: true, noCertificado: csd.noCertificado }, { headers: CORS_HEADERS })
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'csd_invalido', mensaje: 'El CSD no pudo abrirse: verifica que sean el .cer y la .key correctos con su contraseña. (' + (e instanceof Error ? e.message.slice(0, 140) : 'error') + ')' }, { status: 400, headers: CORS_HEADERS })
    }
  }

  if (accion === 'quitar-csd') {
    await setCfg('csd-cer', ''); await setCfg('csd-no', ''); await setCfg(SECRETOS.csdKey, ''); await setCfg(SECRETOS.csdPass, '')
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }

  if (accion === 'procesar') {
    const pendientes = await db.facturaCola.findMany({ where: { estado: 'pendiente' }, orderBy: { creada: 'asc' }, take: 50 })
    let timbradas = 0, errores = 0, sinCambio = 0
    for (const f of pendientes) {
      try {
        const r = await intentarTimbrarInterno(f.id)
        if (r === 'timbrada') timbradas++
        else if (r === 'error') errores++
        else sinCambio++
      } catch { errores++ }
    }
    return NextResponse.json({ ok: true, procesadas: pendientes.length, timbradas, errores, sinCambio }, { headers: CORS_HEADERS })
  }

  if (accion === 'reintentar') {
    const id = String(b.id || '')
    await db.facturaCola.updateMany({ where: { id, estado: 'error' }, data: { estado: 'pendiente', error: null } })
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }

  if (accion === 'limpiar') {
    await db.facturaCola.deleteMany({})
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }

  if (accion === 'rotar-clave') {
    const rfc = String(b.rfc || '').trim().toUpperCase()
    if (!rfcValido(rfc)) return NextResponse.json({ ok: false, error: 'rfc_invalido' }, { status: 400, headers: CORS_HEADERS })
    const nueva = 'spf-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    await db.facturaTienda.update({ where: { rfc }, data: { clave: nueva } })
    return NextResponse.json({ ok: true, clave: nueva }, { headers: CORS_HEADERS })
  }

  return NextResponse.json({ ok: false, error: 'accion_invalida' }, { status: 400, headers: CORS_HEADERS })
}
