# 🏪 Sell-Plus Central

Centro de control del sistema **Sell-Plus** (POS Electron para Windows):
publica versiones, entrega instaladores al auto-actualizador, recibe las
solicitudes del dueño de la tienda y guarda la bitácora de actividad y los
análisis del **Paladín** (guardián del sistema).

- **Software**: versión actual 3.3.3 "Ventas inteligentes"
- **Central**: Next.js 16 (App Router) + Prisma + Tailwind 4
- **Base de datos**: SQLite en desarrollo local · PostgreSQL en producción
- **Instaladores**: GitHub Releases (la Central los entrega por redirección)

---

## Estructura del repositorio

| Carpeta | Qué contiene |
| --- | --- |
| `src/app` | Interfaz de la Central y todas las APIs (`/api/updates/check`, `/api/solicitudes`, `/api/paladin`, …) |
| `src/components/central` | Pestañas de la interfaz: Inicio, Actualizaciones, Solicitudes, Aprende, Paladín… |
| `prisma` | Esquema de datos. `schema.prisma` = SQLite (local) · `schema.postgres.prisma` = PostgreSQL (Vercel) |
| `prisma/seed.mjs` + `prisma/datos-iniciales.json` | Carga idempotente de los datos reales al desplegar |
| `scripts/use-postgres-schema.js` | Cambia el esquema a PostgreSQL dentro del build de Vercel |
| `work/pos` | Código fuente del POS (Electron) y su auto-actualizador |
| `work/installer`, `work/installer-64.nsi` | Kit del instalador NSIS para Windows |
| `central-files/updates` | (local) instaladores de prueba — los reales viven en Releases |

## Desarrollo local

```bash
cp .env.example .env        # Windows: copy .env.example .env
npm install                 # o: bun install
npm run db:push             # crea db/custom.db con el esquema
node prisma/seed.mjs        # (opcional) carga los datos iniciales
npm run dev                 # http://localhost:3000
```

## Producción (Vercel + Neon + GitHub Releases)

La guía completa, paso a paso y con capturas de los clics, está en
**[DESPLEGAR-EN-VERCEL.md](./DESPLEGAR-EN-VERCEL.md)**. Resumen:

1. Publicar este repositorio en GitHub (público).
2. En Vercel: importar el repo + una variable `DATABASE_URL` (PostgreSQL de Neon).
3. El build crea las tablas y carga los datos solos (`vercel-build`).
4. Subir el instalador a **Releases** y pegar su URL en la pestaña Actualizaciones.

## Publicar una nueva versión del software

1. Se construye la mejora (aquí trabaja el equipo de desarrollo) y se genera
   `Sell-Plus-<versión>-Instalador-Windows-64bits.exe`.
2. En GitHub: **Releases → Draft a new release** → tag `v<versión>` → arrastrar
   el .exe → **Publish release**.
3. En la Central: pestaña **Actualizaciones** → **Usar URL de GitHub** → pegar
   el enlace del .exe. (También existe la API `POST /api/updates/registrar`
   con la cabecera `X-Central-Key`.)
4. El auto-actualizador de cada tienda detecta la versión nueva en ≤ 15 min,
   descarga, verifica el SHA-256 e instala en silencio conservando los datos.

## Notas técnicas

- **Contrato del auto-actualizador** (no romper):
  `GET /api/updates/check?version=X.Y.Z` → `{ hasUpdate, version, url,
  sha256, downloadUrl, notasVersion, … }`. La descarga sigue redirecciones.
- **Clave de administrador**: se envía en la cabecera `X-Central-Key`.
  Por defecto es `sellplus-admin-2026`; en producción conviene definir la
  variable `CENTRAL_ADMIN_KEY` con un valor privado.
- **Rutas heredadas**: algunas APIs (chat, tienda, conversations, client/*…)
  provienen de la plantilla original y ya no se usan; no afectan al sistema.
- El **código del POS** (`work/pos`) lee la URL de la Central del archivo
  `db/central-url.txt` dentro de su carpeta de instalación; si no existe,
  usa la URL de fábrica incluida en el código.
