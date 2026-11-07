/**
 * Cambia el esquema de Prisma a la variante PostgreSQL antes de generar el
 * cliente y hacer "db push" durante el despliegue en Vercel.
 *
 * Uso: node scripts/use-postgres-schema.js
 * (Se ejecuta automáticamente dentro del script "vercel-build".)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const origen = path.join(root, "prisma", "schema.postgres.prisma");
const destino = path.join(root, "prisma", "schema.prisma");

if (!fs.existsSync(origen)) {
  console.error("[use-postgres-schema] No existe prisma/schema.postgres.prisma");
  process.exit(1);
}

const contenido = fs.readFileSync(origen, "utf8");
fs.writeFileSync(destino, contenido, "utf8");
console.log("[use-postgres-schema] prisma/schema.prisma ahora usa provider = \"postgresql\".");
