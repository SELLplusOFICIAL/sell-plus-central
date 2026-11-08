import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Reportes de diagnóstico. Migrados al modelo real `PaladinReporte`
// (el log completo se guarda dentro del campo checks como JSON). Solicitud #9.
export async function GET() {
  try {
    const rows = await db.paladinReporte.findMany({
      where: { origen: { in: ["diagnostico", "diagnostico-auto"] } },
      orderBy: { fecha: "desc" },
      take: 50,
    });
    const reports = rows.map((r) => ({
      id: String(r.id),
      source: r.origen === "diagnostico-auto" ? "auto" : "manual",
      status: r.estadoGlobal === "ok" ? "resuelto" : "nuevo",
      machineId: null,
      programVersion: r.versionPos,
      createdAt: r.fecha,
      summary: r.resumen,
      severity: r.estadoGlobal,
    }));
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[api/diagnostics GET] Error:", err);
    return NextResponse.json({ error: "Error al listar reportes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const logContent = (body.logContent ?? "").toString().trim();
    if (!logContent) {
      return NextResponse.json(
        { error: "Debes pegar el contenido del log o informe." },
        { status: 400 }
      );
    }
    if (logContent.length > 200_000) {
      return NextResponse.json(
        { error: "El contenido es demasiado largo (máximo 200.000 caracteres)." },
        { status: 400 }
      );
    }

    const report = await db.paladinReporte.create({
      data: {
        origen: body.source === "auto" ? "diagnostico-auto" : "diagnostico",
        versionPos: body.programVersion ? String(body.programVersion) : null,
        estadoGlobal: "alerta",
        resumen: "Diagnóstico recibido, pendiente de análisis.",
        checks: JSON.stringify([
          { nombre: "log", estado: "recibido", detalle: logContent },
        ]),
        alertasCount: 1,
      },
    });
    return NextResponse.json(
      {
        report: {
          id: String(report.id),
          status: "nuevo",
          programVersion: report.versionPos,
          createdAt: report.fecha,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/diagnostics POST] Error:", err);
    return NextResponse.json({ error: "No se pudo guardar el reporte." }, { status: 500 });
  }
}
