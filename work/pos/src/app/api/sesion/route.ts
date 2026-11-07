import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { iniciarSesion, NOMBRE_COOKIE, codificarSesion, sesionActual } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

/** GET — lista simple de usuarios activos (para la pantalla de login) */
export async function GET() {
  const usuarios = await db.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, rol: true },
    orderBy: [{ rol: 'desc' }, { nombre: 'asc' }],
  })
  const sesion = await sesionActual()
  return NextResponse.json({ usuarios, sesion })
}

/** POST — iniciar sesión con nombre + pin */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const nombre = String(body?.nombre ?? '').trim()
  const pin = String(body?.pin ?? '').trim()

  if (!nombre || !pin) {
    return NextResponse.json(
      { error: 'datos_invalidos', mensaje: 'Elige tu nombre y escribe tu PIN.' },
      { status: 400 }
    )
  }

  const sesion = await iniciarSesion(nombre, pin)
  if (!sesion) {
    return NextResponse.json(
      { error: 'credenciales', mensaje: 'PIN incorrecto. Intenta de nuevo.' },
      { status: 401 }
    )
  }

  const resp = NextResponse.json({ ok: true, sesion })
  resp.cookies.set(NOMBRE_COOKIE, codificarSesion(sesion), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return resp
}

/** DELETE — cerrar sesión */
export async function DELETE() {
  const resp = NextResponse.json({ ok: true })
  resp.cookies.set(NOMBRE_COOKIE, '', { path: '/', maxAge: 0 })
  return resp
}
