import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActividad, pickLatest } from "@/lib/central";
import { handleDownload } from "@/lib/download-version";

/**
 * Descarga del instalador de una versión publicada.
 * GET /api/client/download?version=3.1.0  (o sin parámetro = la más reciente)
 *
 * Migrado al modelo real `Version` y delegado al mismo manejador que la ruta
 * /api/updates/download/[version]: redirige al alojamiento externo (ej. GitHub
 * Releases) cuando la versión tiene externalUrl; el auto-actualizador sigue
 * redirecciones (hasta 5 saltos) y la verificación de tamaño + SHA-256 se
 * mantiene intacta. Solicitud #9.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let version = (searchParams.get("version") ?? "").trim();

    if (!version) {
      const publicadas = await db.version.findMany({ where: { activo: true } });
      const latest = pickLatest(publicadas);
      if (!latest) {
        return NextResponse.json(
          { error: "No hay instalador disponible para esa versión." },
          { status: 404 }
        );
      }
      version = latest.version;
    }

    await logActividad("descarga", `Descarga solicitada vía /api/client/download (v${version})`).catch(
      () => {}
    );

    return handleDownload(req, version);
  } catch (err) {
    console.error("[api/client/download] Error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
