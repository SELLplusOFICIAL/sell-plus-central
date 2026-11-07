import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const GUIA_320 = `Con la versión 3.2.0 tu inventario se simplificó: ya no manejas pantallas separadas para productos, lotes y caducidad. Ahora todo vive en el módulo INVENTARIOS.

1) Un solo módulo
- Abre Sell-Plus y entra a la pestaña "Inventarios".
- Ahí ves tus productos con su existencia total, y al abrir cada uno, sus lotes con cantidad y fecha de caducidad.

2) Registrar mercancía con lote
- En Inventarios elige el producto y registra una ENTRADA.
- Captura número de lote, cantidad y fecha de caducidad. Si el producto no usa lotes, deja esos campos vacíos y se comporta como siempre.

3) Salidas y ventas
- Al vender, el sistema descuenta primero el lote que caduca más pronto (PEPS: primero en caducar, primero en salir).
- Así el producto viejo no se queda olvidado al fondo.

4) Alertas de caducidad
- Los lotes próximos a vencer se marcan con aviso para que puedas hacer promociones o mermas a tiempo.
- Revisa la columna de estado antes de hacer tus compras de la semana.

5) Tu información no se tocó
- La actualización conservó tu base de datos: productos, ventas y usuarios siguen intactos.`

const GUIA_ACTUALIZACIONES = `Tu Sell-Plus se actualiza solo. Así funciona:

1) Conexión
- Tu software guarda la dirección de la Central en el archivo:
  C:\\Sell-Plus\\resources\\app\\db\\central-url.txt
- Esa dirección es la de esta página.

2) Chequeo periódico
- Cada 15 minutos (mientras el software está abierto) y también cada 6 horas, pregunta: "¿hay versión más nueva que la mía?"

3) Descarga y verificación
- Si hay novedad, descarga el instalador oficial y verifica su huella SHA-256 (una firma que garantiza que el archivo no está corrupto ni alterado).

4) Instalación silenciosa
- Instala sin que hagas nada y reinicia el programa.
- TU BASE DE DATOS NUNCA SE BORRA: las ventas, productos y usuarios siempre se conservan.

5) Si algo falla
- Si algún día el software no encuentra la Central (por ejemplo, si este sitio temporal está apagado), simplemente sigue trabajando: reintentará solo.
- Cuando la Central vuelve a estar en línea, la actualización llega en menos de 15 minutos.`

const GUIA_ACCESO = `El acceso directo de tu escritorio abre esta Central (el centro de actualizaciones y modificaciones).

1) Qué es
- Es un acceso directo (.url) de Windows que apunta a:
  https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai

2) Qué puedes hacer aquí
- Ver las novedades de cada versión (pestaña Actualizaciones).
- Pedir cambios a tu software (pestaña Solicitudes).
- Aprender a usar funciones nuevas (pestaña Aprende).
- Probar la conexión si algo falla (pestaña Diagnóstico).

3) Importante sobre el sitio temporal
- Mientras trabajamos con el sitio temporal, este vive "mientras la sesión de trabajo está activa". Si un día no abre, no te alarmes: tu software sigue funcionando igual y la Central se levanta de nuevo en minutos (escríbeme en el chat y la enciendo).
- El siguiente paso del proyecto es moverla a un hosting permanente (Vercel) para que nunca más se apague. Ese cambio será transparente para ti: solo cambiaría la dirección y te la haría llegar.

4) Si el acceso directo se pierde
- Puedes recrearlo: clic derecho en el escritorio > Nuevo > Acceso directo y pega la dirección de arriba.`

async function main() {
  // ---- Versiones ----
  await db.version.upsert({
    where: { version: '3.1.0' },
    update: {},
    create: {
      version: '3.1.0',
      titulo: 'Auto-actualizador y conexión a la Central',
      notas:
        '• Auto-actualizador integrado: revisa novedades cada 15 minutos.\n' +
        '• Conexión directa con Sell-Plus Central para recibir actualizaciones.\n' +
        '• Herramienta de diagnóstico (diagnostico.ps1) para revisar la conexión.\n' +
        '• Mejoras de estabilidad general.',
      fileName: 'Sell-Plus-3.1.0-Instalador-Windows-64bits.exe',
      fileSize: 84463555,
      sha256: '55126d5781d7833df889187880addd11e4e56e0c5169d0888fd7b48e05b3788d',
      fecha: new Date('2026-10-28T18:00:00Z'),
    },
  })

  await db.version.upsert({
    where: { version: '3.2.0' },
    update: {},
    create: {
      version: '3.2.0',
      titulo: 'Fusión de Inventarios con Lotes',
      notas:
        '• NUEVO módulo unificado INVENTARIOS: productos, lotes y caducidad en una sola pantalla.\n' +
        '• Registro de entradas con número de lote, cantidad y fecha de caducidad.\n' +
        '• Descuento inteligente: sale primero el lote que caduca más pronto (PEPS).\n' +
        '• Alertas de caducidad próxima para evitar mermas.\n' +
        '• Diseño renovado en toda la aplicación, más claro y rápido.\n' +
        '• Correcciones de estabilidad y rendimiento.',
      fileName: null,
      fileSize: null,
      sha256: null,
      fecha: new Date('2026-11-05T18:00:00Z'),
    },
  })

  // ---- Tutoriales / guías ----
  const guias = [
    {
      titulo: 'Novedades 3.2.0 · Inventarios con Lotes',
      descripcion:
        'Todo lo que cambió en tu inventario: un solo módulo para productos, lotes y caducidad.',
      contenido: GUIA_320,
      minutos: 5,
      orden: 1,
    },
    {
      titulo: 'Cómo funcionan las actualizaciones automáticas',
      descripcion:
        'Qué hace tu software cada 15 minutos y por qué tu base de datos nunca se borra.',
      contenido: GUIA_ACTUALIZACIONES,
      minutos: 3,
      orden: 2,
    },
    {
      titulo: 'Tu acceso directo a la Central',
      descripcion:
        'Para qué sirve el ícono de tu escritorio y qué hacer si el sitio no abre.',
      contenido: GUIA_ACCESO,
      minutos: 2,
      orden: 3,
    },
  ]

  for (const g of guias) {
    const existente = await db.tutorial.findFirst({ where: { titulo: g.titulo } })
    if (existente) {
      await db.tutorial.update({ where: { id: existente.id }, data: g })
    } else {
      await db.tutorial.create({ data: { ...g, tipo: 'guia' } })
    }
  }

  // ---- Bitácora inicial ----
  const reconstruida = await db.actividad.findFirst({
    where: { detalle: { contains: 'puesta en línea' } },
  })
  if (!reconstruida) {
    await db.actividad.create({
      data: {
        tipo: 'sistema',
        detalle: 'Central reconstruida y puesta en línea (misma URL pública)',
      },
    })
  }

  console.log('Seed OK: versiones 3.1.0/3.2.0 + 3 guías + bitácora')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
