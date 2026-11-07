# 🚀 Desplegar Sell-Plus Central en Vercel

Esta guía convierte tu **Sell-Plus Central** en un sitio permanente en internet,
gratis, con la cuenta de Vercel. Al terminar tendrás una dirección fija tipo:

```
https://sell-plus-central.vercel.app
```

que el Auto-Actualizador de tu programa usará para siempre.

---

## Qué hace este despliegue automáticamente

Al importar el proyecto, Vercel ejecuta el script **`vercel-build`**, que en un solo paso:

1. Cambia el esquema de Prisma a **PostgreSQL** (`scripts/use-postgres-schema.js`).
2. Genera el cliente de Prisma.
3. Crea todas las tablas (`prisma db push`).
4. Carga tus datos actuales: versiones 3.0.1 y 3.1.0, el tutorial "Manual del dueño",
   la base de conocimiento, los problemas conocidos, tus equipos conectados y el chat
   (`prisma/seed.mjs`, idempotente: puede repetirse sin duplicar nada).
5. Compila el sitio (`next build`).

Solo necesitas darle a Vercel una cosa: la **cadena de conexión de la base de datos**.

---

## Paso 1 · Crear tu cuenta de GitHub (gratis)

1. Entra a **https://github.com** y pulsa **Sign up**.
2. Pon tu correo, una contraseña y un nombre de usuario.
   - Sugerencia de usuario: algo simple, ej. `tu-nombre-tienda` (aparecerá en las URLs).
3. Verifica tu correo electrónico (te llega un mensaje con un botón **Verify**).

> GitHub guardará el **código** del sitio y los **instaladores** (Releases).
> El instalador se descargará desde GitHub sin que nadie necesite contraseña:
> por eso el repositorio se crea **Público** (el código no contiene secretos;
> las contraseñas viven en las variables de entorno de Vercel).

## Paso 2 · Crear el repositorio

1. Ya dentro de GitHub, pulsa el **+** (arriba a la derecha) → **New repository**.
2. Nombre del repositorio: `sell-plus-central`
3. Visibilidad: **Public** ✅ (imprescindible para las descargas de instaladores).
4. NO marques ninguna casilla de "Add a README" ni ".gitignore" (lo dejamos vacío).
5. Pulsa **Create repository**.

## Paso 3 · Subir los archivos del proyecto

En la página del repositorio recién creado, pulsa el enlace **"uploading an existing file"**
(o el botón **Uploads**). Arrastra en **dos tandas**:

**Tanda A — las 5 carpetas** (arrastra las carpetas completas):

```
src/   prisma/   public/   scripts/   central-files/
```

**Tanda B — los archivos sueltos** de la raíz del proyecto:

```
package.json   package-lock.json   next.config.ts   tsconfig.json
postcss.config.mjs   tailwind.config.ts   components.json   eslint.config.mjs
next-env.d.ts   .gitignore   .env.example   README.md   DESPLEGAR-EN-VERCEL.md
```

> ⚠️ **No subas nunca**: la carpeta `db/`, el archivo `.env`, ni ningún `.exe`
> (los instaladores grandes van por "Releases" en el Paso 5).
> El ZIP que te entregamos ya viene limpio, simplemente no añadas nada extra.

Abajo, pulsa **Commit changes** (mensaje opcional: `Central inicial`).

## Paso 4 · Crear la base de datos PostgreSQL (gratis)

1. Entra a **https://vercel.com** y regístrate con **Continue with GitHub**
   (usa la cuenta que acabas de crear; así Vercel ve tu repositorio).
2. En el panel de Vercel: pestaña **Storage** → **Create Database** → **Neon Postgres**.
3. Nombre: `sell-plus-central-db` → región la más cercana (ej. Washington D.C.) → **Create**.
4. Abre la base creada y busca el recuadro **`.env.local` tab / Connection string**:
   - Copia la cadena **"Direct connection"** (la que **NO** contiene `-pooler`).
   - Se ve así: `postgresql://usuario:contraseña@ep-xxxx...neon.tech/neondb?sslmode=require`

> Esa cadena es la **contraseña de tu base de datos**: no la publiques en el
> repositorio, solo va en la configuración de Vercel (siguiente paso).

## Paso 5 · Importar el proyecto en Vercel

1. En Vercel: **Add New… → Project** → en "Import Git Repository" aparece
   `sell-plus-central` → pulsa **Import**.
2. En **Environment Variables** (antes de pulsar Deploy):
   - Name: `DATABASE_URL`
   - Value: *pega la cadena que copiaste en el Paso 4*
3. Pulsa **Deploy** y espera 2-4 minutos (crea tablas y carga tus datos).

Al terminar verás **🎉 Congratulations** con la dirección fija de tu Central.
Puedes cambiarla (ej. `mi-central.vercel.app`) en *Settings → Domains*, solo
con nombres que estén libres.

## Paso 6 · Conectar los instaladores grandes (GitHub Releases)

Los instaladores pesan ~84 MB: se guardan en **Releases** de tu repositorio
y el sitio los entrega con redirección (más rápido y sin límites de espacio).

1. En tu repositorio de GitHub: **Releases → Draft a new release**.
2. Tag: `v3.1.0` (título: `Sell-Plus 3.1.0`).
3. Arrastra el archivo `Sell-Plus-3.1.0-Instalador-Windows-64bits.exe` → **Publish release**.
4. En la página del release, clic derecho sobre el nombre del .exe → **Copiar enlace**
   (empieza por `https://github.com/.../releases/download/...`).
5. En tu Central: pestaña **Actualizaciones** → tarjeta de v3.1.0 →
   **Usar URL de GitHub** → pega el enlace → **Guardar URL**.
   Aparecerá la etiqueta azul **GitHub** y el auto-actualizador lo descargará desde ahí.

> Para cada versión futura repites lo mismo: subes el .exe a un release nuevo
> y pegas su URL (o dejas el archivo adjunto pequeño en el sitio).

## Paso 7 · Configurar tu PC (acceso directo + programa)

Con la URL de Vercel (ej. `https://sell-plus-central.vercel.app`):

1. Abre el **Kit de Acceso Directo** (`Kit-Acceso-Central.zip`) y ejecuta
   `Configurar-Central.bat`.
2. Escribe la URL de Vercel y presiona ENTER. El kit:
   - Crea el acceso directo **"Sell-Plus Central"** en tu escritorio (con icono propio).
   - Actualiza `C:\Sell-Plus\resources\app\db\central-url.txt` para que el
     Auto-Actualizador consulte tu nueva Central permanente.

Listo: tu Central ya es permanente y tu programa apunta a ella.

---

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| **Deploy falla con error de base de datos** | La `DATABASE_URL` está mal escrita o es la versión "pooled" (`-pooler`). Usa la cadena *Direct connection* completa, con `?sslmode=require`. |
| **La web carga pero sin versiones ni tutorial** | El build no pudo cargar los datos: revisa en *Deployments → Runtime Logs* el paso `[seed]`. Repara la variable y haz **Redeploy**. |
| **La descarga del instalador da error** | Falta pegar la URL del release (Paso 6) o el enlace copiado no es el del archivo `.exe`. |
| **GitHub no me deja arrastrar todo** | Sube en tandas más pequeñas (el navegador admite ~100 archivos por vez). |
| **El asistente de IA responde que no está configurado** | Es normal si no se definió `ZAI_CONFIG_B64`. El resto del sitio funciona completo; pide los cambios por el chat directo. |

## Actualizaciones futuras del sitio

Cuando el equipo de Sell-Plus te entregue una nueva versión del código:
reemplaza los archivos cambiados en GitHub (o sube los nuevos) → Vercel
redespliega solo → la base de datos **no se toca** (el seed es idempotente).
