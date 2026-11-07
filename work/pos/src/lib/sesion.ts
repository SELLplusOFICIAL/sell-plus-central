import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export type Sesion = {
  id: string
  nombre: string
  rol: 'dueno' | 'empleado'
}

const COOKIE = 'sellplus-sesion'

export function codificarSesion(s: Sesion): string {
  return Buffer.from(JSON.stringify(s), 'utf-8').toString('base64')
}

export function decodificarSesion(raw: string | undefined): Sesion | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
    if (obj && typeof obj.id === 'string' && typeof obj.nombre === 'string') {
      return { id: obj.id, nombre: obj.nombre, rol: obj.rol === 'dueno' ? 'dueno' : 'empleado' }
    }
  } catch {}
  return null
}

/** Sesion actual (o null) */
export async function sesionActual(): Promise<Sesion | null> {
  const store = await cookies()
  return decodificarSesion(store.get(COOKIE)?.value)
}

export const NOMBRE_COOKIE = COOKIE

/** Valida nombre + pin contra la base de datos */
export async function iniciarSesion(
  nombre: string,
  pin: string
): Promise<Sesion | null> {
  const usuario = await db.usuario.findUnique({ where: { nombre } })
  if (!usuario || !usuario.activo || usuario.pin !== pin) return null
  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol as 'dueno' | 'empleado' }
}

/** Exige sesión activa; lanza respuesta de error si no hay */
export async function exigirSesion(): Promise<
  { ok: true; sesion: Sesion } | { ok: false; respuesta: Response }
> {
  const sesion = await sesionActual()
  if (!sesion) {
    return {
      ok: false,
      respuesta: Response.json(
        { error: 'sin_sesion', mensaje: 'Inicia sesión primero.' },
        { status: 401 }
      ),
    }
  }
  return { ok: true, sesion }
}

/** Exige sesión de dueño */
export async function exigirDueno(): Promise<
  { ok: true; sesion: Sesion } | { ok: false; respuesta: Response }
> {
  const r = await exigirSesion()
  if (!r.ok) return r
  if (r.sesion.rol !== 'dueno') {
    return {
      ok: false,
      respuesta: Response.json(
        { error: 'solo_dueno', mensaje: 'Esta acción solo la puede hacer el dueño.' },
        { status: 403 }
      ),
    }
  }
  return r
}
