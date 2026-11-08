"use client";

import { Badge } from "@/components/ui/badge";
import type { ClientMachine } from "@prisma/client";

// ---------- Tipos de las respuestas de la API ----------

export interface Stats {
  clients: number;
  activeClients: number;
  machines: ClientMachine[];
  updates: number;
  reports: number;
  pendingReports: number;
  conversations: number;
  knowledgeEntries: number;
  latestPublished: { version: string; title: string; publishedAt: string } | null;
  // Pulso del actualizador heredado (cajas que aún no reportan identidad)
  ultimaRevisionAnonima: { detalle: string; fecha: string } | null;
  chequeosAnonimos24h: number;
}

/** Equipo de la flota con los datos calculados por /api/equipos */
export type EquipoFlota = ClientMachine & {
  ultimaVersion: string | null;
  necesitaActualizacion: boolean;
  estadoOrden: "sin_orden" | "enviada" | "entregada";
};

export interface FlotaRespuesta {
  equipos: EquipoFlota[];
  ultimaVersion: string | null;
  resumen: { total: number; alDia: number; desactualizados: number; conOrden: number };
}

/** Comparador numérico de versiones para el navegador: "3.10.0" > "3.9.0" */
export function cmpVersiones(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const pa = String(a || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export interface SoftwareUpdateDto {
  id: string;
  version: string;
  title: string;
  type: string;
  changelog: string;
  status: string;
  fileName: string | null;
  fileSize: number | null;
  fileSha256: string | null;
  externalUrl: string | null;
  downloads: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface DiagnosticReportDto {
  id: string;
  source: string;
  machineId: string | null;
  programVersion: string | null;
  logContent: string;
  severity: string | null;
  summary: string | null;
  cause: string | null;
  recommendation: string | null;
  updateNeeded: boolean | null;
  status: string;
  createdAt: string;
  analyzedAt: string | null;
}

export interface ConversationDto {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface KnowledgeEntryDto {
  id: string;
  category: string;
  title: string;
  content: string;
}

export interface KnownIssueDto {
  id: string;
  title: string;
  symptoms: string;
  cause: string;
  solution: string;
  severity: string;
}

// ---------- Helpers ----------

export const CATEGORY_LABELS: Record<string, string> = {
  historia: "Historia del proyecto",
  tecnica: "Ficha técnica",
  reglas: "Reglas de actualización",
  credenciales: "Accesos del programa",
  archivos: "Archivos entregados",
  instalador: "Instalador",
  vision: "Visión del proyecto",
};

export const TYPE_LABELS: Record<string, string> = {
  base: "Versión base",
  funcion: "Nueva función",
  mejora: "Mejora",
  correccion: "Corrección",
  seguridad: "Seguridad",
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "hace unos segundos";
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} día${d === 1 ? "" : "s"}`;
  } catch {
    return "—";
  }
}

export function SeverityBadge({ severity }: { severity: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    critica: { label: "Crítica", className: "bg-red-100 text-red-800 border-red-200" },
    alta: { label: "Alta", className: "bg-orange-100 text-orange-800 border-orange-200" },
    media: { label: "Media", className: "bg-amber-100 text-amber-800 border-amber-200" },
    baja: { label: "Baja", className: "bg-stone-100 text-stone-700 border-stone-200" },
    ok: { label: "Todo bien", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    resuelta: { label: "Resuelta", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const s = severity ? map[severity] ?? map.media : null;
  if (!s) return <Badge variant="outline">Sin analizar</Badge>;
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    nuevo: { label: "Nuevo", className: "bg-amber-100 text-amber-800 border-amber-200" },
    analizado: { label: "Analizado", className: "bg-teal-100 text-teal-800 border-teal-200" },
    resuelto: { label: "Resuelto", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    borrador: { label: "Borrador", className: "bg-stone-100 text-stone-700 border-stone-200" },
    publicada: { label: "Publicada", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
