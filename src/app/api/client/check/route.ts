import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareVersions } from "@/lib/sellplus-ai";
import type { Version } from "@prisma/client";

/**
 * API que consulta cada programa Sell-Plus instalado (auto-actualizador).
 * GET /api/client/check?current=3.0.1&machine=ID&name=Nombre&os=Windows...
 * Devuelve la última actualización publicada si es más nueva que la actual,
 * con los datos del instalador para que el programa pueda descargarlo.
 * También registra/actualiza el equipo (heartbeat) para conocer la flota.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const current = (searchParams.get("current") ?? "0.0.0").trim();
    const machineId = (searchParams.get("machine") ?? "").trim();
    const machineName = (searchParams.get("name") ?? "").trim();
    const os = (searchParams.get("os") ?? "").trim();

    // Registrar o actualizar el equipo que consulta
    if (machineId) {
      const data = {
        version: current,
        machineName: machineName || null,
        os: os || null,
        lastSeenAt: new Date(),
      };
      await db.clientMachine.upsert({
        where: { machineId },
        update: data,
        create: { machineId, ...data, firstSeenAt: new Date() },
      });
    }

    // Elegir la más nueva de forma numérica (no lexicográfica).
    // Migrado al modelo real `Version`. Solicitud #9.
    const publicadas = await db.version.findMany({
      where: { activo: true },
    });
    let latest: Version | null = null;
    for (const u of publicadas) {
      if (!latest || compareVersions(u.version, latest.version) > 0) latest = u;
    }

    const hasUpdate = !!latest && compareVersions(latest.version, current) > 0;

    return NextResponse.json(
      {
        program: "Sell-Plus",
        current,
        hasUpdate,
        latest: latest
          ? {
              version: latest.version,
              title: latest.titulo,
              type: "actualizacion",
              changelog: latest.notas,
              publishedAt: latest.fecha,
              fileName: latest.fileName,
              fileSize: latest.fileSize,
              fileSha256: latest.sha256,
              downloadUrl:
                latest.fileName || latest.externalUrl
                  ? `/api/client/download?version=${encodeURIComponent(latest.version)}`
                  : null,
            }
          : null,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("[api/client/check] Error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
