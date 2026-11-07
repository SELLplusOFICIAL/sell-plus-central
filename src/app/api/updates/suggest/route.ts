import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callAi, extractJson } from "@/lib/sellplus-ai";

interface Draft {
  version?: string;
  title?: string;
  type?: string;
  changelog?: string;
}

const VALID_TYPES = ["funcion", "mejora", "correccion", "seguridad"];

/**
 * La IA sugiere y genera un borrador de actualización a partir de una idea
 * (o de los últimos diagnósticos si no se da una idea).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const idea = String(body.idea ?? "").trim();

    const [published, reports] = await Promise.all([
      db.softwareUpdate.findMany({
        where: { status: "publicada" },
        orderBy: { version: "desc" },
        take: 5,
      }),
      db.diagnosticReport.findMany({
        where: { severity: { in: ["critica", "alta"] }, status: { not: "resuelto" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const latest = published[0];
    const suggestionPrompt = `Eres el ingeniero principal de Sell-Plus (punto de venta para Windows 64 bits, Electron + Next.js + Prisma/SQLite, instalado en C:\\Sell-Plus). Genera un BORRADOR de la siguiente actualización del programa.

Última versión publicada: ${latest ? `v${latest.version} — ${latest.title}` : "ninguna"}
Versiones anteriores: ${published.map((p) => `v${p.version}`).join(", ") || "ninguna"}
Diagnósticos graves pendientes: ${reports.map((r) => r.summary || "(sin análisis)").join(" | ") || "ninguno"}
Idea del dueño: ${idea || "(el dueño no especificó; propón tú la mejora más útil para una tienda que usa el POS)"}

Reglas:
- La versión siguiente debe ser mayor que la última publicada (formato X.Y.Z).
- Tipo válido: "funcion" (nueva función), "mejora", "correccion" o "seguridad".
- Changelog: lista en viñetas (una por línea, empieza cada línea con "- ") en español claro.
- Todo se instala encima sin desinstalar y sin tocar la base de datos del cliente.

Responde SOLO con un objeto JSON válido, sin texto adicional:
{"version":"X.Y.Z","title":"título corto","type":"funcion|mejora|correccion|seguridad","changelog":"- punto 1\\n- punto 2\\n- punto 3"}`;

    const answer = await callAi([{ role: "user", content: suggestionPrompt }]);
    const draft = extractJson<Draft>(answer);

    if (!draft || !draft.version || !draft.title || !draft.changelog) {
      return NextResponse.json(
        { error: "La IA no devolvió un borrador válido. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const type = VALID_TYPES.includes(String(draft.type)) ? String(draft.type) : "mejora";

    // Si la versión sugerida ya existe, subir el parche automáticamente
    let version = String(draft.version);
    const exists = await db.softwareUpdate.findUnique({ where: { version } });
    if (exists) {
      const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
      parts[2] = (parts[2] ?? 0) + 1;
      version = parts.join(".");
    }

    return NextResponse.json({ draft: { version, title: draft.title, type, changelog: draft.changelog } });
  } catch (err) {
    console.error("[api/updates/suggest] Error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el borrador. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
