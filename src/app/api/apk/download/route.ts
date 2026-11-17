import { NextResponse } from 'next/server'
import apkData from '@/data/apk.json'

export const dynamic = 'force-dynamic'

/**
 * Descarga directa del APK vigente: redirige al archivo del canal oficial.
 * La dirección estable es /api/apk/download — aunque cambie el APK por una
 * versión nueva, esta URL sigue funcionando (el teléfono se actualiza desde aquí).
 */
export async function GET() {
  if (!apkData.activo || !apkData.url) {
    return NextResponse.json({ error: 'APK no disponible por el momento' }, { status: 404 })
  }
  return NextResponse.redirect(apkData.url, 302)
}
