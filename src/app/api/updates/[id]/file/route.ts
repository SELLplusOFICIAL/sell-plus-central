import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { UPDATES_DIR } from "@/lib/rutas";

/**
 * Adjunta el archivo instalador a una actualización existente.
 * POST /api/updates/<id>/file  (multipart/form-data, campo "file")
 *
 * Guarda el archivo en <proyecto>/central-files/updates/ y registra
 * nombre, tamaño y huella SHA-256 en la base de datos. Si la versión ya
 * tenía un archivo, el anterior se reemplaza.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const update = await db.softwareUpdate.findUnique({ where: { id } });
    if (!update) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo (campo 'file')." }, { status: 400 });
    }

    // Nombre seguro: Sell-Plus-<version>-Instalador-Windows-64bits.exe (o el nombre original saneado)
    const original = path.basename(file.name || "instalador.exe").replace(/[^a-zA-Z0-9._ -]/g, "_");
    const safeName = original || `Sell-Plus-${update.version}-Instalador.exe`;

    // Hash en streaming mientras se escribe a disco
    const hash = createHash("sha256");
    const dest = path.join(UPDATES_DIR, safeName);
    async function* conHash(source: AsyncIterable<Buffer>) {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    }
    await pipeline(
      Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
      conHash,
      createWriteStream(dest)
    );

    const saved = await db.softwareUpdate.update({
      where: { id },
      data: {
        fileName: safeName,
        fileSize: file.size,
        fileSha256: hash.digest("hex"),
      },
    });

    return NextResponse.json({ update: saved });
  } catch (err) {
    console.error("[api/updates/:id/file POST] Error:", err);
    return NextResponse.json({ error: "No se pudo guardar el archivo." }, { status: 500 });
  }
}
