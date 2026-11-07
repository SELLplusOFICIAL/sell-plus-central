import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const reports = await db.diagnosticReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
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

    const report = await db.diagnosticReport.create({
      data: {
        logContent,
        source: body.source === "auto" ? "auto" : "manual",
        machineId: body.machineId ? String(body.machineId) : null,
        programVersion: body.programVersion ? String(body.programVersion) : null,
        status: "nuevo",
      },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("[api/diagnostics POST] Error:", err);
    return NextResponse.json({ error: "No se pudo guardar el reporte." }, { status: 500 });
  }
}
