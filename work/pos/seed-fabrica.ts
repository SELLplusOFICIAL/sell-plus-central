/**
 * Seed de fábrica de Sell-Plus 3.3.0
 * Crea la base de datos inicial: usuarios del dueño, marcador de esquema
 * y productos de ejemplo para empezar a trabajar de inmediato.
 *
 * Uso: DATABASE_URL="file:./fabrica.db" bun seed-fabrica.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.sellPlusMeta.upsert({
    where: { clave: 'esquemaVersion' },
    update: { valor: '2' },
    create: { clave: 'esquemaVersion', valor: '2' },
  })

  await db.usuario.upsert({
    where: { nombre: 'Dueño' },
    update: {},
    create: { nombre: 'Dueño', pin: '1234', rol: 'dueno' },
  })
  await db.usuario.upsert({
    where: { nombre: 'María' },
    update: {},
    create: { nombre: 'María', pin: '1111', rol: 'empleado' },
  })

  // Productos de ejemplo (el dueño puede eliminarlos desde Inventarios)
  const demo = [
    { nombre: 'Leche Entera 1L', categoria: 'Lácteos', precioVenta: 26, costo: 19, minimo: 6, existencia: 24, caducidad: +21, proveedor: 'Lácteos del Valle' },
    { nombre: 'Refresco Cola 600ml', categoria: 'Bebidas', precioVenta: 22, costo: 15.5, minimo: 10, existencia: 36, caducidad: +120, proveedor: 'Distribuidora Central' },
    { nombre: 'Pan de caja', categoria: 'Panadería', precioVenta: 42, costo: 30, minimo: 4, existencia: 8, caducidad: +6, proveedor: 'Panificadora Local' },
    { nombre: 'Jabón de baño', categoria: 'Higiene', precioVenta: 18, costo: 11, minimo: 5, existencia: 15, caducidad: null, proveedor: '' },
    { nombre: 'Papas fritas 150g', categoria: 'Abarrotes', precioVenta: 25, costo: 17, minimo: 8, existencia: 3, caducidad: +45, proveedor: 'Distribuidora Central' },
  ]

  for (const d of demo) {
    const existe = await db.producto.findFirst({ where: { nombre: d.nombre } })
    if (existe) continue
    const p = await db.producto.create({
      data: {
        nombre: d.nombre,
        categoria: d.categoria,
        precioVenta: d.precioVenta,
        costo: d.costo,
        minimo: d.minimo,
      },
    })
    if (d.existencia > 0) {
      await db.lote.create({
        data: {
          productoId: p.id,
          cantidad: d.existencia,
          cantidadInicial: d.existencia,
          caducidad: d.caducidad ? new Date(Date.now() + d.caducidad * 86400000) : null,
          proveedor: d.proveedor,
          costoUnitario: d.costo,
        },
      })
      await db.movimientoInventario.create({
        data: { productoId: p.id, tipo: 'entrada', cantidad: d.existencia, motivo: 'Inventario inicial', usuario: 'Dueño' },
      })
    }
  }

  console.log('Seed de fábrica OK: 2 usuarios + 5 productos de ejemplo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
