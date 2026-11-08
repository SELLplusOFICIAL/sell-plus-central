/**
 * Registra en la Base de Conocimiento las decisiones de la sesión
 * (despliegue Vercel + kit de acceso directo) y regenera
 * prisma/datos-iniciales.json para que Vercel reciba también estas entradas.
 * Uso: node scripts/registra-kb-vercel.js
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const db = new PrismaClient();

const regs = [
  {
    category: "reglas",
    title: "Despliegue permanente: Vercel + GitHub Releases (decisión del dueño 07/11/2026)",
    order: 22,
    content: [
      "El dueño eligió Vercel (plan gratuito) para hacer permanente la Central. Plan acordado:",
      "1) Código del sitio: se sube a GitHub (repo público sell-plus-central; público porque los instaladores deben descargarse sin login). Paquete listo: download/Sell-Plus-Central-Codigo-para-Vercel.zip (131 archivos, sin .env ni .exe ni db).",
      "2) Base de datos: Neon Postgres vía Storage de Vercel; variable DATABASE_URL = cadena 'Direct connection' (SIN -pooler).",
      "3) Build de Vercel usa el script 'vercel-build': scripts/use-postgres-schema.js (copia prisma/schema.postgres.prisma sobre schema.prisma) → prisma generate → prisma db push → prisma/seed.mjs (idempotente; datos de prisma/datos-iniciales.json: 2 versiones, 1 tutorial, 16 KB, 4 issues, 5 equipos, 1 chat, 1 reporte) → next build.",
      "4) Instaladores grandes (~84 MB): NO en el repo ni en Vercel; van a GitHub Releases del repo del dueño. SoftwareUpdate.externalUrl (nuevo campo) → /api/client/download responde 302 a esa URL. El auto-actualizador v3.1.0 ya sigue redirecciones (hasta 5 saltos), así que NO se requiere nueva versión del POS para migrar.",
      "5) Cuando el dueño tenga la URL de Vercel: ejecutar Kit-Acceso-Central (Configurar-Central.bat) con la URL nueva → crea acceso directo en escritorio + escribe C:/Sell-Plus/resources/app/db/central-url.txt (el actualizador lee ese txt primero). En la próxima versión del POS, poner la URL de Vercel como URL de fábrica en auto-actualizador.js y central-url.txt del paquete.",
      "6) IA del sitio fuera del sandbox: sin .z-ai-config; callAi lanza un mensaje amable. Soporta la variable ZAI_CONFIG_B64 (config del SDK en base64) por si se desea activarla en el futuro. NUNCA subir .z-ai-config ni .env a GitHub.",
    ].join("\n"),
  },
  {
    category: "archivos",
    title: "Entregables 07/11/2026: Kit acceso directo + paquete Vercel + guía PDF",
    order: 23,
    content: [
      "- download/Kit-Acceso-Central.zip (4 archivos): Configurar-Central.bat (lanzador), Configurar-Central.ps1 (BOM UTF-8: pregunta la URL, por defecto la del sandbox; copia central.ico a C:/Sell-Plus o %LOCALAPPDATA%; crea [Escritorio]/Sell-Plus Central.url con icono; actualiza central-url.txt si el programa existe), central.ico (7 tamaños, S+ blanco sobre verde esmeralda, generado con scripts/make-icono-central.py), LEEME.txt.",
      "- download/Sell-Plus-Central-Codigo-para-Vercel.zip: código fuente limpio para subir a GitHub (src, prisma con seed+datos, public, scripts/use-postgres-schema.js, central-files/tutoriales, configs raíz, .gitignore reforzado, .env.example, README.md, DESPLEGAR-EN-VERCEL.md).",
      "- download/Guia-Despliegue-Central-Vercel.pdf (10 páginas) + .html fuente: guía en 8 capítulos + checklist final; mismo diseño del Manual del Dueño; numeración con scripts/numera-guia-vercel.py (pymupdf).",
      "- El dueño ya tiene instalado el POS 3.1.0 (84,463,555 bytes, SHA-256 55126d...788d).",
    ].join("\n"),
  },
];

(async () => {
  // Migrado a los modelos reales del esquema. Solicitud #9.
  for (const r of regs) {
    const exists = await db.tutorial.findFirst({ where: { titulo: r.title } });
    if (exists) {
      await db.tutorial.update({
        where: { id: exists.id },
        data: { contenido: r.content, orden: r.order, descripcion: `Conocimiento del proyecto (${r.category})` },
      });
      console.log("actualizada:", r.title.slice(0, 60));
    } else {
      await db.tutorial.create({
        data: {
          titulo: r.title,
          descripcion: `Conocimiento del proyecto (${r.category})`,
          contenido: r.content,
          orden: r.order,
          tipo: "guia",
          publicado: false,
        },
      });
      console.log("creada:", r.title.slice(0, 60));
    }
  }

  const dump = {
    exportado: new Date().toISOString(),
    versiones: await db.version.findMany({ orderBy: { fecha: "asc" } }),
    tutoriales: await db.tutorial.findMany({ orderBy: { orden: "asc" } }),
    solicitudes: await db.solicitud.findMany({ orderBy: { fecha: "asc" } }),
    paladinReportes: await db.paladinReporte.findMany({ orderBy: { fecha: "asc" } }),
    clientMachines: await db.clientMachine.findMany({ orderBy: { firstSeenAt: "asc" } }),
    conversations: await db.conversation.findMany({ include: { messages: true } }),
    actividad: await db.actividad.findMany({ orderBy: { fecha: "asc" } }),
  };
  fs.writeFileSync("prisma/datos-iniciales.json", JSON.stringify(dump, null, 2));
  console.log("datos-iniciales.json regenerado | tutoriales:", dump.tutoriales.length);
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
