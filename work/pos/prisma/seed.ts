// Semilla de la base de datos de fábrica de Sell-Plus 3.2.0
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.sellPlusMeta.upsert({
    where: { clave: 'schemaVersion' },
    update: {},
    create: { clave: 'schemaVersion', valor: '2' },
  })

  const dueno = await db.usuario.upsert({
    where: { nombre: 'Dueño' },
    update: {},
    create: { nombre: 'Dueño', pin: '1234', rol: 'dueno' },
  })

  await db.usuario.upsert({
    where: { nombre: 'María' },
    update: {},
    create: { nombre: 'María', pin: '1111', rol: 'empleado' },
  })

  const dias = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000)

  const productos: [string, string, number, number, number, { cantidad: number; caducidad: Date | null; proveedor: string }[]][] = [
    ['Leche Lala Entera 1L', 'Lácteos', 26, 19, 6, [{ cantidad: 24, caducidad: dias(18), proveedor: 'Lala' }]],
    ['Pan Bimbo Grande', 'Panadería', 52, 39, 6, [{ cantidad: 12, caducidad: dias(45), proveedor: 'Bimbo' }]],
    ['Coca-Cola 600 ml', 'Bebidas', 17, 12.5, 12, [{ cantidad: 48, caducidad: null, proveedor: 'Distribuidora local' }]],
    ['Sabritas Adobadas 45 g', 'Botanas', 18, 13, 10, [{ cantidad: 30, caducidad: null, proveedor: '' }]],
    ['Atún Dolores en agua 145 g', 'Enlatados', 23, 16.5, 6, [{ cantidad: 18, caducidad: null, proveedor: 'Dolores' }, { cantidad: 5, caducidad: dias(12), proveedor: 'Dolores' }]],
    ['Jabón Zote blanco 400 g', 'Limpieza', 21, 15, 5, [{ cantidad: 15, caducidad: null, proveedor: '' }]],
  ]

  for (const [nombre, categoria, precioVenta, costo, minimo, lotes] of productos) {
    let p = await db.producto.findFirst({ where: { nombre } })
    if (!p) {
      p = await db.producto.create({ data: { nombre, categoria, precioVenta, costo, minimo } })
    }
    for (const l of lotes) {
      const existe = await db.lote.findFirst({ where: { productoId: p.id, caducidad: l.caducidad, cantidadInicial: l.cantidad } })
      if (!existe) {
        await db.lote.create({
          data: { productoId: p.id, cantidad: l.cantidad, cantidadInicial: l.cantidad, caducidad: l.caducidad, proveedor: l.proveedor, costoUnitario: costo },
        })
        await db.movimientoInventario.create({
          data: { productoId: p.id, tipo: 'entrada', cantidad: l.cantidad, motivo: 'Inventario inicial', usuario: dueno.nombre },
        })
      }
    }
  }

  const cuenta = await db.producto.count()
  console.log(`Semilla lista: ${cuenta} productos, usuarios Dueño y María.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
