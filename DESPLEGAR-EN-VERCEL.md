# 🚀 Desplegar Sell-Plus Central — sitio permanente (GitHub + Vercel)

Esta guía convierte tu **Sell-Plus Central** en un sitio fijo en internet,
gratis, que ya no depende del entorno de desarrollo. Al terminar tendrás una
dirección fija tipo:

```
https://sell-plus-central.vercel.app
```

que tu programa Sell-Plus usará **para siempre**, con las 6 versiones, los
tutoriales, las solicitudes y el historial ya cargados.

**Tiempo total: 30–40 minutos**, la mayoría esperando instalaciones.

---

## Lo que vas a montar

| Pieza | Servicio | Precio | Para qué |
| --- | --- | --- | --- |
| Código | GitHub | Gratis | Guarda el proyecto para siempre (historial incluido) |
| Sitio + APIs | Vercel | Gratis | Sirve la Central en tu dirección fija |
| Base de datos | Neon (dentro de Vercel) | Gratis | PostgreSQL con tus versiones, solicitudes y actividad |
| Instaladores .exe | GitHub Releases | Gratis | Hasta 2 GB por archivo, descarga directa |

Todo lo hace el propio build de Vercel: **crea las tablas y carga tus datos
automáticamente**. Solo tienes que crear cuentas, arrastrar y copiar/pegar.

---

## Paso 0 · Prepara tu PC (10 min)

1. **Instala GitHub Desktop** (la forma fácil de subir el proyecto):
   entra a `https://desktop.github.com` → **Download** → instala y ábrelo.
2. Inicia sesión con tu cuenta de GitHub (o crea la cuenta ahí mismo:
   te pide correo, contraseña y nombre de usuario — **verifica el correo**
   cuando llegue el mensaje de GitHub).
3. Descarga el paquete **`sell-plus-central-github.zip`** que te entregó el
   equipo y descomprímelo en una carpeta sencilla, por ejemplo
   `C:\sell-plus-central`.
4. (Solo si quieres conservar los instaladores históricos en Releases)
   descarga de la Central actual el instalador más reciente:
   `https://preview-chat-84403353-6e78-4cf3-8a17-b0d05bfe9666.space-z.ai/api/updates/download/3.3.3`
   y guárdalo en `Descargas` — lo usarás en el Paso 6.

> El ZIP ya viene con su historial git hecho y con el `.gitignore` correcto:
> no sube la base de datos local, ni el `.env`, ni los .exe.

## Paso 1 · Publica el repositorio en GitHub (5 min)

1. En GitHub Desktop: **File → Add local repository…** → elige la carpeta
   `C:\sell-plus-central` → **Add repository**.
   (Si avisa que no es un repositorio git, es que descomprimiste otra
   carpeta interior; elige la que contiene `package.json`.)
2. Pulsa el botón **Publish repository** (arriba).
3. Nombre: `sell-plus-central` · Descripción: la que quieras.
4. ⚠️ **Deja DESMARCADA la casilla "Keep this code private"**
   (el repositorio debe ser **público** para que las descargas de
   instaladores funcionen sin contraseña; el código no contiene secretos:
   las contraseñas viven en Vercel).
5. **Publish**. Ya tienes tu código en `github.com/tu-usuario/sell-plus-central`.

## Paso 2 · Crea la cuenta de Vercel (2 min)

1. Entra a `https://vercel.com` → **Sign Up** → **Continue with GitHub**
   → autoriza. Así Vercel ve tu repositorio sin configurar nada más.

## Paso 3 · Crea la base de datos (3 min)

1. En el panel de Vercel: pestaña **Storage** → **Create Database** →
   elige **Neon Postgres**.
2. Nombre: `sell-plus-central-db` → región: la más cercana a tu país
   (por ejemplo Washington D.C.) → **Create**.
3. Abre la base creada y busca el recuadro **`.env.local` tab / Connection
   string**. Copia la cadena **"Direct connection"** (la que **NO** dice
   `-pooler`). Se ve así:
   `postgresql://usuario:contraseña@ep-xxxx…neon.tech/neondb?sslmode=require`

> Esa cadena es la contraseña de tu base: **no la publiques** ni la mandes
> por chat. Solo va en el paso siguiente.

## Paso 4 · Despliega la Central (5–10 min)

1. En Vercel: **Add New… → Project** → aparece `sell-plus-central` → **Import**.
2. Antes de pulsar Deploy, en **Environment Variables** añade:
   - Name: `DATABASE_URL` — Value: *la cadena que copiaste en el Paso 3*
   - (Recomendado) Name: `CENTRAL_ADMIN_KEY` — Value: una clave privada tuya,
     ej. `sellplus-2026-clave-secreta`. Es la que usarás para acciones de
     administrador en lugar de la histórica.
3. **Deploy** y espera. El build hace todo solo:
   cambia el esquema a PostgreSQL → crea las tablas → **carga tus 6
   versiones, tutoriales, solicitudes, Paladín y actividad** → compila.
4. Al final verás 🎉 **Congratulations** con tu dirección fija.
   Puedes cambiarla (ej. `mi-central.vercel.app`) en *Settings → Domains*.

**Verifica** (ábrelo en el navegador):
- `https://tu-central.vercel.app/api/health` → debe responder
  `{"ok":true,...,"ultimaVersion":"3.3.3"}`
- La portada debe mostrar la versión 3.3.3 y el resumen del Paladín.

## Paso 5 · Sube el instalador a GitHub Releases (5 min)

Los .exe pesan ~125 MB y no van en el repositorio: viven en **Releases**.

1. En tu repositorio de GitHub: pestaña **Releases** → **Draft a new release**.
2. **Tag**: escribe `v3.3.3` (con la "v") → elige "New tag".
3. Título: `Sell-Plus 3.3.3 — Ventas inteligentes`.
4. Arrastra el archivo `Sell-Plus-3.3.3-Instalador-Windows-64bits.exe`
   (el del Paso 0) → **Publish release**.
5. En la página del release, clic derecho sobre el nombre del .exe →
   **Copiar enlace** (empieza por
   `https://github.com/tu-usuario/sell-plus-central/releases/download/…`).

## Paso 6 · Conecta el instalador con la Central (2 min)

1. Abre tu Central → pestaña **Actualizaciones** → tarjeta de la v3.3.3 →
   **Usar URL de GitHub** → pega el enlace → **Guardar URL**.
   Aparecerá la etiqueta azul **GitHub**.
2. Prueba la descarga completa: en el navegador abre
   `https://tu-central.vercel.app/api/updates/download/3.3.3`
   → debe llevarte a GitHub y bajar el .exe.

> Cada versión futura repite el Paso 5 con su tag (`v3.4.0`, …) y su URL.

## Paso 7 · Apunta tu programa a la Central permanente (2 min)

1. Abre el Bloc de notas **como administrador**.
2. Archivo → Abrir → pega esta ruta:
   `C:\Sell-Plus\resources\app\db\central-url.txt`
   (si la carpeta `db` no existe, créala dentro de `C:\Sell-Plus\resources\app`).
3. Borra lo que tenga y escribe **solo** tu URL nueva:
   `https://tu-central.vercel.app`
4. Guarda y **reinicia Sell-Plus**. En ≤ 15 min aparecerá en la pestaña
   Actividad de tu nueva Central como "latido".
5. Actualiza tu acceso directo del escritorio: abre la URL nueva en el
   navegador → menú ⋮ → *Guardar y compartir → Crear acceso directo*.

---

## A partir de ahora: cómo seguir mejorando el software

**Mejoras de la Central (el sitio):** el equipo edita el código → tú haces
`git push` (o GitHub Desktop → *Fetch origin* / *Push origin*) → Vercel
redespliega solo en 1–2 minutos. La base de datos **no se toca**.

**Nuevas versiones del POS:** se genera el instalador → se sube a Releases
con su tag → se pega su URL en la pestaña Actualizaciones → cada tienda lo
recibe sola en ≤ 15 min, verificando el SHA-256.

**Publicar sin abrir la web (opcional, para el equipo):**
```bash
curl -X POST https://tu-central.vercel.app/api/updates/registrar \
  -H "Content-Type: application/json" \
  -H "X-Central-Key: TU_CLAVE_PRIVADA" \
  -d '{"version":"3.4.0","titulo":"…","notas":"…",
       "fileName":"Sell-Plus-3.4.0-Instalador-Windows-64bits.exe",
       "sha256":"…","fileSize":…,
       "externalUrl":"https://github.com/tu-usuario/sell-plus-central/releases/download/v3.4.0/Sell-Plus-3.4.0-Instalador-Windows-64bits.exe"}'
```

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| Deploy falla con error de base de datos | La `DATABASE_URL` está mal copiada o es la versión `-pooler`. Usa la **Direct connection** completa, con `?sslmode=require`. |
| La web abre pero sin versiones | Revisa en *Deployments → Runtime Logs* el paso `[seed]`; corrige la variable y haz **Redeploy**. |
| La descarga del instalador da 404 | Falta el Paso 6 (pegar la URL del release) o el tag no se llama `v3.3.3`. |
| El POS no aparece en Actividad | Revisa que `central-url.txt` tenga **solo** la URL y que reiniciaste Sell-Plus; espera 15 min. |
| "Usar URL de GitHub" rechaza el enlace | El enlace debe empezar por `https://github.com/…` y terminar en `.exe`. |
| GitHub no me deja subir el .exe | Comprueba que el archivo pesa menos de 2 GB y que el release está en *Draft* antes de subirlo. |

## Nota sobre privacidad

El repositorio se crea **público** porque GitHub solo sirve descargas de
Releases sin contraseña en repos públicos. El código **no contiene
secretos** (la clave admin es una variable de entorno de Vercel). Si algún
día prefieres un repositorio privado, pídelo al equipo: hay una variante
alojando los .exe en Vercel Blob.
