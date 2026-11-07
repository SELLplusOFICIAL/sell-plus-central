import { db } from '@/lib/db'

/**
 * v3.3.3 — Asegura las tablas nuevas de forma ADITIVA.
 *
 * Por qué existe: los equipos que ya tienen Sell-Plus conservan su
 * custom.db al actualizarse. Esta rutina crea SOLO lo que falta
 * (CREATE TABLE IF NOT EXISTS); nunca altera ni borra datos.
 * Se ejecuta una vez por proceso, la primera vez que se usa la API de caja.
 */
let promesaEsquema: Promise<void> | null = null

async function crearTablas(): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MovimientoCaja" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tipo" TEXT NOT NULL,
      "monto" REAL NOT NULL,
      "motivo" TEXT NOT NULL DEFAULT '',
      "usuario" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export function asegurarEsquemaCaja(): Promise<void> {
  if (!promesaEsquema) {
    promesaEsquema = crearTablas().catch((e) => {
      // No memorizar el fallo: permitir reintento en la siguiente petición
      promesaEsquema = null
      throw e
    })
  }
  return promesaEsquema
}
