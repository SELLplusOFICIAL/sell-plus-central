/**
 * Publica la guía de la v3.3.0 en Aprende + bitácora.
 * Uso: bun scripts/guia-330.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const CONTENIDO = `Tu Sell-Plus 3.3.0 convirtió el módulo INVENTARIOS en el cuarto de mando de tu tienda. Esto es todo lo nuevo:

1) AGREGAR UN PRODUCTO (Bloque 1)
- Entra a Inventarios y toca el botón verde "Agregar producto".
- Captura nombre, categoría, precio de venta, costo y el aviso de stock bajo (cuándo quieres que te avise).
- Si ya tienes mercancía en el estante, activa "Registrar mercancía inicial" y captura cantidad, caducidad y proveedor.

2) EDITAR O ELIMINAR
- Toca cualquier producto del catálogo para abrir su ficha completa.
- Botón "Editar" para cambiar cualquier dato. Guardas y listo.
- En la "Zona delicada" puedes desactivar un producto (deja de aparecer en caja pero conserva su historial) o eliminarlo por completo.

3) LOTES, ENTRADAS Y MERMAS
- Cada vez que llegue mercancía: abre la ficha del producto → "Entrada de mercancía" → cantidad, caducidad, proveedor y costo unitario.
- Con el botón "Ajustar conteo" corriges diferencias entre lo que dice el sistema y lo que hay en el estante (se registra en la bitácora).
- "Merma total" retira un lote dañado o vencido y lo deja documentado.

4) CATÁLOGO CON FILTROS (Bloque 2)
- Busca por nombre, código o categoría desde la caja de búsqueda.
- Filtros rápidos: "Stock bajo", "Caducan ≤ 30 días", "Caducan ≤ 7 días", "Vencidos".
- Filtro de ventas: "Con ventas del periodo", "Sin ventas del periodo" — y eliges si el periodo es de 7, 30 o 90 días. Perfecto para decidir qué pedir y qué promocionar.
- Las tarjetas de arriba te dan el pulso del negocio: valor total del inventario, productos en riesgo de caducar y faltantes.

5) EXCEL: IMPORTAR Y EXPORTAR (Bloque 3)
- EXPORTAR: botón "Exportar" descarga tus productos y lotes a un Excel con fecha del día.
- IMPORTAR: botón "Importar" acepta tu archivo (o la plantilla de ejemplo que ahí mismo puedes descargar). Columnas: Nombre, Categoria, Codigo, Precio, Costo, Minimo, Existencia, Caducidad, Proveedor, CostoUnitario.
- Importar NUNCA borra: si el producto ya existe (por código o nombre) se actualiza y la existencia entra como lote nuevo; si no existe, se crea.
- Al terminar verás el reporte fila por fila de lo que se creó, actualizó o tuvo problemas.

6) TU INFORMACIÓN, INTACTA
- Esta actualización no tocó tu base de datos: el esquema es idéntico al que ya tenías.
- Antes de instalar, el sistema hizo automáticamente un respaldo adicional por si acaso (los archivos custom.db.respaldo... en tu carpeta Sell-Plus).

¿Dudas con algo nuevo? Escríbela en Solicitudes o en el chat.`

async function main() {
  const titulo = 'Novedades 3.3.0 · Gestión completa de Inventarios'
  const existente = await db.tutorial.findFirst({ where: { titulo } })
  const datos = {
    titulo,
    descripcion:
      'Alta y edición de productos, lotes con bitácora, filtros del catálogo y Excel para importar/exportar tu inventario.',
    tipo: 'guia',
    contenido: CONTENIDO,
    minutos: 7,
    orden: 0,
  }
  if (existente) {
    await db.tutorial.update({ where: { id: existente.id }, data: datos })
  } else {
    await db.tutorial.create({ data: datos })
  }

  await db.actividad.create({
    data: {
      tipo: 'sistema',
      detalle:
        'Versión 3.3.0 PUBLICADA (Gestión completa de Inventarios) — disponible para tu software',
    },
  })

  console.log('Guía 3.3.0 publicada en Aprende + bitácora actualizada')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
