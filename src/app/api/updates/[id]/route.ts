import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const update = await db.softwareUpdate.findUnique({ where: { id } });
    if (!update) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.status === "publicada" || body.status === "borrador") {
      data.status = body.status;
      data.publishedAt = body.status === "publicada" ? new Date() : null;
    }
    if (body.title) data.title = String(body.title).trim();
    if (body.changelog) data.changelog = String(body.changelog).trim();
    if (body.type && ["funcion", "mejora", "correccion", "seguridad", "base"].includes(body.type)) {
      data.type = body.type;
    }
    // URL externa del instalador (ej. GitHub Releases). Cadena vacía = quitarla.
    if (typeof body.externalUrl === "string") {
      const url = body.externalUrl.trim();
      if (url === "") {
        data.externalUrl = null;
      } else if (/^https?:\/\/\S+$/i.test(url)) {
        data.externalUrl = url;
      } else {
        return NextResponse.json(
          { error: "La URL externa debe empezar por http:// o https:// ." },
          { status: 400 }
        );
      }
    }

    const updated = await db.softwareUpdate.update({ where: { id }, data });
    return NextResponse.json({ update: updated });
  } catch (err) {
    console.error("[api/updates/:id PATCH] Error:", err);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.softwareUpdate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/updates/:id DELETE] Error:", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
