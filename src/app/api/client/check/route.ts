import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareVersions } from "@/lib/sellplus-ai";
import type { SoftwareUpdate } from "@prisma/client";

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

    // Elegir la más nueva de forma numérica (no lexicográfica)
    const published = await db.softwareUpdate.findMany({
      where: { status: "publicada" },
    });
    let latest: SoftwareUpdate | null = null;
    for (const u of published) {
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
              title: latest.title,
              type: latest.type,
              changelog: latest.changelog,
              publishedAt: latest.publishedAt,
              fileName: latest.fileName,
              fileSize: latest.fileSize,
              fileSha256: latest.fileSha256,
              downloadUrl: latest.fileName
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
