import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

export type AiMessage = { role: "user" | "assistant"; content: string };

/**
 * Prepara la configuración del servicio de IA cuando el sitio corre fuera del
 * entorno original (ej. despliegue en Vercel). Si se define la variable de
 * entorno ZAI_CONFIG_B64 (contenido del archivo .z-ai-config en base 64), se
 * escribe en una carpeta temporal y se apunta HOME ahí para que el SDK la
 * encuentre. Así NUNCA hace falta poner credenciales dentro del código o del
 * repositorio: solo en las variables de entorno del servidor.
 */
function prepararConfigIa() {
  const b64 = process.env.ZAI_CONFIG_B64;
  if (!b64) return;
  try {
    const dir = path.join(tmpdir(), "zai-config");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, ".z-ai-config");
    if (!existsSync(file)) {
      writeFileSync(file, Buffer.from(b64, "base64").toString("utf8"), { mode: 0o600 });
    }
    process.env.HOME = dir;
  } catch {
    // si falla, ZAI.create() usará su búsqueda normal
  }
}

/**
 * Construye el prompt de sistema de la IA del sitio.
 * La IA ya "nace" sabiendo TODO el proceso de creación de Sell-Plus
 * porque lee la base de conocimiento, los problemas conocidos y el
 * catálogo de actualizaciones directamente de la base de datos.
 */
export async function buildSellPlusSystemPrompt(): Promise<string> {
  // Migrado a los modelos reales del esquema (Tutorial, PaladinReporte, Version).
  // Solicitud #9.
  const [tutoriales, alertas, publicadas] = await Promise.all([
    db.tutorial.findMany({ orderBy: { orden: "asc" } }),
    db.paladinReporte.findMany({
      where: { estadoGlobal: { in: ["fallo", "alerta"] } },
      orderBy: { fecha: "desc" },
      take: 5,
    }),
    db.version.findMany({ orderBy: { fecha: "desc" }, take: 10 }),
  ]);

  const conocimiento = tutoriales
    .map((k) => `### ${k.titulo}\n${k.contenido || k.descripcion}`)
    .join("\n\n");

  const problemas = alertas
    .map((r) => `- [${r.estadoGlobal}] ${r.resumen}`)
    .join("\n");

  const versiones = publicadas
    .map((u) => `- v${u.version} [${u.activo ? "publicada" : "borrador"}]: ${u.titulo}`)
    .join("\n");

  return `Eres el ingeniero principal y asistente oficial del proyecto **Sell-Plus**, un programa de punto de venta (POS) para Windows, desde el sitio **Sell-Plus Central**. Respondes SIEMPRE en español, de forma clara, concreta y en tono de compañero de trabajo.

Tu memoria contiene TODO el proceso de creación del programa (recuperación, instalador, fallo de arranque, corrección 3.0.1 y éxito confirmado el 06/11/2026). NUNCA preguntes por el historial: ya lo conoces.

=== CONOCIMIENTO DEL PROYECTO ===
${conocimiento}

=== PROBLEMAS CONOCIDOS ===
${problemas}

=== VERSIONES DEL PROGRAMA ===
${versiones}

=== TU FORMA DE TRABAJAR ===
1. Cuando el dueño pida un cambio o reporte un problema, propón la solución como una ACTUALIZACIÓN ACUMULATIVA: se instala encima de C:\\Sell-Plus, sin desinstalar, y JAMÁS se toca la base de datos C:\\Sell-Plus\\resources\\app\\db\\custom.db ni el respaldo %APPDATA%\\Sell-Plus-Respaldo-Datos.
2. Cuando propongas una actualización, indica: número de versión sugerido (el siguiente a la última publicada), título, tipo (funcion, mejora, correccion o seguridad) y un changelog breve por viñetas. Recuerda que SOLO existen versiones de 64 bits.
3. Para el diagnóstico, la ruta clave del log es C:\\Sell-Plus\\resources\\app\\db\\sellplus-servidor.log y la del informe del diagnóstico .bat es el archivo de informe que genera el acceso directo "Diagnostico Sell-Plus" del escritorio.
4. Sé directo: si algo ya está resuelto, dilo y no lo repitas; si necesitas datos (log, versión, mensaje de error), pídelos en una sola frase.
5. Usa listas cortas y negritas para lo importante. Nada de discursos largos.
6. Este sitio tiene módulos de diagnóstico y de actualizaciones: cuando corresponda, recomienda al dueño usarlos (pestañas "Diagnóstico" y "Actualizaciones").`;
}

/** Llama al modelo de IA con los mensajes dados y devuelve el texto de respuesta. */
export async function callAi(messages: AiMessage[]): Promise<string> {
  let completion;
  try {
    prepararConfigIa();
    const zai = await ZAI.create();
    completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    if (/config|credential|api key|unauthor|401|403|\.z-ai/i.test(detalle)) {
      throw new Error(
        "La IA del sitio no está configurada en este servidor. Mientras tanto, pide tus cambios por el chat directo con el equipo de Sell-Plus. (Si tienes la configuración del servicio de IA, agrégala en la variable de entorno ZAI_CONFIG_B64.)"
      );
    }
    throw err;
  }
  const content = completion.choices[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("La IA devolvió una respuesta vacía");
  return content;
}

/** Extrae el primer objeto JSON válido de un texto (tolerante a fences de markdown). */
export function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Compara versiones tipo "3.0.1". Devuelve >0 si a > b, 0 si iguales, <0 si a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
