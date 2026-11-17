import { NextRequest } from 'next/server'
import { corsJson, corsOptions } from '@/lib/central'
import apkData from '@/data/apk.json'

export const dynamic = 'force-dynamic'

/**
 * Canal de la app móvil (APK), INDEPENDIENTE del registro de versiones de PC.
 * La Central siempre devuelve la versión vigente del APK con su URL de descarga:
 * cuando salga un APK nuevo, se actualiza src/data/apk.json y este endpoint sirve
 * la nueva de inmediato (así el teléfono siempre se actualiza desde la Central).
 */
export async function GET(req: NextRequest) {
  return corsJson(apkData)
}

export async function OPTIONS() {
  return corsOptions()
}
