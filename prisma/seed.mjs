/**
 * Seed de Sell-Plus Central — carga los datos iniciales de forma SEGURA:
 *
 * • Idempotente: puede ejecutarse muchas veces sin romper nada.
 * • No destructivo: si una tabla ya tiene filas (por ejemplo, porque en la
 *   Central en producción ya se publicaron versiones nuevas), NO la toca.
 *   Solo llena las tablas que están vacías.
 * • Arregla las secuencias de PostgreSQL después de insertar ids explícitos,
 *   para que los siguientes inserts automáticos no choquen con los existentes.
 *
 * En Vercel se ejecuta automáticamente en cada build (script "vercel-build"),
 * después de "prisma db push", usando la variable de entorno DATABASE_URL.
 *
 * Los datos vienen de prisma/datos-iniciales.json (volcado real de la Central).
 * Las fechas pueden llegar como milisegundos epoch (número) o ISO (cadena).
 *
 * Uso manual: node prisma/seed.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datos = JSON.parse(readFileSync(join(__dirname, "datos-iniciales.json"), "utf8"));

const db = new PrismaClient();

/** Convierte fechas (número = ms epoch, cadena ISO = Date) y booleanos (1/0 de SQLite). */
const CAMPOS_BOOLEANOS = new Set(["activo", "publicado"]);

function normalizar(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(normalizar);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      (k === "fecha" || k === "actualizadoEn" || /At$/.test(k)) &&
      v !== null &&
      (typeof v === "number" || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)))
    ) {
      out[k] = new Date(v);
    } else if (CAMPOS_BOOLEANOS.has(k) && typeof v === "number") {
      out[k] = v !== 0;
    } else if (typeof v === "object" && v !== null) {
      out[k] = normalizar(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Carga filas solo si la tabla está vacía. Devuelve un mensaje de resumen. */
async function cargarSiVacia(modelo, filas) {
  const total = await db[modelo].count();
  if (total > 0) return `omitido (${total} filas existentes)`;
  for (const fila of filas ?? []) {
    const { id, ...resto } = normalizar(fila);
    await db[modelo].create({ data: { id, ...resto } });
  }
  return `cargado (${(filas ?? []).length} filas)`;
}

/**
 * Después de insertar filas con id explícito, PostgreSQL necesita reajustar
 * sus secuencias (AUTO_INCREMENT) o el siguiente insert duplicaría ids.
 * En SQLite no existen secuencias: el try/catch lo ignora sin ruido.
 */
async function ajustarSecuencias(tablas) {
  for (const tabla of tablas) {
    try {
      await db.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 1))`
      );
    } catch {
      /* SQLite: no aplica */
    }
  }
}

(async () => {
  console.log("[seed] Cargando datos iniciales de Sell-Plus Central…");
  const resumen = [];

  resumen.push("versiones=" + (await cargarSiVacia("version", datos.versiones)));
  resumen.push("tutoriales=" + (await cargarSiVacia("tutorial", datos.tutoriales)));
  resumen.push("solicitudes=" + (await cargarSiVacia("solicitud", datos.solicitudes)));
  resumen.push("paladinReportes=" + (await cargarSiVacia("paladinReporte", datos.paladinReportes)));
  resumen.push("actividad=" + (await cargarSiVacia("actividad", datos.actividad)));

  await ajustarSecuencias(["Version", "Tutorial", "Solicitud", "PaladinReporte", "Actividad"]);

  console.log("[seed] " + resumen.join(" · "));
  console.log("[seed] Listo. Las tablas que ya tenían datos se respetaron intactas.");
})()
  .catch((e) => {
    console.error("[seed] ERROR:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
