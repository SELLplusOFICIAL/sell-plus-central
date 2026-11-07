"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  Link2,
  Monitor,
  Package,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CATEGORY_LABELS,
  formatDate,
  relativeTime,
  SeverityBadge,
  type KnownIssueDto,
  type KnowledgeEntryDto,
  type Stats,
} from "./shared";

export function PanelTab({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntryDto[]>([]);
  const [issues, setIssues] = useState<KnownIssueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [r1, r2] = await Promise.all([fetch("/api/stats"), fetch("/api/knowledge")]);
        const s = await r1.json();
        const k = await r2.json();
        if (!alive) return;
        setStats(s);
        setEntries(k.entries ?? []);
        setIssues(k.issues ?? []);
      } catch {
        // silencioso: se reintenta en el próximo ciclo
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15000); // en tiempo real
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refreshKey]);

  const cards = [
    {
      title: "Equipos con Sell-Plus",
      value: stats ? String(stats.clients) : "…",
      icon: Monitor,
      hint: stats ? `${stats.activeClients} activos en las últimas 24 h` : "",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Última versión publicada",
      value: stats?.latestPublished ? `v${stats.latestPublished.version}` : "…",
      icon: Package,
      hint: stats?.latestPublished ? stats.latestPublished.title : "",
      iconClass: "bg-teal-100 text-teal-700",
    },
    {
      title: "Reportes de diagnóstico",
      value: stats ? String(stats.reports) : "…",
      icon: Stethoscope,
      hint: stats ? `${stats.pendingReports} pendientes de resolver` : "",
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      title: "Conversaciones con la IA",
      value: stats ? String(stats.conversations) : "…",
      icon: Bot,
      hint: stats ? `${stats.knowledgeEntries} entradas de conocimiento en memoria` : "",
      iconClass: "bg-lime-100 text-lime-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tarjeta de estado */}
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Sell-Plus 3.1.0 — Auto-Actualizador integrado
          </CardTitle>
          <CardDescription>
            El programa ahora se conecta solo a este sitio: consulta, descarga e instala
            actualizaciones preservando siempre la base de datos (C:\Sell-Plus, solo Windows 64
            bits). Confirmado funcionando por el dueño el 06/11/2026.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* URL de conexión para el Auto-Actualizador */}
      {origin && (
        <Card className="border-sky-200 bg-sky-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-sky-600" />
              URL de conexión del Auto-Actualizador
            </CardTitle>
            <CardDescription>
              Si algún equipo aparece como &quot;sin conexión a Central&quot;, copia esta dirección
              en el archivo{" "}
              <code className="rounded bg-sky-100 px-1 py-0.5 text-[11px]">
                C:\Sell-Plus\resources\app\db\central-url.txt
              </code>{" "}
              (una sola línea) y reinicia el programa. Así el programa siempre sabe dónde está este
              panel, aunque la dirección del sitio cambie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-stone-950 px-3 py-2 font-mono text-xs text-stone-100">
                {origin}
              </code>
              <button
                type="button"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-medium hover:bg-stone-50"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(origin);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // sin permiso del portapapeles
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "¡Copiada!" : "Copiar"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${c.iconClass}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                {loading && !stats ? (
                  <>
                    <Skeleton className="h-7 w-14" />
                    <Skeleton className="mt-1 h-4 w-32" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold leading-tight">{c.value}</div>
                    <div className="truncate text-sm font-medium text-muted-foreground">{c.title}</div>
                    {c.hint && <div className="truncate text-xs text-muted-foreground">{c.hint}</div>}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Flota de equipos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-emerald-600" />
              Tiendas conectadas (en tiempo real)
            </CardTitle>
            <CardDescription>
              Cada programa Sell-Plus reporta al sitio automáticamente. Cuando publiques una
              actualización, aquí verás qué equipos la recibieron.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats && stats.machines.length > 0 ? (
              <ScrollArea className="max-h-72">
                <div className="space-y-2 pr-3">
                  {stats.machines.map((m) => {
                    const active = Date.now() - new Date(m.lastSeenAt).getTime() < 24 * 3600 * 1000;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {m.machineName || m.machineId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            v{m.version} · visto {relativeTime(String(m.lastSeenAt))}
                          </div>
                        </div>
                        <span
                          className={`ml-3 flex items-center gap-1.5 text-xs font-medium ${
                            active ? "text-emerald-700" : "text-stone-400"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              active ? "animate-pulse bg-emerald-500" : "bg-stone-300"
                            }`}
                          />
                          {active ? "En línea" : "Inactivo"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay equipos reportando. La próxima actualización de Sell-Plus integrará
                el auto-actualizador, que conecta cada tienda con este sitio.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Problemas conocidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Problemas conocidos y soluciones
            </CardTitle>
            <CardDescription>
              La memoria de errores que el programa ya superó. El diagnosticador y la IA usan esta
              lista para identificar fallas al instante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2 pr-3">
                {issues.map((i) => (
                  <details
                    key={i.id}
                    className="group rounded-lg border p-3 open:bg-stone-50"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{i.title}</span>
                        <SeverityBadge severity={i.severity} />
                      </div>
                      <span className="mt-1 block text-xs text-muted-foreground group-open:hidden">
                        Toca para ver causa y solución
                      </span>
                    </summary>
                    <div className="mt-2 space-y-1.5 border-t pt-2 text-xs">
                      <p>
                        <span className="font-semibold">Síntomas:</span> {i.symptoms}
                      </p>
                      <p>
                        <span className="font-semibold">Causa:</span> {i.cause}
                      </p>
                      <p>
                        <span className="font-semibold">Solución:</span> {i.solution}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Base de conocimiento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Base de conocimiento del proyecto
          </CardTitle>
          <CardDescription>
            Todo el proceso de creación está guardado aquí y en la base de datos. Es exactamente lo
            que la IA del chat tiene en memoria: no necesitas volver a enlazar chats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {entries.map((e) => (
                <AccordionItem key={e.id} value={e.id}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2 text-left">
                      <Database className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {CATEGORY_LABELS[e.category] ?? e.category}: {e.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {e.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando conocimiento…</p>
          )}
        </CardContent>
      </Card>

      {stats?.latestPublished && (
        <p className="text-center text-xs text-muted-foreground">
          Última publicación: v{stats.latestPublished.version} · {formatDate(stats.latestPublished.publishedAt)}
        </p>
      )}
    </div>
  );
}
