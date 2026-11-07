"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, MessageSquarePlus, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDate, type ConversationDto, type MessageDto } from "./shared";

const SUGERENCIAS = [
  "Explícame cómo funcionará el envío automático de actualizaciones a las tiendas.",
  "¿Qué mejoras harías primero al programa y por qué?",
  "Necesito agregar el módulo de auto-actualización a Sell-Plus. Propón la actualización.",
  "Recuerda: ¿qué pasó con el fallo de arranque y cómo se resolvió?",
];

export function ChatTab({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    loadConversations();
  }, [refreshKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const openConversation = async (id: string) => {
    setLoadingConv(true);
    setCurrentId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      toast({ title: "No se pudo abrir la conversación.", variant: "destructive" });
    } finally {
      setLoadingConv(false);
    }
  };

  const newConversation = () => {
    setCurrentId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (id === currentId) newConversation();
      loadConversations();
      toast({ title: "Conversación eliminada." });
    } catch {
      toast({ title: "No se pudo eliminar.", variant: "destructive" });
    }
  };

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);

    // Mostrar el mensaje del usuario de inmediato
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: message, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: currentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setCurrentId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.replyId,
          role: "assistant",
          content: data.reply,
          createdAt: data.createdAt,
        },
      ]);
      loadConversations();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "No pude responder. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Lista de conversaciones */}
      <Card className="order-2 lg:order-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Conversaciones</CardTitle>
            <Button size="sm" variant="outline" onClick={newConversation}>
              <MessageSquarePlus className="h-4 w-4" />
              Nueva
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-1 pr-3">
              {conversations.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  Aún no hay conversaciones. Escribe tu primer mensaje: la IA ya conoce todo el
                  proyecto.
                </p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg p-2 text-sm transition-colors",
                    c.id === currentId ? "bg-emerald-50 text-emerald-900" : "hover:bg-stone-50"
                  )}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openConversation(c.id)}
                  >
                    <span className="block truncate font-medium">{c.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.messageCount} mensajes · {formatDate(c.updatedAt)}
                    </span>
                  </button>
                  <button
                    aria-label="Eliminar conversación"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteConversation(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-stone-400 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área de chat */}
      <Card className="order-1 flex min-h-[560px] flex-col lg:order-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Bot className="h-4 w-4 text-emerald-700" />
            </span>
            Ingeniero IA de Sell-Plus
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              conoce todo el proceso de creación desde su base de datos
            </span>
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-1 flex-col p-0">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              {messages.length === 0 && !loadingConv && (
                <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <Bot className="h-7 w-7 text-emerald-700" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hola, soy tu ingeniero de software. Tengo en mi memoria toda la historia de
                    Sell-Plus: la recuperación del programa, el instalador de 64 bits, el fallo de
                    arranque y la corrección 3.0.1. Pregúntame lo que quieras o pídeme el próximo
                    cambio.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SUGERENCIAS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg border bg-white p-3 text-left text-xs text-muted-foreground transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingConv && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando conversación…
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Bot className="h-3.5 w-3.5 text-emerald-700" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "whitespace-pre-wrap rounded-br-md bg-emerald-600 text-white"
                        : "rounded-bl-md border bg-white text-foreground [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-semibold [&_ul]:list-disc [&_li+li]:mt-1 [&_h1+*]:mt-1 [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-stone-950 [&_pre]:p-3 [&_pre]:text-[11px] [&_pre]:text-stone-100"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200">
                      <User className="h-3.5 w-3.5 text-stone-600" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-2.5">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Bot className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border bg-white px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Pensando como ingeniero del proyecto…
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <Separator />
          <div className="p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Escribe aquí… (Enter para enviar, Shift+Enter para salto de línea)"
                className="min-h-[52px] resize-none"
                disabled={sending}
              />
              <Button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                size="icon"
                className="h-[52px] w-[52px] shrink-0"
                aria-label="Enviar mensaje"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
