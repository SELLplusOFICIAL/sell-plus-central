import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareVersions } from "@/lib/sellplus-ai";
import { gestionarOrdenEquipo } from "@/lib/central";

/**
 * API que consulta cada programa Sell-Plus instalado (auto-actualizador).
 * GET /api/client/check?current=3.0.1&machine=ID&name=Nombre&ubicacion=Caja+1&os=Windows...
 * Devuelve la última actualización publicada si es más nueva que la actual,
 * con los datos del instalador para que el programa pueda descargarlo.
 * También registra/actualiza el equipo (flota) y le entrega la orden de
 * actualización que el administrador mandó desde el panel, si existe.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const current = (searchParams.get("current") ?? "0.0.0").trim();
    const machineId = (searchParams.get("machine") ?? "").trim();
    const machineName = (searchParams.get("name") ?? "").trim();
    const ubicacion = (searchParams.get("ubicacion") ?? "").trim();
    const os = (searchParams.get("os") ?? "").trim();

    // Registrar o actualizar el equipo que consulta
    if (machineId) {
      const data = {
        version: current,
        machineName: machineName || null,
        ubicacion: ubicacion || null,
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
    // Consulta ligera: los campos del contrato; las notas solo de la elegida.
    const publicadas = await db.version.findMany({
      where: { activo: true },
      select: { id: true, version: true, titulo: true, fecha: true, fileName: true, fileSize: true, sha256: true, externalUrl: true },
    });
    let latest: {
      id: number; version: string; titulo: string; fecha: Date; fileName: string | null;
      fileSize: number | null; sha256: string | null; externalUrl: string | null;
    } | null = null;
    for (const u of publicadas) {
      if (!latest || compareVersions(u.version, latest.version) > 0) latest = u;
    }
    const filaNotas = latest
      ? await db.version.findUnique({ where: { id: latest.id }, select: { notas: true } })
      : null;

    const hasUpdate = !!latest && compareVersions(latest.version, current) > 0;

    // Orden de actualización del administrador (solo equipos identificados)
    const ordenInfo = machineId
      ? await gestionarOrdenEquipo(machineId, current, hasUpdate)
      : { orden: null, versionDestino: null };

    return NextResponse.json(
      {
        program: "Sell-Plus",
        current,
        hasUpdate,
        // Orden de actualización (flota identificada)
        orden: ordenInfo.orden,
        actualizarAhora: ordenInfo.orden === "actualizar_ahora",
        versionDestino: ordenInfo.versionDestino,
        latest: latest
          ? {
              version: latest.version,
              title: latest.titulo,
              type: "actualizacion",
              changelog: filaNotas?.notas ?? "",
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
