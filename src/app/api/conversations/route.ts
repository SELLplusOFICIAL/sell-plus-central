import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c._count.messages,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[api/conversations] Error:", err);
    return NextResponse.json({ error: "Error al listar conversaciones." }, { status: 500 });
  }
}
