import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Estadísticas del panel. Migradas a los modelos reales del esquema
// (Version, Tutorial, Solicitud, PaladinReporte, Actividad, ClientMachine,
// Conversation). Solicitud #9.
export async function GET() {
  try {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [clients, updates, reports, conversations, knowledge, pendingReports, latestPublished, activeClients, machines, solicitudesPendientes] =
      await Promise.all([
        db.clientMachine.count(),
        db.version.count(),
        db.paladinReporte.count(),
        db.conversation.count(),
        db.tutorial.count(),
        db.paladinReporte.count({ where: { estadoGlobal: { in: ["fallo", "alerta"] } } }),
        db.version.findFirst({ where: { activo: true }, orderBy: { fecha: "desc" } }),
        db.clientMachine.count({ where: { lastSeenAt: { gte: hace24h } } }),
        db.clientMachine.findMany({ orderBy: { lastSeenAt: "desc" }, take: 20 }),
        db.solicitud.count({ where: { estado: { not: "publicada" } } }),
      ]);

    return NextResponse.json({
      clients,
      activeClients,
      machines,
      updates,
      reports,
      pendingReports,
      conversations,
      knowledgeEntries: knowledge,
      solicitudesPendientes,
      actividad24h: await db.actividad.count({ where: { fecha: { gte: hace24h } } }),
      latestPublished: latestPublished
        ? { version: latestPublished.version, title: latestPublished.titulo, publishedAt: latestPublished.fecha }
        : null,
    });
  } catch (err) {
    console.error("[api/stats] Error:", err);
    return NextResponse.json({ error: "Error al calcular estadísticas." }, { status: 500 });
  }
}
