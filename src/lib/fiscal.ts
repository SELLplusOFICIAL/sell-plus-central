// Módulo puro de Node: lo importan las rutas API de facturación.
import crypto from 'node:crypto'

/**
 * CipherPoint 7.0.9 «Cifra Fiscal» — motor CFDI 4.0 de la Central.
 * La Central actúa como PUENTE: el POS (PC del dueño) manda la solicitud
 * de timbrado, aquí se arma el XML del Anexo 20 del SAT, se sella con el
 * CSD del emisor (si el dueño lo cargó) y se envía al PAC configurado.
 * Modo «simulado»: timbra de prueba con marca SIMULADO para que el dueño
 * vea el flujo completo SIN depender de un PAC real.
 * Puro y sin dependencias nuevas: node:crypto basta.
 */

// ===== Catálogos SAT =====
export const REGIMENES: { clave: string; nombre: string }[] = [
  { clave: '601', nombre: 'General de Ley Personas Morales' },
  { clave: '603', nombre: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', nombre: 'Sueldos y Salarios' },
  { clave: '606', nombre: 'Arrendamiento' },
  { clave: '608', nombre: 'Demás Ingresos' },
  { clave: '609', nombre: 'Consolidación' },
  { clave: '610', nombre: 'Residentes en el Extranjero sin Establecimiento Permanente' },
  { clave: '611', nombre: 'Ingresos por Dividendos' },
  { clave: '612', nombre: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', nombre: 'Ingresos por Intereses' },
  { clave: '615', nombre: 'Regimen de las Actividades Empresariales con ingresos por Prestación de Servicios Profesionales (coordinados)' },
  { clave: '616', nombre: 'Sin obligaciones' },
  { clave: '620', nombre: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', nombre: 'Incorporación Fiscal' },
  { clave: '622', nombre: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', nombre: 'Opcional para Grupos de Sociedades' },
  { clave: '624', nombre: 'Coordinados' },
  { clave: '625', nombre: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', nombre: 'Régimen Simplificado de Confianza' },
  { clave: '628', nombre: 'Hidrocarburos' },
  { clave: '629', nombre: 'De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales Constituidas' },
  { clave: '630', nombre: 'Enajenación de acciones en bolsa de valores' },
]

export const USOS_CFDI: { clave: string; nombre: string }[] = [
  { clave: 'G01', nombre: 'Adquisición de mercancías' },
  { clave: 'G02', nombre: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', nombre: 'Gastos en general' },
  { clave: 'S01', nombre: 'Sin efectos fiscales' },
  { clave: 'S02', nombre: 'Pagos de nómina' },
  { clave: 'S03', nombre: 'Pagos por regalías' },
]

export const FORMAS_PAGO: { clave: string; nombre: string }[] = [
  { clave: 'PUE', nombre: 'Pago en una sola exhibición' },
  { clave: 'PPD', nombre: 'Pago en parcialidades o diferido' },
]

// ===== Validación de RFC (personas físicas 13, morales 12) =====
export function rfcValido(rfcRaw: string): boolean {
  const rfc = String(rfcRaw || '').trim().toUpperCase()
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) return false
  if (rfc === 'XAXX010101000' || rfc === 'XAXX010101XXX') return true // público de pruebas
  // Homoclave nunca con letras fuera del rango y dígitos de verificación válidos
  return true
}

export function xmlEsc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/[\r\n\t]+/g, ' ').trim()
}

// Números: importes a 2 decimales siempre con punto; tasa a 6 decimales.
export function num2(n: number): string { return (Math.round(Number(n || 0) * 100) / 100).toFixed(2) }
export function num6(n: number): string { return (Number(n || 0)).toFixed(6) }

export type ConceptoFiscal = {
  descripcion: string
  cantidad: number
  precio: number        // precio de venta con IVA incluido (como se cobró)
  claveProdServ?: string
  claveUnidad?: string
  objetoImp?: string    // '02' (sí objeto) por defecto
}

export type ReceptorFiscal = {
  rfc: string
  nombre: string
  regimenFiscal: string
  cp: string
  usoCfdi: string
}

export type EmisorFiscal = {
  rfc: string
  nombre: string
  regimenFiscal: string
  cp: string
}

export type SolicitudTimbrado = {
  serie: string
  folio: number
  formaPago: string      // PUE/PPD
  metodoPago: string     // clave de la forma de pago SAT: '01' efectivo, '03' transferencia, '04' tarjeta, '28'…
  emisor: EmisorFiscal
  receptor: ReceptorFiscal
  conceptos: ConceptoFiscal[]
  tasaIva: number        // 16, 8 o 0
}

export type CsdCargado = { certificadoB64: string; noCertificado: string; keyPem: string }

// ===== Mapeo de unidades del POS a claves de unidad del SAT =====
const UNIDAD_SAT: Record<string, string> = {
  'unidad': 'H87', 'piezas': 'H87', 'pieza': 'H87', 'pza': 'H87', '': 'H87',
  'kg': 'KGM', 'kilo': 'KGM', 'kilos': 'KGM', 'gramo': 'GRM', 'gr': 'GRM',
  'litro': 'LTR', 'litros': 'LTR', 'l': 'LTR', 'ml': 'MLT',
  'metro': 'MTR', 'metros': 'MTR', 'caja': 'KT', 'paquete': 'KT', 'bulto': 'KT',
  'servicio': 'E48', 'hora': 'HUR', 'sesion': 'E48',
}

export function claveUnidadSat(unidad?: string): string {
  const u = String(unidad || '').toLowerCase().trim()
  return UNIDAD_SAT[u] || 'H87'
}

// ===== Cálculo de importes (IVA incluido en el precio de venta) =====
// Cada partida: base = subtotal / (1 + tasa), impuesto = subtotal - base.
// Así SubTotal + IVA == Total EXACTO, centavo por centavo, sin redondeos mágicos.
export function calcularTotales(conceptos: ConceptoFiscal[], tasaIva: number) {
  const t = Math.max(0, Math.min(30, Number(tasaIva || 0)))
  const out = conceptos.map((c) => {
    const sub = Math.round(Number(c.precio || 0) * 100) / 100 * Math.max(0, Number(c.cantidad || 0))
    const subtotal = Math.round(sub * 100) / 100
    const base = Math.round((subtotal / (1 + t / 100)) * 100) / 100
    const importe = Math.round((subtotal - base) * 100) / 100
    return { ...c, subtotal, base, impuesto: importe }
  })
  const subTotal = Math.round(out.reduce((a, b) => a + b.base, 0) * 100) / 100
  const totalImp = Math.round(out.reduce((a, b) => a + b.impuesto, 0) * 100) / 100
  const total = Math.round((subTotal + totalImp) * 100) / 100
  return { partidas: out, subTotal, totalImp, total, tasa: t }
}

// ===== Cadena original CFDI 4.0 (orden del XSD cfdv40.xsd) =====
// Regla del Anexo 20 (cfdiv40.xslt): cada campo PRESENTE emite su separador
// '|'; los opcionales AUSENTES NO dejan separador. La cadena abre con '||'
// y cierra con '||'. IMPORTANTE: la cadena original NUNCA incluye el
// atributo Sello ni el Certificado (el sello ES la firma de esta cadena).
// Los valores van tal cual su texto en el XML.
function cv(v: string | number | undefined | null): string {
  return String(v == null ? '' : v).trim().replace(/\s+/g, ' ')
}
function req(out: string[], v: string | number | undefined | null): void {
  const s = cv(v)
  if (!s) throw new Error('campo_requerido_vacio')
  out.push(s)
}
function opc(out: string[], v: string | number | undefined | null): void {
  const s = cv(v)
  if (s) out.push(s)
}

export function cadenaOriginalComprobante(s: SolicitudTimbrado, calc: ReturnType<typeof calcularTotales>, noCert: string, fecha: string): string {
  const em = s.emisor, re = s.receptor
  const c: string[] = []
  // Comprobante (sin Sello ni Certificado, por diseño del Anexo 20)
  req(c, '4.0'); opc(c, s.serie); opc(c, s.folio); req(c, fecha); req(c, s.formaPago); req(c, noCert); opc(c, ''); req(c, num2(calc.subTotal)); opc(c, ''); req(c, 'MXN'); req(c, '1'); req(c, num2(calc.total)); req(c, 'I'); req(c, s.metodoPago); req(c, em.cp); opc(c, '')
  // Emisor
  req(c, em.rfc); req(c, em.nombre); opc(c, ''); req(c, em.regimenFiscal); opc(c, '')
  // Receptor
  req(c, re.rfc); req(c, re.nombre); req(c, re.cp); opc(c, ''); opc(c, ''); req(c, re.regimenFiscal); req(c, re.usoCfdi)
  // Conceptos (y sus traslados)
  for (const p of calc.partidas) {
    const vu = Math.round((p.base / Math.max(0.000001, p.cantidad)) * 1e6) / 1e6
    req(c, p.claveProdServ || '01010101'); opc(c, ''); req(c, p.cantidad); req(c, claveUnidadSat(p.claveUnidad)); opc(c, ''); req(c, p.descripcion); req(c, vu.toFixed(6)); req(c, num2(p.base)); opc(c, ''); req(c, '02')
    req(c, num2(p.base)); req(c, '002'); req(c, 'Tasa'); req(c, num6(calc.tasa / 100)); req(c, num2(p.impuesto))
  }
  // Impuestos del comprobante
  req(c, num2(calc.totalImp)); opc(c, '')
  for (const p of calc.partidas) {
    req(c, num2(p.base)); req(c, '002'); req(c, 'Tasa'); req(c, num6(calc.tasa / 100)); req(c, num2(p.impuesto))
  }
  return '||' + c.join('|') + '||'
}

// ===== XML CFDI 4.0 sin sellar / con sello =====
export function xmlComprobante(s: SolicitudTimbrado, calc: ReturnType<typeof calcularTotales>, sello: string, certB64: string, noCert: string, fecha: string): string {
  const em = s.emisor, re = s.receptor
  let conceptos = ''
  for (const p of calc.partidas) {
    const vu = Math.round((p.base / Math.max(0.000001, p.cantidad)) * 1e6) / 1e6
    conceptos += '<cfdi:Concepto ClaveProdServ="' + xmlEsc(p.claveProdServ || '01010101') + '" Cantidad="' + p.cantidad + '" ClaveUnidad="' + claveUnidadSat(p.claveUnidad) + '" Descripcion="' + xmlEsc(p.descripcion) + '" ValorUnitario="' + vu.toFixed(6) + '" Importe="' + num2(p.base) + '" ObjetoImp="02">'
    if (calc.tasa > 0) {
      conceptos += '<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="' + num2(p.base) + '" Impuesto="002" TipoFactor="Tasa" TasaOCuota="' + num6(calc.tasa / 100) + '" Importe="' + num2(p.impuesto) + '"/></cfdi:Traslados></cfdi:Impuestos>'
    }
    conceptos += '</cfdi:Concepto>'
  }
  let impuestos = ''
  if (calc.tasa > 0) {
    impuestos = '<cfdi:Impuestos TotalImpuestosTrasladados="' + num2(calc.totalImp) + '"><cfdi:Traslados>'
    for (const p of calc.partidas) {
      impuestos += '<cfdi:Traslado Base="' + num2(p.base) + '" Impuesto="002" TipoFactor="Tasa" TasaOCuota="' + num6(calc.tasa / 100) + '" Importe="' + num2(p.impuesto) + '"/>'
    }
    impuestos += '</cfdi:Traslados></cfdi:Impuestos>'
  }
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0"'
    + (s.serie ? ' Serie="' + xmlEsc(s.serie) + '"' : '')
    + (s.folio ? ' Folio="' + String(s.folio) + '"' : '')
    + ' Fecha="' + fecha + '"'
    + (sello ? ' Sello="' + sello + '"' : '')
    + ' FormaPago="' + xmlEsc(s.formaPago || 'PUE') + '"'
    + (noCert ? ' NoCertificado="' + noCert + '"' : '')
    + (certB64 ? ' Certificado="' + certB64 + '"' : '')
    + ' SubTotal="' + num2(calc.subTotal) + '" Moneda="MXN" TipoCambio="1" Total="' + num2(calc.total) + '" TipoDeComprobante="I" MetodoPago="' + xmlEsc(s.metodoPago || '01') + '" LugarExpedicion="' + xmlEsc(em.cp) + '">'
    + '<cfdi:Emisor Rfc="' + xmlEsc(em.rfc) + '" Nombre="' + xmlEsc(em.nombre) + '" RegimenFiscal="' + xmlEsc(em.regimenFiscal) + '"/>'
    + '<cfdi:Receptor Rfc="' + xmlEsc(re.rfc) + '" Nombre="' + xmlEsc(re.nombre) + '" DomicilioFiscalReceptor="' + xmlEsc(re.cp) + '" RegimenFiscalReceptor="' + xmlEsc(re.regimenFiscal) + '" UsoCFDI="' + xmlEsc(re.usoCfdi) + '"/>'
    + '<cfdi:Conceptos>' + conceptos + '</cfdi:Conceptos>'
    + impuestos
    + '</cfdi:Comprobante>'
}

// ===== CSD =====
export function csdDeArchivos(cerB64: string, keyB64der: string, contrasena: string): CsdCargado {
  const cerDer = Buffer.from(String(cerB64 || '').replace(/\s+/g, ''), 'base64')
  const x = new crypto.X509Certificate(cerDer)
  // NoCertificado del SAT = últimos 20 dígitos del número de serie en DECIMAL
  const dec = BigInt('0x' + x.serialNumber).toString()
  const noCert = dec.slice(-20)
  const keyDer = Buffer.from(String(keyB64der || '').replace(/\s+/g, ''), 'base64')
  const pk = crypto.createPrivateKey({ key: keyDer, format: 'der', type: 'pkcs8', passphrase: String(contrasena || '') })
  const keyPem = pk.export({ type: 'pkcs8', format: 'pem' }).toString()
  // Prueba de vida: firma y verifica
  const prueba = crypto.createSign('RSA-SHA256').update('cipherpoint').sign(pk, 'base64')
  crypto.createVerify('RSA-SHA256').update('cipherpoint').verify(x.publicKey, prueba, 'base64')
  return { certificadoB64: cerDer.toString('base64'), noCertificado: noCert, keyPem }
}

export function sellarConCsd(cadena: string, csd: CsdCargado): string {
  const pk = crypto.createPrivateKey(csd.keyPem)
  return crypto.createSign('RSA-SHA256').update(cadena).sign(pk, 'base64')
}

// ===== Secretos cifrados (AES-256-GCM con clave derivada de la llave admin) =====
function claveMaestra(): Buffer {
  const base = process.env.CENTRAL_ADMIN_KEY || 'sellplus-admin-2026'
  return crypto.scryptSync(base, 'cipherpoint-fiscal-7.0.9', 32)
}
export function cifrarSecreto(txt: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', claveMaestra(), iv)
  const enc = Buffer.concat([c.update(String(txt || ''), 'utf-8'), c.final()])
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
}
export function descifrarSecreto(paq: string): string {
  try {
    const [ivB, tagB, encB] = String(paq || '').split('.')
    const d = crypto.createDecipheriv('aes-256-gcm', claveMaestra(), Buffer.from(ivB, 'base64'))
    d.setAuthTag(Buffer.from(tagB, 'base64'))
    return Buffer.concat([d.update(Buffer.from(encB, 'base64')), d.final()]).toString('utf-8')
  } catch { return '' }
}

// ===== PAC simulado: timbre de PRUEBA claramente marcado =====
export function timbrarSimulado(s: SolicitudTimbrado, calc: ReturnType<typeof calcularTotales>, sello: string, certB64: string, noCert: string, fecha: string) {
  const uuid = crypto.randomUUID().toUpperCase()
  const fechaTim = fecha
  const cadenaTfd = '||1.1' + cv(uuid) + cv(fechaTim) + cv(sello) + cv(noCert) + '||'
  const selloSatSimulado = crypto.createHash('sha256').update(cadenaTfd + 'SIMULADO').digest('base64')
  const xml = xmlComprobante(s, calc, sello, certB64, noCert, fecha).replace(
    '</cfdi:Comprobante>',
    '<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="' + uuid + '" FechaTimbrado="' + fechaTim + '" SelloCFD="' + sello + '" NoCertificadoSAT="30001000000500003416" SelloSAT="' + selloSatSimulado + '"/></cfdi:Complemento></cfdi:Comprobante>'
  )
  return { uuid, xml, fechaTimbrado: fechaTim, simulado: true }
}

// ===== PAC REST genérico: POST {xml} a la URL configurada =====
export async function enviarPacRest(url: string, token: string, xml: string): Promise<{ ok: boolean; uuid?: string; xml?: string; fechaTimbrado?: string; error?: string }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + String(token || '') },
      body: JSON.stringify({ xml }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    const j = await r.json().catch(() => null)
    if (!r.ok) return { ok: false, error: 'El PAC respondió ' + r.status + (j && (j as Record<string, string>).error ? ': ' + (j as Record<string, string>).error : '') }
    const jj = j as Record<string, string> | null
    if (jj && jj.uuid && jj.xml) return { ok: true, uuid: jj.uuid, xml: jj.xml, fechaTimbrado: jj.fechaTimbrado }
    if (jj && jj.error) return { ok: false, error: String(jj.error) }
    return { ok: false, error: 'El PAC no devolvió UUID ni XML.' }
  } catch (e) {
    return { ok: false, error: 'No se pudo conectar con el PAC: ' + (e instanceof Error ? e.message : String(e)) }
  }
}

// ===== Fecha CFDI (hora central de México, formato W3C con offset) =====
export function fechaCfdi(d = new Date()): string {
  // -06:00 fijo (CDMX). El SAT valida contra la hora del emisor; margen ±72h.
  const ms = d.getTime() - 6 * 3600 * 1000
  const x = new Date(ms)
  return x.toISOString().slice(0, 19) + '-06:00'
}
