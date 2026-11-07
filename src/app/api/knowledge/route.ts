import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [entries, issues] = await Promise.all([
      db.knowledgeEntry.findMany({ orderBy: { order: "asc" } }),
      db.knownIssue.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    return NextResponse.json({ entries, issues });
  } catch (err) {
    console.error("[api/knowledge] Error:", err);
    return NextResponse.json({ error: "Error al leer la base de conocimiento." }, { status: 500 });
  }
}
