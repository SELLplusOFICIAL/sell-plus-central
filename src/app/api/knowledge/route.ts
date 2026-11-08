import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Base de conocimiento para el asistente del panel.
// Migrada a los modelos reales: los tutoriales son el conocimiento y los
// reportes del Paladín con alertas/fallos son los problemas conocidos.
// Solicitud #9.
export async function GET() {
  try {
    const [tutoriales, alertas] = await Promise.all([
      db.tutorial.findMany({ orderBy: { orden: "asc" } }),
      db.paladinReporte.findMany({
        where: { estadoGlobal: { in: ["fallo", "alerta"] } },
        orderBy: { fecha: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      entries: tutoriales.map((t) => ({
        id: `tutorial-${t.id}`,
        title: t.titulo,
        content: t.contenido || t.descripcion,
        order: t.orden,
      })),
      issues: alertas.map((r) => ({
        id: `paladin-${r.id}`,
        title: (r.resumen || "Reporte del Paladín").slice(0, 90),
        severity: r.estadoGlobal,
        symptoms: r.resumen,
        cause: r.origen === "publicacion" ? "Detectado durante la publicación" : "Detectado en el software",
        solution:
          r.estadoGlobal === "fallo"
            ? "Revisar el informe del Paladín y corregir antes de publicar."
            : "Atender la alerta del Paladín cuando sea posible.",
      })),
    });
  } catch (err) {
    console.error("[api/knowledge] Error:", err);
    return NextResponse.json({ error: "Error al leer la base de conocimiento." }, { status: 500 });
  }
}
