# Sell-Plus Central

Centro de control del programa **Sell-Plus** (punto de venta para Windows).
Desde este sitio el dueño dirige todo: recibe las tiendas conectadas, publica
actualizaciones que el programa se instala solo, envía manuales en "Aprende",
analiza diagnósticos y conversa con el asistente del proyecto.

## Módulos

- **Panel** — tiendas conectadas (latido cada 15 min), resumen general.
- **Actualizaciones** — catálogo de versiones; publica instaladores adjuntos
  o servidos desde GitHub Releases (redirección automática para el
  Auto-Actualizador integrado del programa desde la v3.1.0).
- **Aprende** — manuales y tutoriales (PDF) para el dueño y el personal.
- **Diagnóstico** — análisis de reportes de las tiendas.
- **Chat** — asistente del proyecto con memoria de todo el proceso.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · shadcn/ui · Prisma
(SQLite en desarrollo local, PostgreSQL/Neon en Vercel).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Desarrollo en `http://localhost:3000` |
| `npm run vercel-build` | Build de Vercel: esquema Postgres + tablas + datos iniciales + compilación |
| `npm run build` | Build standalone para servidor propio |
| `npm run db:push` | Aplica `prisma/schema.prisma` a la base local (SQLite) |

## Estructura clave

```
src/app/api/updates/           → catálogo y edición de actualizaciones
src/app/api/client/            → puertas del Auto-Actualizador (check/download/heartbeat)
src/app/api/tutoriales/        → sección Aprende (listado y archivos)
central-files/                 → archivos servidos (tutoriales; updates solo en servidor propio)
prisma/seed.mjs                → carga idempotente de datos iniciales
prisma/schema.postgres.prisma  → variante PostgreSQL usada por vercel-build
DESPLEGAR-EN-VERCEL.md         → guía paso a paso del despliegue
```

## Reglas de oro

1. La base de datos de las tiendas (`C:\Sell-Plus\resources\app\db\custom.db`)
   **jamás** se toca: las actualizaciones se instalan encima, preservándola.
2. Las credenciales viven solo en variables de entorno (`DATABASE_URL`,
   opcionalmente `ZAI_CONFIG_B64`); nunca en el código ni en el repositorio.
3. Las versiones del programa son acumulativas y solo de 64 bits.
