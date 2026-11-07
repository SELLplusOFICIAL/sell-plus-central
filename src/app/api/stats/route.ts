import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [clients, updates, reports, conversations, knowledge, pendingReports, latestPublished, activeClients, machines] =
      await Promise.all([
        db.clientMachine.count(),
        db.softwareUpdate.count(),
        db.diagnosticReport.count(),
        db.conversation.count(),
        db.knowledgeEntry.count(),
        db.diagnosticReport.count({ where: { status: { not: "resuelto" } } }),
        db.softwareUpdate.findFirst({
          where: { status: "publicada" },
          orderBy: { version: "desc" },
        }),
        db.clientMachine.count({
          where: { lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        db.clientMachine.findMany({ orderBy: { lastSeenAt: "desc" }, take: 20 }),
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
      latestPublished: latestPublished
        ? { version: latestPublished.version, title: latestPublished.title, publishedAt: latestPublished.publishedAt }
        : null,
    });
  } catch (err) {
    console.error("[api/stats] Error:", err);
    return NextResponse.json({ error: "Error al calcular estadísticas." }, { status: 500 });
  }
}
