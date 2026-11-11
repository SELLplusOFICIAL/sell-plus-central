import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { esAdminValido, respuestaNoAutorizado, CORS_HEADERS } from '@/lib/central'
import { randomInt } from 'crypto'

export const dynamic = 'force-dynamic'

const CABECERAS = { ...CORS_HEADERS, 'Cache-Control': 'no-store' }

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para que el dueño
// pueda copiar el código a mano sin equivocarse.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generarCodigo(): string {
  let codigo = ''
  for (let i = 0; i < 12; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)]
    if (i === 3 || i === 7) codigo += '-'
  }
  return 'SP-' + codigo
}

function normalizar(codigo: unknown): string {
  return String(codigo || '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

/** GET: lista los últimos códigos emitidos (solo administrador). */
export async function GET(req: NextRequest) {
  if (!esAdminValido(req)) return respuestaNoAutorizado()
  try {
    const codigos = await db.accesoMaestro.findMany({
      orderBy: { id: 'desc' },
      take: 25,
    })
    // Los códigos ya expirados (y todavía activos) se muestran como expirados.
    const ahora = Date.now()
    const lista = codigos.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      estado:
        c.estado === 'activo' && new Date(c.expiraEn).getTime() < ahora
          ? 'expirado'
          : c.estado,
      creadoEn: c.creadoEn,
      expiraEn: c.expiraEn,
      usadoEn: c.usadoEn,
      equipo: c.equipo,
      nota: c.nota,
    }))
    return NextResponse.json({ ok: true, codigos: lista }, { headers: CABECERAS })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'no_se_pudo_listar', detalle: String((e as Error).message || e).slice(0, 160) },
      { status: 500, headers: CABECERAS }
    )
  }
}

/** POST: genera un código maestro nuevo (solo administrador). */
export async function POST(req: NextRequest) {
  if (!esAdminValido(req)) return respuestaNoAutorizado()
  try {
    const cuerpo = await req.json().catch(() => ({}))
    const minutos = Math.min(60, Math.max(5, parseInt(String(cuerpo?.minutos ?? 15), 10) || 15))
    const nota = typeof cuerpo?.nota === 'string' ? cuerpo.nota.slice(0, 140) : null

    // Unos pocos reintentos por si chocara con un código repetido (prácticamente imposible).
    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo()
      const expiraEn = new Date(Date.now() + minutos * 60 * 1000)
      try {
        const creado = await db.accesoMaestro.create({
          data: { codigo, expiraEn, nota },
        })
        await db.actividad.create({
          data: {
            tipo: 'acceso_maestro_generado',
            detalle: `Código ${codigo} emitido (vence en ${minutos} min)${nota ? ' · nota: ' + nota : ''}`,
          },
        }).catch(() => {})
        return NextResponse.json(
          { ok: true, codigo: creado.codigo, id: creado.id, expiraEn: creado.expiraEn, minutos },
          { headers: CABECERAS }
        )
      } catch (eCrea) {
        if (intento === 4) throw eCrea
      }
    }
    throw new Error('sin código')
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'no_se_pudo_generar', detalle: String((e as Error).message || e).slice(0, 160) },
      { status: 500, headers: CABECERAS }
    )
  }
}

/** DELETE: revoca un código por id (solo administrador). */
export async function DELETE(req: NextRequest) {
  if (!esAdminValido(req)) return respuestaNoAutorizado()
  try {
    const cuerpo = await req.json().catch(() => ({}))
    const id = parseInt(String(cuerpo?.id ?? ''), 10)
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'falta_id' },
        { status: 400, headers: CABECERAS }
      )
    }
    const existe = await db.accesoMaestro.findUnique({ where: { id } })
    if (!existe) {
      return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404, headers: CABECERAS })
    }
    await db.accesoMaestro.update({ where: { id }, data: { estado: 'revocado' } })
    await db.actividad.create({
      data: { tipo: 'acceso_maestro_revocado', detalle: `Código ${existe.codigo} revocado por el administrador` },
    }).catch(() => {})
    return NextResponse.json({ ok: true }, { headers: CABECERAS })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'no_se_pudo_revocar', detalle: String((e as Error).message || e).slice(0, 160) },
      { status: 500, headers: CABECERAS }
    )
  }
}
