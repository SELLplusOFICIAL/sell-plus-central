"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  Link2,
  MapPin,
  Monitor,
  Package,
  Pencil,
  RadioTower,
  Send,
  ShieldAlert,
  Stethoscope,
  Trash2,
  DownloadCloud,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CATEGORY_LABELS,
  formatDate,
  relativeTime,
  SeverityBadge,
  type EquipoFlota,
  type FlotaRespuesta,
  type KnownIssueDto,
  type KnowledgeEntryDto,
  type Stats,
} from "./shared";

function llaveAdmin(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("central-admin-key") ?? "";
}

/** Fila de la flota: nombre, ubicación, versión y estado de actualización */
function FilaEquipo({
  m,
  ocupado,
  onMandar,
  onCancelar,
  onEditar,
  onEliminar,
}: {
  m: EquipoFlota;
  ocupado: boolean;
  onMandar: (m: EquipoFlota) => void;
  onCancelar: (m: EquipoFlota) => void;
  onEditar: (m: EquipoFlota) => void;
  onEliminar: (m: EquipoFlota) => void;
}) {
  const online = Date.now() - new Date(m.lastSeenAt).getTime() < 24 * 3600 * 1000;
  const conOrden = m.ordenActualizar;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">
              {m.machineName || m.machineId}
            </span>
            {/* Versión instalada */}
            <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-700">
              v{m.version || "?"}
            </span>
            {/* Estado de actualización */}
            {conOrden && m.estadoOrden === "entregada" ? (
              <Badge variant="outline" className="border-violet-200 bg-violet-100 text-violet-800">
                <DownloadCloud className="mr-1 h-3 w-3" />
                Instalando v{m.ordenVersion}…
              </Badge>
            ) : conOrden ? (
              <Badge variant="outline" className="border-sky-200 bg-sky-100 text-sky-800">
                <Send className="mr-1 h-3 w-3" />
                Orden enviada → v{m.ordenVersion}
              </Badge>
            ) : m.necesitaActualizacion ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                Actualizar a v{m.ultimaVersion}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Al día
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {m.ubicacion || "Sin ubicación registrada"}
            </span>
            <span>visto {relativeTime(String(m.lastSeenAt))}</span>
            {conOrden && !online && (
              <span className="text-sky-700">
                se instalará en cuanto abran el programa
              </span>
            )}
            {!conOrden && !m.necesitaActualizacion && m.ordenCumplidaEn && (
              <span className="text-emerald-700">
                actualizó {relativeTime(String(m.ordenCumplidaEn))}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {!conOrden && m.necesitaActualizacion && (
            <Button
              size="sm"
              disabled={ocupado}
              onClick={() => onMandar(m)}
              className="h-8 bg-emerald-800 px-2.5 text-xs text-white hover:bg-emerald-900"
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Mandar actualización
            </Button>
          )}
          {conOrden && (
            <Button
              size="sm"
              variant="ghost"
              disabled={ocupado}
              onClick={() => onCancelar(m)}
              className="h-8 px-2 text-xs text-stone-500 hover:text-stone-800"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancelar orden
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupado}
            onClick={() => onEditar(m)}
            title="Editar nombre y ubicación"
            className="h-8 w-8 p-0 text-stone-400 hover:text-stone-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupado}
            onClick={() => onEliminar(m)}
            title="Eliminar de la flota"
            className="h-8 w-8 p-0 text-stone-400 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
        <span
          className={`h-2 w-2 rounded-full ${
            online ? "animate-pulse bg-emerald-500" : "bg-stone-300"
          }`}
        />
        <span className={online ? "text-emerald-700" : "text-stone-400"}>
          {online ? "En línea" : "Inactivo"}
        </span>
        <span className="font-normal text-stone-400">
          · {m.os || "SO sin reportar"} · identificador {m.machineId}
        </span>
      </div>
    </div>
  );
}

export function PanelTab({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntryDto[]>([]);
  const [issues, setIssues] = useState<KnownIssueDto[]>([]);
  const [flota, setFlota] = useState<FlotaRespuesta | null>(null);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  // Edición de nombre/ubicación
  const [editando, setEditando] = useState<EquipoFlota | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [ubicacionEdit, setUbicacionEdit] = useState("");
  // Eliminación con confirmación
  const [paraEliminar, setParaEliminar] = useState<EquipoFlota | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const cargarFlota = useCallback(async () => {
    try {
      const r = await fetch("/api/equipos", {
        cache: "no-store",
        headers: { "x-central-key": llaveAdmin() },
      });
      if (r.ok) setFlota(await r.json());
    } catch {
      // silencioso: se reintenta en el próximo ciclo
    }
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
      await cargarFlota();
    }
    load();
    const t = setInterval(load, 15000); // en tiempo real
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refreshKey, cargarFlota]);

  /** Acción PATCH sobre un equipo, con toasts y recarga de la flota */
  async function accionEquipo(id: number, cuerpo: object, msgOk: string): Promise<boolean> {
    setOcupado(true);
    try {
      const r = await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-central-key": llaveAdmin() },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d?.mensaje || "No se pudo completar la acción");
        return false;
      }
      toast.success(msgOk);
      await cargarFlota();
      return true;
    } catch {
      toast.error("Fallo de red — intenta de nuevo");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function mandar(m: EquipoFlota) {
    await accionEquipo(
      m.id,
      { accion: "mandar_actualizacion" },
      `Actualización mandada a «${m.machineName || m.machineId}» → v${m.ultimaVersion}`
    );
  }

  async function cancelar(m: EquipoFlota) {
    await accionEquipo(
      m.id,
      { accion: "cancelar_orden" },
      `Orden cancelada para «${m.machineName || m.machineId}»`
    );
  }

  async function mandarATodos() {
    setOcupado(true);
    try {
      const r = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-central-key": llaveAdmin() },
        body: JSON.stringify({ accion: "mandar_a_todos" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d?.mensaje || "No se pudo mandar la actualización");
        return;
      }
      if (d.mandados > 0) {
        toast.success(`Orden mandada a ${d.mandados} equipo(s) → v${d.versionDestino}`);
      } else {
        toast.info("Nadie necesita actualización: toda la flota está al día");
      }
      await cargarFlota();
    } catch {
      toast.error("Fallo de red — intenta de nuevo");
    } finally {
      setOcupado(false);
    }
  }

  function abrirEdicion(m: EquipoFlota) {
    setEditando(m);
    setNombreEdit(m.machineName ?? "");
    setUbicacionEdit(m.ubicacion ?? "");
  }

  async function guardarEdicion() {
    if (!editando) return;
    const ok = await accionEquipo(
      editando.id,
      { accion: "renombrar", machineName: nombreEdit, ubicacion: ubicacionEdit },
      "Datos del equipo actualizados"
    );
    if (ok) setEditando(null);
  }

  async function eliminar() {
    if (!paraEliminar) return;
    const nombre = paraEliminar.machineName || paraEliminar.machineId;
    setParaEliminar(null);
    await accionEquipo(paraEliminar.id, { accion: "eliminar" }, `«${nombre}» eliminado de la flota`);
  }

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
        {/* Flota de programas instalados: versión, ubicación y actualizaciones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Programas instalados
                </CardTitle>
                <CardDescription>
                  Cada Sell-Plus reporta su versión y ubicación. Manda la actualización a quien la
                  necesite y sigue la entrega en vivo.
                </CardDescription>
              </div>
              {flota && flota.resumen.desactualizados > 0 && (
                <Button
                  size="sm"
                  onClick={mandarATodos}
                  disabled={ocupado}
                  className="shrink-0 bg-emerald-800 text-white hover:bg-emerald-900"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Mandar a los {flota.resumen.desactualizados} desactualizado
                  {flota.resumen.desactualizados === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {flota && flota.equipos.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-3">
                  {flota.equipos.map((m) => (
                    <FilaEquipo
                      key={m.id}
                      m={m}
                      ocupado={ocupado}
                      onMandar={mandar}
                      onCancelar={cancelar}
                      onEditar={abrirEdicion}
                      onEliminar={setParaEliminar}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay equipos reportando con identidad. En cuanto una caja instale la
                próxima versión del programa, aparecerá aquí con su nombre, ubicación y versión.
              </p>
            )}

            {/* Pulso del actualizador heredado (cajas sin identidad todavía) */}
            {stats?.ultimaRevisionAnonima && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-[11px] leading-relaxed text-stone-500">
                <RadioTower className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span>
                  Además, el actualizador instalado revisó hace{" "}
                  {relativeTime(stats.ultimaRevisionAnonima.fecha)}: «
                  {stats.ultimaRevisionAnonima.detalle}» ({stats.chequeosAnonimos24h} revisiones en
                  24 h). Esas cajas se actualizan solas; para verlas aquí por nombre solo necesitan
                  instalar la próxima versión del programa.
                </span>
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

      {/* Diálogo: editar nombre y ubicación */}
      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar equipo</DialogTitle>
            <DialogDescription>
              Nombre y ubicación con los que esta caja aparece en la flota (por ejemplo
              «Caja 1 — Sucursal Centro»).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="eq-nombre">Nombre del equipo</Label>
              <Input
                id="eq-nombre"
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                placeholder="Caja 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-ubicacion">Ubicación</Label>
              <Input
                id="eq-ubicacion"
                value={ubicacionEdit}
                onChange={(e) => setUbicacionEdit(e.target.value)}
                placeholder="Sucursal Centro — mostrador"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={ocupado}
                onClick={guardarEdicion}
                className="bg-emerald-800 text-white hover:bg-emerald-900"
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación: eliminar equipo */}
      <AlertDialog open={paraEliminar !== null} onOpenChange={(v) => !v && setParaEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este equipo de la flota?</AlertDialogTitle>
            <AlertDialogDescription>
              «{paraEliminar?.machineName || paraEliminar?.machineId}» dejará de aparecer en la
              lista. Si el programa sigue instalado, volverá a registrarse solo la próxima vez que
              se abra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservarlo</AlertDialogCancel>
            <AlertDialogAction
              onClick={eliminar}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
