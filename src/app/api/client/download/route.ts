import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareVersions } from "@/lib/sellplus-ai";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import type { SoftwareUpdate } from "@prisma/client";
import { UPDATES_DIR } from "@/lib/rutas";

/**
 * Descarga del instalador de una versión publicada.
 * GET /api/client/download?version=3.1.0  (o sin parámetro = la más reciente)
 *
 * - Solo sirve actualizaciones con estado "publicada" y archivo adjunto.
 * - Responde en streaming (no carga el archivo completo en memoria).
 * - Suma 1 al contador de descargas de la versión.
 *
 * Carpeta de archivos: <proyecto>/central-files/updates/<fileName>
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wanted = (searchParams.get("version") ?? "").trim();

    const published = await db.softwareUpdate.findMany({
      where: { status: "publicada" },
    });
    let target: SoftwareUpdate | null = null;
    if (wanted) {
      target = published.find((u) => u.version === wanted) ?? null;
    } else {
      for (const u of published) {
        if (!target || compareVersions(u.version, target.version) > 0) target = u;
      }
    }

    if (!target || !target.fileName) {
      return NextResponse.json(
        { error: "No hay instalador disponible para esa versión." },
        { status: 404 }
      );
    }

    try {
      await db.softwareUpdate.update({
        where: { id: target.id },
        data: { downloads: { increment: 1 } },
      });
    } catch {
      // el contador no debe bloquear la descarga
    }

    // Si el instalador vive en un almacén externo (ej. GitHub Releases),
    // se redirige ahí. El auto-actualizador sigue redirecciones (hasta 5 saltos),
    // y la verificación de tamaño + SHA-256 se mantiene intacta.
    if (target.externalUrl && /^https?:\/\//i.test(target.externalUrl)) {
      return new NextResponse(null, {
        status: 302,
        headers: {
          Location: target.externalUrl,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }

    const safeName = path.basename(target.fileName); // evita rutas maliciosas
    const filePath = path.join(UPDATES_DIR, safeName);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "El archivo del instalador no está en el servidor. Configura su URL externa (GitHub) en Actualizaciones." },
        { status: 404 }
      );
    }

    const size = statSync(filePath).size;

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/client/download] Error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
