import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Migrado al modelo real `Version` (id numérico). Solicitud #9.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }
    const body = await req.json();
    const update = await db.version.findUnique({ where: { id } });
    if (!update) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.status === "publicada" || body.status === "borrador") {
      data.activo = body.status === "publicada";
    }
    if (body.title) data.titulo = String(body.title).trim();
    if (body.changelog) data.notas = String(body.changelog).trim();
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

    const updated = await db.version.update({ where: { id }, data });
    return NextResponse.json({ update: updated });
  } catch (err) {
    console.error("[api/updates/:id PATCH] Error:", err);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }
    await db.version.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/updates/:id DELETE] Error:", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
