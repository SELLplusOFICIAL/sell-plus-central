import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CORS_HEADERS } from '@/lib/central'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

const CABECERAS = { ...CORS_HEADERS, 'Cache-Control': 'no-store' }

function igual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf-8')
  const bb = Buffer.from(b, 'utf-8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function normalizar(codigo: unknown): string {
  return String(codigo || '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * POST /api/acceso-maestro/validar  (llama el Sell-Plus del cliente)
 * Cuerpo: { codigo, equipo? }
 * Valida un código maestro y, si es correcto, lo marca como USADO
 * (un solo uso) y deja constancia en la bitácora. A los códigos
 * incorrectos, revocados o expirados se responde lo mismo (y con una
 * pequeña espera) para no dar pistas ni permitir fuerza bruta.
 */
export async function POST(req: NextRequest) {
  const cuerpo = await req.json().catch(() => ({}))
  const codigo = normalizar(cuerpo?.codigo)
  const equipo = typeof cuerpo?.equipo === 'string' ? cuerpo.equipo.slice(0, 120) : null

  if (!codigo || codigo.length > 24) {
    await esperar(400)
    return NextResponse.json(
      { ok: false, mensaje: 'Código no válido.' },
      { status: 403, headers: CABECERAS }
    )
  }

  try {
    const registro = await db.accesoMaestro.findUnique({ where: { codigo } })

    if (!registro || registro.estado !== 'activo' || !igual(registro.codigo, codigo)) {
      await esperar(400)
      await db.actividad.create({
        data: { tipo: 'acceso_maestro_fallido', detalle: 'Intento de validación con un código no válido o no activo' },
      }).catch(() => {})
      return NextResponse.json(
        { ok: false, mensaje: 'Código no válido. Pide uno nuevo en la Central (Acceso maestro).' },
        { status: 403, headers: CABECERAS }
      )
    }

    if (new Date(registro.expiraEn).getTime() < Date.now()) {
      await esperar(400)
      await db.actividad.create({
        data: { tipo: 'acceso_maestro_fallido', detalle: `Código ${registro.codigo} ya expiró` },
      }).catch(() => {})
      return NextResponse.json(
        { ok: false, mensaje: 'El código ya expiró. Pide uno nuevo en la Central (Acceso maestro).' },
        { status: 403, headers: CABECERAS }
      )
    }

    // Un solo uso: se marca usado con marca de tiempo y, si llegó, el equipo.
    await db.accesoMaestro.update({
      where: { id: registro.id },
      data: { estado: 'usado', usadoEn: new Date(), equipo },
    })
    await db.actividad.create({
      data: {
        tipo: 'acceso_maestro_usado',
        detalle: `Código ${registro.codigo} usado por ${equipo || 'un equipo del POS'} para recuperar el acceso`,
      },
    }).catch(() => {})

    return NextResponse.json(
      {
        ok: true,
        mensaje: 'Acceso maestro autorizado.',
        acciones: ['entrar', 'cambiar_pin', 'resetear'],
      },
      { headers: CABECERAS }
    )
  } catch (e) {
    return NextResponse.json(
      { ok: false, mensaje: 'La Central no pudo validar el código.', detalle: String((e as Error).message || e).slice(0, 140) },
      { status: 500, headers: CABECERAS }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CABECERAS })
}
