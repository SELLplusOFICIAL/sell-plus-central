import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareVersions } from "@/lib/sellplus-ai";

/**
 * Latido de los equipos con Sell-Plus instalado (reporte de vida).
 * POST JSON { machineId, machineName?, version, os? }  o GET con query params.
 * Devuelve si hay actualización disponible.
 */
async function handle(machineId: string, version: string, machineName: string, os: string) {
  const data = {
    version: version || "desconocida",
    machineName: machineName || null,
    os: os || null,
    lastSeenAt: new Date(),
  };
  await db.clientMachine.upsert({
    where: { machineId },
    update: data,
    create: { machineId, ...data, firstSeenAt: new Date() },
  });

  const latest = await db.softwareUpdate.findFirst({
    where: { status: "publicada" },
    orderBy: { version: "desc" },
  });
  const hasUpdate = !!latest && compareVersions(latest.version, version) > 0;
  return { ok: true, hasUpdate, latestVersion: latest?.version ?? null };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = (searchParams.get("machine") ?? "").trim();
    if (!machineId) {
      return NextResponse.json({ error: "Falta 'machine'." }, { status: 400 });
    }
    const result = await handle(
      machineId,
      (searchParams.get("version") ?? "").trim(),
      (searchParams.get("name") ?? "").trim(),
      (searchParams.get("os") ?? "").trim()
    );
    return NextResponse.json(result, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    console.error("[api/client/heartbeat GET] Error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const machineId = String(body.machineId ?? "").trim();
    if (!machineId) {
      return NextResponse.json({ error: "Falta 'machineId'." }, { status: 400 });
    }
    const result = await handle(
      machineId,
      String(body.version ?? "").trim(),
      String(body.machineName ?? "").trim(),
      String(body.os ?? "").trim()
    );
    return NextResponse.json(result, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    console.error("[api/client/heartbeat POST] Error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
