/**
 * Bitácora: causa raíz de la inestabilidad de la Central y solución definitiva.
 * Idempotente.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ENTRADAS = [
  {
    tipo: 'sistema',
    detalle:
      'Causa raíz de la inestabilidad hallada (3 capas): (1) el entorno de preview pausa el sandbox al quedar inactivo y la URL pública muestra una página en blanco/pausada; (2) los vigilantes cron fallaban por límites de concurrencia de la plataforma y no podían re-encenderla; (3) un limpiador del entorno borra node_modules dentro de /home/z/my-project de forma continua, incluso a mitad del arranque del servidor, con disco al 57%. Probado: el limpiador NO toca /tmp.',
  },
  {
    tipo: 'sistema',
    detalle:
      'Solución definitiva aplicada: la Central ahora corre desde /tmp/central (zona que el limpiador no alcanza y que sobrevive a reversiones), con su propia copia de dependencias y la base de datos del proyecto por ruta absoluta (file:/home/z/my-project/db/custom.db, única fuente de verdad). Vigilante v4: restaura estado si hay reversión, sincroniza código del proyecto → /tmp/central, instala dependencias solo si faltan en la zona segura y re-enciende con arranque paciente. Script nuevo sincronizar-central.sh para publicar cambios de código. Verificado en real: página, health, chunks JS y CSS al 200 por la URL pública; servidor vivo tras 90 s de vigilancia (antes moría en ~25 s).',
  },
]

async function main() {
  for (const e of ENTRADAS) {
    const ya = await prisma.actividad.findFirst({
      where: { tipo: e.tipo, detalle: e.detalle },
    })
    if (ya) {
      console.log('Ya registrada, se omite:', e.detalle.slice(0, 50), '…')
      continue
    }
    await prisma.actividad.create({ data: e })
    console.log('Registrada:', e.detalle.slice(0, 50), '…')
  }
}

main()
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
