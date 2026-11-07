import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const conv = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }
    return NextResponse.json({
      id: conv.id,
      title: conv.title,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error("[api/conversations/:id] Error:", err);
    return NextResponse.json({ error: "Error al leer la conversación." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.conversation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/conversations/:id] Error DELETE:", err);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
