import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildSellPlusSystemPrompt, callAi, type AiMessage } from "@/lib/sellplus-ai";

const MAX_HISTORY = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body.message ?? "").toString().trim();
    let conversationId = body.conversationId ? String(body.conversationId) : null;

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío." },
        { status: 400 }
      );
    }

    // Crear conversación si no existe
    if (!conversationId) {
      const conv = await db.conversation.create({
        data: {
          title: message.slice(0, 60) + (message.length > 60 ? "…" : ""),
        },
      });
      conversationId = conv.id;
    } else {
      const exists = await db.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "La conversación no existe." },
          { status: 404 }
        );
      }
    }

    // Guardar mensaje del usuario
    await db.message.create({
      data: { conversationId, role: "user", content: message },
    });

    // Historial reciente (incluye el mensaje recién guardado, ya va al final)
    const history = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: MAX_HISTORY,
    });

    const systemPrompt = await buildSellPlusSystemPrompt();
    const aiMessages: AiMessage[] = [
      { role: "assistant", content: systemPrompt },
      ...history.slice(-MAX_HISTORY).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ];

    const reply = await callAi(aiMessages);

    const saved = await db.message.create({
      data: { conversationId, role: "assistant", content: reply },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId,
      reply: saved.content,
      replyId: saved.id,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    console.error("[api/chat] Error:", err);
    return NextResponse.json(
      { error: "No pude responder en este momento. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
