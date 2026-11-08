/**
 * Semilla de Sell-Plus Central:
 * carga TODO el conocimiento del proyecto (historial, ficha técnica,
 * reglas de actualización, incidencias conocidas y versión base) en la base de datos.
 * Ejecutar:  bun run scripts/seed-sellplus.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const knowledge: {
  category: string;
  title: string;
  content: string;
  order: number;
}[] = [
  {
    category: "historia",
    title: "Recuperación del programa original (noviembre 2026)",
    order: 1,
    content:
      "El programa Sell-Plus se recuperó desde un chat anterior (https://chat.z.ai/s/281d6dbd-1b0e-447b-9fdc-1349c6a7e1df) usando el archivo original Sell-Plus-Programa.zip (194.264.472 bytes, SHA-256 ffd89e906ef570ec529455ecb7232f8cf22cfea9d1b5ebde2161f4ec252594d3). El programa se verificó funcionando en el sandbox: el servidor interno respondió HTTP 200, con 28 productos precargados y los usuarios Dueño y Maria operativos.",
  },
  {
    category: "historia",
    title: "Creación del instalador de Windows de 64 bits",
    order: 2,
    content:
      "Se construyó un instalador NSIS para Windows. Decisión clave: SOLO versión de 64 bits, porque la base de datos Prisma no soporta Windows de 32 bits (un instalador de 32 bits abriría pero no podría guardar datos). El instalador instala en C:\\Sell-Plus, crea accesos directos en el escritorio y el menú de inicio, registra el programa en la lista de desinstalación de Windows y desbloquea los archivos instalados.",
  },
  {
    category: "historia",
    title: "Fallo de arranque en la laptop y diagnóstico (v3.0 → v3.0.1)",
    order: 3,
    content:
      "El dueño instaló la primera versión (3.0) en su laptop Windows y el programa aparentaba abrir pero no terminaba de abrir; el script de diagnóstico .bat también iniciaba pero no generaba salida. Diagnóstico: los acentos del español en el .bat se corrompían con códigos de página incorrectos, y faltaba capturar los errores de arranque. Se corrigió en la versión 3.0.1: log interno sellplus-servidor.log, mensajes de error visibles en pantalla (dialog.showErrorBox) y diagnóstico .bat reescrito en ASCII puro con doble salida (pantalla + archivo).",
  },
  {
    category: "historia",
    title: "Éxito confirmado (06/11/2026)",
    order: 4,
    content:
      "El 06/11/2026 el dueño confirmó: 'UFF PERFECTO, CORRE EXCELENTE. YA POR FIN LO PUDE VER FUNCIONANDO. ES UN EXITO.' La versión Sell-Plus 3.0.1 quedó instalada y funcionando en la laptop del dueño. Desde entonces el proyecto entra en fase de actualizaciones acumulativas gestionadas desde Sell-Plus Central.",
  },
  {
    category: "tecnica",
    title: "Ficha técnica del programa",
    order: 5,
    content:
      "Programa: Sell-Plus 3.0.1 — Punto de Venta (POS). Tecnología: Electron 38.2.0 + Next.js (standalone) + Prisma/SQLite con servidor Node interno. SO objetivo: SOLO Windows 64 bits (nunca compilar versión de 32 bits: Prisma no la soporta). Instalación: C:\\Sell-Plus. Ejecutable: C:\\Sell-Plus\\Sell-Plus.exe. Base de datos: C:\\Sell-Plus\\resources\\app\\db\\custom.db (SQLite vía Prisma; el arrancador resources/app/main.js define DATABASE_URL apuntando a ese archivo). Datos iniciales: 28 productos precargados. Usuarios del sistema: Dueño PIN 1234, Maria PIN 1111.",
  },
  {
    category: "tecnica",
    title: "Rutas de monitoreo y respaldos",
    order: 6,
    content:
      "Registro del programa (log): C:\\Sell-Plus\\resources\\app\\db\\sellplus-servidor.log — escrito de forma síncrona (appendFileSync) por main.js; rota a .anterior al superar 512 KB; registra errores graves, cierres inesperados, promesas rechazadas y si se intenta abrir una segunda copia. Registro de instalación: C:\\Sell-Plus\\registro-instalacion.txt (fecha, hora, carpeta y versión del instalador). Respaldo de datos: %APPDATA%\\Sell-Plus-Respaldo-Datos (lo crea el desinstalador; el instalador lo usa para ofrecer recuperar datos de una instalación anterior). Diagnóstico: acceso directo 'Diagnostico Sell-Plus' en el escritorio.",
  },
  {
    category: "reglas",
    title: "Reglas de oro para actualizar sin desinstalar",
    order: 7,
    content:
      "1) NUNCA pedir desinstalar para actualizar: el instalador nuevo se ejecuta ENCIMA de la instalación actual. 2) El instalador nuevo apunta a la MISMA carpeta C:\\Sell-Plus. 3) PROHIBIDO borrar o sobrescribir C:\\Sell-Plus\\resources\\app\\db\\custom.db ni %APPDATA%\\Sell-Plus-Respaldo-Datos. 4) Antes de actualizar, cerrar Sell-Plus (el instalador ya hace taskkill de Sell-Plus.exe). 5) Cada actualización sube la versión (3.0.2, 3.1.0, ...) y actualiza registro-instalacion.txt. 6) Antes de entregar, probar completa la compilación (servidor responde, login abre, productos visibles). 7) Si se necesita el código fuente, está en Sell-Plus-Programa.zip.",
  },
  {
    category: "instalador",
    title: "Cómo se construye el instalador (NSIS)",
    order: 8,
    content:
      "Script NSIS: installer-64.nsi (versión 3.0.1.0, VIProductVersion). OutFile: Sell-Plus-3.0.1-Instalador-Windows-64bits.exe (112.257.527 bytes, SHA-256 6034ed529be8dc40af28051dfd2a1771a8836ee9cb2d2f96fded362d14bfc345). Mecanismo de preservación de datos al instalar encima: en .onInit, si existe $INSTDIR\\resources\\app\\db\\custom.db, la copia a $TEMP\\SellPlus-DB-Guarda; después de copiar los archivos nuevos la devuelve. Si no venía de reinstalación pero existe %APPDATA%\\Sell-Plus-Respaldo-Datos\\custom.db, ofrece recuperar esos datos. Antes de copiar ejecuta 'taskkill /IM Sell-Plus.exe /F'. Rechaza instalar dentro de Archivos de Programa (.onVerifyInstDir). Crea registro-instalacion.txt con fecha/hora. Los archivos entregados tienen huellas SHA-256 registradas: Diagnostico-Windows-SellPlus.bat (90db506acf0fb27f98f954cbb6b9c6c63620018e9fa5467291b4866c5c77d7be), LEEME-PRIMERO-Sell-Plus.txt (86fd974b18e837f7f176f27d18d916677fd7f45109ba5929b6c752ecb02fca11).",
  },
  {
    category: "vision",
    title: "Visión: Sell-Plus Central y actualizaciones automáticas",
    order: 9,
    content:
      "Sell-Plus Central (este sitio) es el centro de control del proyecto: (1) chat con IA que ya conoce todo el proceso de creación, (2) diagnóstico en tiempo real de los equipos con el programa instalado, (3) distribución automática de actualizaciones. Visión a futuro: el programa distribuido en muchos consumidores; cada equipo consulta el sitio (API /api/client/check y /api/client/heartbeat), y cuando hay una actualización publicada, el programa la descarga y la aplica SIN desinstalar, preservando la base de datos. La próxima actualización del programa debe integrar el módulo auto-actualizador (consulta periódica al sitio, descarga del paquete, aplicación conservando custom.db). Toda actualización es acumulativa: se instala encima de C:\\Sell-Plus sin tocar los datos.",
  },
];

const knownIssues = [
  {
    title: "El programa abre pero se cierra solo / no termina de abrir",
    symptoms:
      "En la laptop, Sell-Plus aparentaba abrirse pero no terminaba de abrir ('aparece como que se abre pero no se puede al final').",
    cause:
      "Primera causa descartable: Windows de 32 bits (Prisma no soporta 32 bits). Otras causas típicas: antivirus/SmartScreen bloqueando Electron, falta de runtimes de VC++, aceleración GPU.",
    solution:
      "Usar solo Windows 64 bits con el instalador 3.0.1 o superior. La 3.0.1 muestra el error en pantalla (dialog.showErrorBox) y lo escribe en sellplus-servidor.log. RESUELTA en la laptop del dueño (06/11/2026).",
    severity: "resuelta",
  },
  {
    title: "El diagnóstico .bat inicia pero no genera nada",
    symptoms: "La ventana del script se abre, pero no produce ningún archivo ni texto.",
    cause:
      "Caracteres con acentos del español se corrompían bajo un código de página incorrecto y el script fallaba en silencio; además carecía de 'pause' y de ruta de salida segura.",
    solution:
      "Versión 3.0.1: script reescrito en ASCII puro (sin acentos), doble salida (pantalla + archivo de informe), pausa final y ruta de salida en el escritorio del usuario. RESUELTA.",
    severity: "resuelta",
  },
  {
    title: "Antivirus o SmartScreen bloquea la primera apertura",
    symptoms: "Windows muestra 'Windows protegió tu PC' o el antivirus elimina/cuarentena Sell-Plus.exe.",
    cause: "Aplicación sin firma digital (firma de código pendiente de comprar).",
    solution:
      "Clic en 'Más información' → 'Ejecutar de todas formas'. A futuro: considerar firmar el instalador con certificado de código o distribuir por el canal propio de actualizaciones.",
    severity: "media",
  },
  {
    title: "Pérdida de datos al reinstalar o actualizar",
    symptoms: "Tras reinstalar, faltan ventas, productos o usuarios.",
    cause: "Borrar C:\\Sell-Plus completo (incluida resources\\app\\db\\custom.db) en vez de instalar encima.",
    solution:
      "Nunca desinstalar para actualizar: el instalador nuevo preserva la BD automáticamente ($TEMP\\SellPlus-DB-Guarda + %APPDATA%\\Sell-Plus-Respaldo-Datos). Por seguridad extra, copiar custom.db a otra carpeta antes de actualizar. PREVENIDA.",
    severity: "critica",
  },
];

async function main() {
  console.log("Sembrando Sell-Plus Central...");

  // Migrado al modelo real `Tutorial`. Solicitud #9.
  const existingKnowledge = await db.tutorial.count();
  if (existingKnowledge === 0) {
    for (const k of knowledge) {
      await db.tutorial.create({
        data: {
          titulo: k.title,
          descripcion: `Conocimiento del proyecto (${k.category})`,
          contenido: k.content,
          orden: k.order,
          tipo: "guia",
          publicado: false, // conocimiento interno para la IA, no visible en "Aprende"
        },
      });
    }
    console.log(`  Conocimiento: ${knowledge.length} entradas creadas.`);
  } else {
    console.log(`  Conocimiento: ya existen ${existingKnowledge} entradas, se omiten.`);
  }

  // Problemas conocidos: el modelo knownIssue se retiró del esquema; su
  // contenido esencial ya vive en las entradas de conocimiento (categorías
  // "reglas" e "historia"). Solicitud #9.
  void knownIssues;

  const existingUpdate = await db.version.findUnique({
    where: { version: "3.0.1" },
  });
  if (!existingUpdate) {
    await db.version.create({
      data: {
        version: "3.0.1",
        titulo: "Versión base con monitoreo integrado",
        activo: true,
        notas:
          "Versión funcionando y confirmada por el dueño el 06/11/2026.\n" +
          "- Registro de eventos interno (sellplus-servidor.log) con rotación automática.\n" +
          "- Mensajes de error visibles en pantalla si el arranque falla.\n" +
          "- Diagnóstico .bat corregido: ASCII puro, doble salida (pantalla + informe) y pausa final.\n" +
          "- Preservación automática de la base de datos al instalar encima (sin perder ventas ni productos).\n" +
          "- Registro de instalación (registro-instalacion.txt) con fecha, hora y versión.",
      },
    });
    console.log("  Actualización base 3.0.1 registrada como publicada.");
  } else {
    console.log("  Actualización base 3.0.1 ya existe, se omite.");
  }

  console.log("Semilla completada.");
}

main()
  .catch((e) => {
    console.error("Error en la semilla:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
