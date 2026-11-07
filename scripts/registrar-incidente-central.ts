/**
 * Bitácora: incidente "Central en blanco" (2o reporte del usuario) y refuerzos aplicados.
 * Idempotente: no duplica si ya existe la entrada.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ENTRADAS = [
  {
    tipo: 'sistema',
    detalle:
      'Incidente: el dueño encontró la Central en blanco por segunda vez. Causa confirmada: el entorno de preview apaga el servidor al quedar inactivo y borra node_modules; además los dos vigilantes cron fallaban con "model concurrency limit exceeded" (plataforma) y no pudieron re-encenderla. Diagnóstico completo: página, /api/health, 10 chunks JS y CSS cargan bien por la URL pública cuando el servidor está vivo.',
  },
  {
    tipo: 'sistema',
    detalle:
      'Refuerzos aplicados: (1) vigilante con arranque paciente (hasta 84 s) y reinstalación automática de dependencias; (2) consolidado a UN solo vigilante cada 15 min en minutos escalonados :07/:22/:37/:52 con prioridad alta (esquiva los picos de concurrencia de la plataforma); (3) verificado en real: el vigilante detectó dependencias borradas, las reinstaló, re-encendió y dejó la Central en línea. Pendiente estructural: migración a hosting permanente (Vercel + Turso/Blob) para eliminar esta dependencia del entorno de preview.',
  },
]

async function main() {
  for (const e of ENTRADAS) {
    const ya = await prisma.actividad.findFirst({
      where: { tipo: e.tipo, detalle: e.detalle },
    })
    if (ya) {
      console.log('Ya registrada, se omite:', e.detalle.slice(0, 60), '…')
      continue
    }
    await prisma.actividad.create({ data: e })
    console.log('Registrada:', e.detalle.slice(0, 60), '…')
  }
}

main()
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
