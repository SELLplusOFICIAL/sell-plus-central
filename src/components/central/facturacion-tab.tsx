"use client";

/**
 * CipherPoint 7.0.9 «Cifra Fiscal» — pestaña Facturación de la Central.
 * (Solo administrador) Configura el PAC, carga el CSD del emisor,
 * ve las tiendas conectadas y la cola de facturación, y procesa.
 */

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Cog,
  FileDown,
  FileText,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function llaveAdmin(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("central-admin-key") ?? "";
}

type Tienda = { rfc: string; nombre: string; clave: string; creada: string; ultima: string };
type FilaCola = {
  id: string; idLocal: string; tienda: string; serie: string; folio: number;
  rfcReceptor: string; nombreReceptor: string; total: number; estado: string;
  uuid: string | null; fechaTimbrado: string | null; error: string | null;
  simulado: boolean; intentos: number; creada: string;
};
type ResumenAdmin = {
  ok: boolean;
  pac: { modo: string; url: string; tokenConfigurado: boolean };
  csd: { cargado: boolean; noCertificado: string; tieneContrasena: boolean };
  tiendas: Tienda[];
  cola: FilaCola[];
};

const ESTADO_BADGE: Record<string, { txt: string; cls: string }> = {
  pendiente: { txt: "Pendiente", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  timbrada: { txt: "Timbrada", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  error: { txt: "Error", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
};

export default function FacturacionTab() {
  const [data, setData] = useState<ResumenAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modoPac, setModoPac] = useState("ninguno");
  const [urlPac, setUrlPac] = useState("");
  const [tokenPac, setTokenPac] = useState("");
  const [cerB64, setCerB64] = useState("");
  const [keyB64, setKeyB64] = useState("");
  const [passCsd, setPassCsd] = useState("");
  const [nombreCer, setNombreCer] = useState("");
  const [nombreKey, setNombreKey] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/sp/facturas/admin", {
        cache: "no-store",
        headers: { "x-central-key": llaveAdmin() },
      });
      if (r.status === 401) { toast.error("Llave de administrador no válida"); return }
      const j = (await r.json()) as ResumenAdmin;
      setData(j);
      setModoPac(j.pac?.modo || "ninguno");
      setUrlPac(j.pac?.url || "");
    } catch {
      toast.error("No se pudo consultar la facturación");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar() }, [cargar]);

  const accion = async (cuerpo: Record<string, unknown>, okMsg: string) => {
    setOcupado(true);
    try {
      const r = await fetch("/api/sp/facturas/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-central-key": llaveAdmin() },
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json();
      if (j.ok === false) { toast.error(j.mensaje || j.error || "No se pudo completar"); return false }
      toast.success(okMsg);
      await cargar();
      return true;
    } catch {
      toast.error("Error de conexión con la Central");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const leeArchivo = async (file: File, setB64: (v: string) => void, setNombre: (v: string) => void) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    setB64(btoa(bin));
    setNombre(file.name);
  };

  const verXml = async (id: string) => {
    try {
      // El XML timbrado se consulta por la ruta del puente con la clave de la tienda
      const tienda = data?.tiendas.find((t) => id.startsWith(t.clave + "::"));
      if (!tienda) { toast.error("No encontré la tienda de esa factura"); return }
      const r = await fetch("/api/sp/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tienda-clave": tienda.clave },
        body: JSON.stringify({ accion: "estado", idLocal: id.split("::")[1] || id }),
      });
      const j = await r.json();
      if (j.ok && j.xml) {
        const blob = new Blob([j.xml as string], { type: "application/xml" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "CFDI-" + (j.uuid || idLocal(id)) + ".xml";
        a.click();
        URL.revokeObjectURL(a.href);
      } else toast.error(j.mensaje || "Todavía no hay XML para esa factura");
    } catch { toast.error("No se pudo descargar el XML") }
  };

  const idLocal = (id: string) => id.split("::")[1] || id;

  return (
    <div className="space-y-4">
      {/* Estado del puente */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-emerald-400" aria-hidden />
                Facturación CFDI 4.0 — puente fiscal
              </CardTitle>
              <CardDescription>
                La PC del dueño manda las ventas a facturar; la Central arma y sella el CFDI con el CSD y lo timbra con el PAC.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
              <RefreshCw className={"h-4 w-4" + (cargando ? " animate-spin" : "")} aria-hidden />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] p-3">
            <div className="text-xs text-slate-400">PAC</div>
            <div className="font-semibold">
              {data?.pac?.modo === "simulado" ? "Simulado (pruebas)" : data?.pac?.modo === "rest" ? "REST real" : "Sin configurar"}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] p-3">
            <div className="text-xs text-slate-400">CSD del emisor</div>
            <div className="font-semibold">
              {data?.csd?.cargado ? "Cargado · No. " + data.csd.noCertificado : "No cargado"}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] p-3">
            <div className="text-xs text-slate-400">Cola</div>
            <div className="font-semibold">{data?.cola?.length ?? 0} factura(s)</div>
          </div>
        </CardContent>
      </Card>

      {cargando && !data ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <>
          {/* Configuración del PAC */}
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cog className="h-4 w-4 text-slate-300" aria-hidden />
                PAC de timbrado
              </CardTitle>
              <CardDescription>
                «Simulado» timbra de PRUEBA (marcado SIMULADO, no válido ante el SAT) para que veas el flujo completo. Cuando contrates tu PAC, elige «REST real»: manda el XML sellado a la URL de tu PAC con tu token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "ninguno", t: "Ninguno" },
                  { v: "simulado", t: "Simulado (pruebas)" },
                  { v: "rest", t: "REST real" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setModoPac(o.v)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                      (modoPac === o.v
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]")
                    }
                  >
                    {o.t}
                  </button>
                ))}
              </div>
              {modoPac === "rest" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-url">URL del PAC</Label>
                    <Input id="pac-url" value={urlPac} onChange={(e) => setUrlPac(e.target.value)} placeholder="https://pac.ejemplo.mx/api/timbrar" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-token">Token del PAC</Label>
                    <Input id="pac-token" type="password" value={tokenPac} onChange={(e) => setTokenPac(e.target.value)} placeholder={data?.pac?.tokenConfigurado ? "Ya configurado — escribe uno nuevo para cambiarlo" : "Token o contraseña"} />
                  </div>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => accion({ accion: "config-pac", modo: modoPac, url: urlPac, ...(tokenPac ? { token: tokenPac } : {}) }, "PAC actualizado")}
                disabled={ocupado}
              >
                Guardar PAC
              </Button>
              {modoPac === "rest" && !tokenPac && (
                <p className="text-xs text-slate-400">El token actual no se muestra por seguridad; escríbelo solo si quieres cambiarlo.</p>
              )}
            </CardContent>
          </Card>

          {/* CSD */}
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
                CSD del emisor (certificado de sello digital)
              </CardTitle>
              <CardDescription>
                Los archivos .cer y .key de tu RFC con su contraseña. La llave privada se guarda CIFRADA (AES-256) en la Central y jamás se muestra de nuevo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.csd?.cargado ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600">Cargado</Badge>
                  <span className="text-sm text-slate-300">No. certificado: {data.csd.noCertificado}</span>
                  <Button variant="outline" size="sm" onClick={() => accion({ accion: "quitar-csd" }, "CSD retirado")} disabled={ocupado}>
                    <Ban className="h-4 w-4" aria-hidden /> Quitar
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="csd-cer">Archivo .cer</Label>
                    <Input id="csd-cer" type="file" accept=".cer,application/pkix-cert" onChange={(e) => { const f = e.target.files?.[0]; if (f) leeArchivo(f, setCerB64, setNombreCer) }} />
                    {nombreCer && <p className="text-xs text-slate-400">{nombreCer}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="csd-key">Archivo .key</Label>
                    <Input id="csd-key" type="file" accept=".key" onChange={(e) => { const f = e.target.files?.[0]; if (f) leeArchivo(f, setKeyB64, setNombreKey) }} />
                    {nombreKey && <p className="text-xs text-slate-400">{nombreKey}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="csd-pass">Contraseña de la .key</Label>
                    <Input id="csd-pass" type="password" value={passCsd} onChange={(e) => setPassCsd(e.target.value)} />
                  </div>
                  <div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!cerB64 || !keyB64 || !passCsd) { toast.error("Carga el .cer, la .key y su contraseña"); return }
                        const okR = await accion({ accion: "csd", cerB64, keyB64, contrasena: passCsd }, "CSD cargado y cifrado");
                        if (okR) { setCerB64(""); setKeyB64(""); setPassCsd(""); setNombreCer(""); setNombreKey("") }
                      }}
                      disabled={ocupado}
                    >
                      <BadgeCheck className="h-4 w-4" aria-hidden /> Cargar CSD
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tiendas */}
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4 text-slate-300" aria-hidden />
                Tiendas conectadas
              </CardTitle>
              <CardDescription>Las PCs que conectaron su facturación con la Central.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.tiendas || []).length === 0 && <p className="text-sm text-slate-400">Todavía no hay tiendas conectadas.</p>}
              {(data?.tiendas || []).map((t) => (
                <div key={t.rfc} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] p-3">
                  <div>
                    <div className="font-semibold text-slate-100">{t.rfc}</div>
                    <div className="text-xs text-slate-400">{t.nombre || "—"} · última conexión {new Date(t.ultima).toLocaleString()}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => accion({ accion: "rotar-clave", rfc: t.rfc }, "Clave nueva generada — reconecta la PC")} disabled={ocupado}>
                    Rotar clave
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cola */}
          <Card className="border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileDown className="h-4 w-4 text-slate-300" aria-hidden />
                    Cola de facturación
                  </CardTitle>
                  <CardDescription>Últimas 200 solicitudes de timbrado recibidas.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accion({ accion: "procesar" }, "Cola procesada")} disabled={ocupado}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> Procesar cola
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { if (window.confirm("¿Vaciar TODA la cola de facturación?")) accion({ accion: "limpiar" }, "Cola vaciada") }} disabled={ocupado}>
                    Vaciar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.cola || []).length === 0 && <p className="text-sm text-slate-400">La cola está vacía.</p>}
              {(data?.cola || []).map((f) => {
                const b = ESTADO_BADGE[f.estado] || { txt: f.estado, cls: "bg-slate-500/15 text-slate-400" };
                return (
                  <div key={f.id} className="rounded-lg border border-white/[0.06] p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={b.cls}>{b.txt}</Badge>
                        <span className="font-semibold text-slate-100">{f.serie}-{f.folio}</span>
                        <span className="text-slate-300">{f.nombreReceptor || f.rfcReceptor}</span>
                        <span className="text-slate-400">· ${f.total.toFixed(2)} MXN</span>
                        {f.simulado && <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-600">SIMULADO</Badge>}
                      </div>
                      <div className="flex gap-2">
                        {f.estado === "timbrada" && (
                          <Button variant="outline" size="sm" onClick={() => verXml(f.id)}>Descargar XML</Button>
                        )}
                        {f.estado === "error" && (
                          <Button variant="outline" size="sm" onClick={() => accion({ accion: "reintentar", id: f.id }, "Reagendada")} disabled={ocupado}>
                            Reintentar
                          </Button>
                        )}
                      </div>
                    </div>
                    {f.error && <p className="mt-1.5 text-xs text-red-400">{f.error}</p>}
                    {f.uuid && <p className="mt-1.5 text-xs text-slate-400">UUID: {f.uuid} · {f.fechaTimbrado}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
