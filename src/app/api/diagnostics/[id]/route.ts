import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callAi, extractJson } from "@/lib/sellplus-ai";

type Params = { params: Promise<{ id: string }> };

interface Analysis {
  severity?: string;
  summary?: string;
  cause?: string;
  recommendation?: string;
  updateNeeded?: boolean;
}

const VALID_SEVERITIES = ["critica", "alta", "media", "baja", "ok"];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action ?? "");

    const report = await db.diagnosticReport.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }

    // --- Marcar como resuelto ---
    if (action === "resolve") {
      const updated = await db.diagnosticReport.update({
        where: { id },
        data: { status: "resuelto" },
      });
      return NextResponse.json({ report: updated });
    }

    // --- Analizar con IA ---
    if (action === "analyze") {
      const analysisPrompt = `Eres el diagnosticador oficial del programa Sell-Plus (punto de venta para Windows, Electron + Next.js + Prisma/SQLite, instalado en C:\\Sell-Plus). Analiza el siguiente registro o informe de diagnóstico de una tienda.

Responde SOLO con un objeto JSON válido, sin texto adicional, con esta forma exacta:
{"severity":"critica|alta|media|baja|ok","summary":"resumen en 1-2 frases","cause":"causa probable","recommendation":"pasos concretos de solución","updateNeeded":true|false}

Reglas de diagnóstico conocidas:
- Si menciona Prisma, "engine", 32 bits o "ia32": la causa es Windows de 32 bits → solo hay 64 bits.
- Si menciona sellplus-servidor.log con [FALLO]: usa el detalle del error.
- Si no hay errores graves en el log, la gravedad es "ok" y di que todo funciona.
- "updateNeeded" es true solo si la solución requiere cambiar el programa (versión nueva).

REGISTRO A ANALIZAR:
---
Versión del programa: ${report.programVersion ?? "desconocida"}
Equipo: ${report.machineId ?? "desconocido"}
${report.logContent.slice(0, 20000)}
---`;

      const answer = await callAi([{ role: "user", content: analysisPrompt }]);
      const parsed = extractJson<Analysis>(answer);

      const severity =
        parsed?.severity && VALID_SEVERITIES.includes(parsed.severity.toLowerCase())
          ? parsed.severity.toLowerCase()
          : "media";

      const updated = await db.diagnosticReport.update({
        where: { id },
        data: {
          severity,
          summary: parsed?.summary ?? answer.slice(0, 500),
          cause: parsed?.cause ?? null,
          recommendation: parsed?.recommendation ?? null,
          updateNeeded: typeof parsed?.updateNeeded === "boolean" ? parsed.updateNeeded : null,
          status: "analizado",
          analyzedAt: new Date(),
        },
      });
      return NextResponse.json({ report: updated });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (err) {
    console.error("[api/diagnostics/:id PATCH] Error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar el reporte. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.diagnosticReport.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/diagnostics/:id DELETE] Error:", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
