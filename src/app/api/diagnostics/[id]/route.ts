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

// Reporte de diagnóstico sobre el modelo real `PaladinReporte`. Solicitud #9.
// El log original vive guardado dentro del campo checks como JSON.
async function leerLog(paladinId: number): Promise<string> {
  const r = await db.paladinReporte.findUnique({ where: { id: paladinId } });
  if (!r) return "";
  try {
    const checks = JSON.parse(r.checks || "[]");
    const c = Array.isArray(checks) ? checks.find((x: { nombre?: string }) => x?.nombre === "log") : null;
    return String(c?.detalle ?? "");
  } catch {
    return "";
  }
}

function severidadAGlobal(sev: string): string {
  if (sev === "ok") return "ok";
  if (sev === "critica" || sev === "alta") return "fallo";
  return "alerta";
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }
    const body = await req.json();
    const action = String(body.action ?? "");

    const report = await db.paladinReporte.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }

    // --- Marcar como resuelto ---
    if (action === "resolve") {
      const updated = await db.paladinReporte.update({
        where: { id },
        data: { estadoGlobal: "ok", alertasCount: 0, fallosCount: 0 },
      });
      return NextResponse.json({ report: { id: String(updated.id), status: "resuelto" } });
    }

    // --- Analizar con IA ---
    if (action === "analyze") {
      const logContent = await leerLog(id);
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
Versión del programa: ${report.versionPos ?? "desconocida"}
${logContent.slice(0, 20000)}
---`;

      const answer = await callAi([{ role: "user", content: analysisPrompt }]);
      const parsed = extractJson<Analysis>(answer);

      const severity =
        parsed?.severity && VALID_SEVERITIES.includes(parsed.severity.toLowerCase())
          ? parsed.severity.toLowerCase()
          : "media";

      const resumen = parsed
        ? `${parsed.summary ?? answer.slice(0, 300)}${parsed.cause ? ` — Causa probable: ${parsed.cause}` : ""}${parsed.recommendation ? ` — Recomendación: ${parsed.recommendation}` : ""}`
        : answer.slice(0, 500);

      const updated = await db.paladinReporte.update({
        where: { id },
        data: {
          estadoGlobal: severidadAGlobal(severity),
          resumen,
          fallosCount: severity === "critica" || severity === "alta" ? 1 : 0,
          alertasCount: severity === "media" || severity === "baja" ? 1 : 0,
          okCount: severity === "ok" ? 1 : 0,
        },
      });
      return NextResponse.json({
        report: {
          id: String(updated.id),
          status: "analizado",
          severity,
          summary: updated.resumen,
        },
      });
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
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }
    await db.paladinReporte.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/diagnostics/:id DELETE] Error:", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
