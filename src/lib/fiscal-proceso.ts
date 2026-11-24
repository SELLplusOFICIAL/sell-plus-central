import { db } from '@/lib/db'
import { calcularTotales, fechaCfdi, xmlComprobante, cadenaOriginalComprobante, sellarConCsd, timbrarSimulado, enviarPacRest, descifrarSecreto, type SolicitudTimbrado, type ConceptoFiscal, type ReceptorFiscal, type EmisorFiscal, type CsdCargado } from '@/lib/fiscal'

/**
 * CipherPoint 7.0.9 — lógica de timbrado compartida entre la ruta del
 * puente (/api/sp/facturas) y la administración (/api/sp/facturas/admin).
 */

export type FilaCola = {
  id: string; claveTienda: string; rfcEmisor: string; serie: string; folio: number
  formaPago: string; metodoPago: string; emisorJson: string; receptorJson: string
  conceptosJson: string; tasaIva: number; estado: string; uuid: string | null
  serieSat: string | null; fechaTimbrado: string | null; xml: string | null
  error: string | null; intentos: number; simulado: boolean
}

export async function cfgVal(clave: string): Promise<string> {
  const f = await db.facturaConfig.findUnique({ where: { clave } })
  return f?.valor || ''
}

export async function pacConfig(): Promise<{ modo: string; url: string; token: string }> {
  return {
    modo: (await cfgVal('pac-modo')) || 'ninguno',
    url: await cfgVal('pac-url'),
    token: descifrarSecreto(await cfgVal('pac-token')),
  }
}

export async function csdConfig(): Promise<CsdCargado | null> {
  const cer = await cfgVal('csd-cer')
  const no = await cfgVal('csd-no')
  const keyPemCif = await cfgVal('csd-key-pem')
  if (!cer || !no || !keyPemCif) return null
  const keyPem = descifrarSecreto(keyPemCif)
  if (!keyPem) return null
  return { certificadoB64: cer, noCertificado: no, keyPem }
}

function solicitudDeFila(f: FilaCola): SolicitudTimbrado {
  return {
    serie: f.serie || 'A', folio: f.folio, formaPago: f.formaPago || 'PUE',
    metodoPago: f.metodoPago || '01',
    emisor: JSON.parse(f.emisorJson || '{}') as EmisorFiscal,
    receptor: JSON.parse(f.receptorJson || '{}') as ReceptorFiscal,
    conceptos: JSON.parse(f.conceptosJson || '[]') as ConceptoFiscal[],
    tasaIva: f.tasaIva,
  }
}

/**
 * Intenta timbrar una factura pendiente de la cola. Devuelve el nuevo
 * estado: 'timbrada', 'error' o 'sin_cambio' (sin PAC configurado).
 */
export async function intentarTimbrarInterno(id: string): Promise<'timbrada' | 'error' | 'sin_cambio'> {
  const fila = await db.facturaCola.findUnique({ where: { id } })
  if (!fila || fila.estado !== 'pendiente') return 'sin_cambio'
  const f = fila as unknown as FilaCola
  const pac = await pacConfig()
  if (pac.modo === 'ninguno') return 'sin_cambio'
  const marcarTimbrada = async (uuid: string, xml: string, fecha: string, simulado: boolean) => {
    await db.facturaCola.update({ where: { id }, data: { estado: 'timbrada', uuid, xml, fechaTimbrado: fecha, simulado, error: null } })
    return 'timbrada' as const
  }
  const marcarError = async (error: string) => {
    await db.facturaCola.update({ where: { id }, data: { estado: 'error', error: String(error).slice(0, 500), intentos: { increment: 1 } } })
    return 'error' as const
  }
  try {
    const csd = await csdConfig()
    const s = solicitudDeFila(f)
    const em = s.emisor
    if (!em.rfc || !em.nombre || !em.regimenFiscal || !em.cp) {
      return await marcarError('Faltan los datos fiscales de tu negocio (RFC, razón social, régimen o código postal). Complétalos en la PC y reenvía.')
    }
    const re = s.receptor
    if (!re.rfc || !re.nombre || !re.regimenFiscal || !re.cp || !re.usoCfdi) {
      return await marcarError('Faltan datos fiscales del cliente (RFC, nombre, régimen, CP o uso de CFDI).')
    }
    if (!s.conceptos.length) return await marcarError('La factura no lleva conceptos.')
    const calc = calcularTotales(s.conceptos, s.tasaIva)
    if (calc.total <= 0) return await marcarError('El total de la factura debe ser mayor a cero.')
    const fecha = fechaCfdi()
    let sello = '', certB64 = '', noCert = ''
    if (csd) {
      // Cadena original (sin Sello ni Certificado por diseño del Anexo 20),
      // se firma con RSA-SHA256 del CSD y el XML lleva Sello+Certificado.
      const cadena = cadenaOriginalComprobante(s, calc, csd.noCertificado, fecha)
      sello = sellarConCsd(cadena, csd)
      certB64 = csd.certificadoB64
      noCert = csd.noCertificado
    } else if (pac.modo === 'rest') {
      return await marcarError('No hay CSD cargado en la Central: cárgalo en Facturación (modo Admin) para sellar tus facturas.')
    }
    if (pac.modo === 'simulado') {
      const r = timbrarSimulado(s, calc, sello, certB64, noCert, fecha)
      return await marcarTimbrada(r.uuid, r.xml, r.fechaTimbrado, true)
    }
    if (pac.modo === 'rest') {
      const xmlSinTimbrar = xmlComprobante(s, calc, sello, certB64, noCert, fecha)
      const r = await enviarPacRest(pac.url, pac.token, xmlSinTimbrar)
      if (r.ok && r.uuid) return await marcarTimbrada(r.uuid, r.xml || xmlSinTimbrar, r.fechaTimbrado || fecha, false)
      return await marcarError('PAC: ' + (r.error || 'respuesta inválida'))
    }
    return 'sin_cambio'
  } catch (e) {
    return await marcarError('Error al armar/sellar el CFDI: ' + (e instanceof Error ? e.message.slice(0, 180) : String(e).slice(0, 180)))
  }
}
