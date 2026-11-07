import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { readFileSync, statSync } from 'fs'

const db = new PrismaClient()

const EXE = '/home/z/my-project/central-files/updates/Sell-Plus-3.3.3-Instalador-Windows-64bits.exe'

const TITULO = 'Ventas inteligentes: tickets múltiples, atajos y dinero en caja'
const NOTAS = `Versión acumulativa: base completa 3.1.0 → 3.3.2 + la petición "Ventas inteligentes" (solicitud #2). Control de no-regresión aprobado por el Paladín de publicación (PALADIN_OK).

■ SE AÑADE
• Tickets múltiples en Caja: agrega tickets con F6, elimínalos con la X de su pestañita y contabilízalos con el contador "N tickets en espera · total". Cada ticket guarda su propio total y los tickets sobreviven a reinicios del programa.
• Buscar producto con F10 (enfoca y selecciona la búsqueda) y filtro por categoría (Todas + las categorías de tus productos).
• Dinero en caja: Entrada de dinero (F7) y Salida de dinero (F8) con motivo opcional; resumen del día (ventas en efectivo, entradas, salidas y estimado en caja) y tus últimos movimientos.
• Cobrar con F12: cobra el ticket activo sin tocar el ratón.
• Leyenda de atajos siempre visible en Caja (F6 · F10 · F7 · F8 · F12).

■ SE CONSERVA
• Todo lo de la 3.3.2: el Paladín guardián (auto-recuperación del servidor, monitor de salud cada 30 s, restauración automática de la base de datos y rollback de actualizaciones fallidas).
• Inventarios por lotes con caducidad y salida FEFO, alertas, reportes, empleados y la Central con sus indicadores en vivo.
• Tu base de datos no se toca: la tabla nueva (MovimientoCaja) se crea sola, de forma aditiva, la primera vez que uses el apartado.

■ SE AJUSTA
• El botón ahora dice "Cobrar {total} F12" y cobra el ticket activo; al cobrar, ese ticket se consume y pasas al siguiente automáticamente.
• La búsqueda de Caja ahora respeta también el filtro de categoría.
• El control de stock suma lo que hay en TODOS los tickets en espera, para no vender de más.`

async function main() {
  const buf = readFileSync(EXE)
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const fileSize = statSync(EXE).size

  // 1) Registrar la versión (idempotente)
  const datos = {
    version: '3.3.3',
    titulo: TITULO,
    notas: NOTAS,
    fileName: 'Sell-Plus-3.3.3-Instalador-Windows-64bits.exe',
    fileSize,
    sha256,
    canal: 'estable',
    activo: true,
  }
  const existente = await db.version.findUnique({ where: { version: '3.3.3' } })
  if (existente) {
    await db.version.update({ where: { version: '3.3.3' }, data: datos })
    console.log('Versión 3.3.3 actualizada')
  } else {
    await db.version.create({ data: datos })
    console.log('Versión 3.3.3 registrada')
  }

  // 2) Cerrar la solicitud #2 con el indicador al 100%
  await db.solicitud.update({
    where: { id: 2 },
    data: {
      estado: 'publicada',
      progreso: 100,
      fase: 'Completado — publicado como v3.3.3',
      tiempoEstimado: '60–90 min',
      respuesta:
        'Lista y publicada como v3.3.3. En Caja ahora tienes: F6 agrega tickets (con pestañitas para cambiar entre ellos, X para eliminarlos y contador con su total), F10 busca productos y enfoca el buscador con filtro por categoría, F7 entrada de dinero, F8 salida de dinero (ambas con motivo y resumen del día: en caja estimado incluido) y F12 cobra el ticket activo. Tu información no se tocó: la tabla nueva se crea sola. Tu programa se actualizará solo en los próximos 15 minutos.',
    },
  })
  console.log('Solicitud #2 cerrada (publicada al 100%)')

  // 3) Bitácora (idempotente)
  const detalle = `v3.3.3 publicada: Ventas inteligentes (tickets múltiples F6, buscar+filtro F10, entrada/salida de dinero F7/F8 con resumen de caja, cobrar F12) + tabla aditiva MovimientoCaja. Paladín: PALADIN_OK (9 verificaciones). Solicitud #2 cerrada. SHA-256 ${sha256.slice(0, 8)}…${sha256.slice(-6)}`
  const ya = await db.actividad.findFirst({ where: { detalle } })
  if (!ya) {
    await db.actividad.create({ data: { tipo: 'sistema', detalle } })
    console.log('Bitácora registrada')
  } else {
    console.log('Bitácora ya existía')
  }

  console.log('SHA-256:', sha256)
  console.log('Tamaño:', fileSize, 'bytes')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
