# Puesta en marcha definitiva — Sell-Plus Central

Esta guía convierte tu **Sell-Plus Central** en un sitio fijo en internet,
gratis, con dirección propia para siempre:

```
https://sell-plus-central.vercel.app
```

---

## ✅ Lo que YA está hecho (no tienes que hacerlo)

- [x] Repositorio creado en GitHub: **https://github.com/SELLplusOFICIAL/sell-plus-central**
- [x] Todo el código de la Central subido al repositorio
- [x] Los 6 instaladores (3.1.0 → 3.3.3) subidos a la sección **Releases**
      de GitHub, cada uno con su firma SHA-256 verificada
- [x] Las 6 versiones de la base de datos ya enlazadas a sus descargas de GitHub

---

## 👉 Lo ÚNICO que falta: publicar en Vercel (unos 5 minutos)

### Paso 1 — Crear tu cuenta de Vercel
1. Entra a **https://vercel.com**
2. Pulsa **Sign Up**.
3. Elige **Continue with GitHub** (con la misma cuenta donde creamos el
   repositorio: SELLplusOFICIAL).
4. Si te pide permiso, pulsa **Authorize Vercel**.

### Paso 2 — Importar el proyecto
1. En el panel principal pulsa **Add New...** → **Project**.
2. En la lista verás **sell-plus-central** → pulsa **Import**.
3. En la pantalla de configuración **no cambies nada**: baja y pulsa
   **Deploy**.
4. La primera vez puede terminar en error. **Es normal**: todavía no tiene
   base de datos. No toques nada y pasa al paso 3.

### Paso 3 — Crear la base de datos
1. Arriba pulsa la pestaña **Storage**.
2. Pulsa **Create Database**.
3. Elige **Neon** (Postgres).
4. Nombre: `sell-plus` (o el que te proponga). Los demás valores déjalos
   igual.
5. Pulsa **Create**.
6. Si te pregunta a qué proyecto conectarlo, elige **sell-plus-central**.
   Vercel conectará solo la base de datos con tu proyecto.

### Paso 4 — Redesplegar
1. Ve a la pestaña **Deployments** (arriba).
2. Entra al último intento de despliegue.
3. Pulsa los tres puntos (**...**) de la derecha → **Redeploy** → confirma.
4. Espera 2–3 minutos. Cuando veas **Congratulations**, ¡ya está!
   Este despliegue crea las tablas y carga solo tus 6 versiones,
   tutoriales, solicitudes y el historial.

---

## 📣 Cuando termine

1. **Cópiame la dirección** que te dio Vercel (algo como
   `https://sell-plus-central-xxxx.vercel.app`).
2. Yo hago la comprobación completa: contrato del actualizador, descargas,
   latidos del Paladín y panel de inicio.
3. Después te doy la instrucción de 1 minuto para apuntar tus cajas a la
   nueva Central (con el kit **Configurar-Central.bat** del escritorio).

---

## 🔒 Un consejo importante: borra el token

El código (token) que creaste en GitHub y me pasaste **ya no hace falta**.
Cuando confirmemos que todo funciona:

1. Entra a **https://github.com/settings/tokens**
2. Busca el token que creaste y pulsa **Delete**.

Así tu cuenta queda protegida. Para futuras publicaciones no se necesita
ningún token.

---

## 🚀 Para publicar la próxima versión (3.3.4 o superior) — cuando llegue el momento

1. Preparas el instalador .exe como siempre.
2. En GitHub: página del repositorio → **Releases** → **Draft a new
   release** → etiqueta `v3.3.4` → arrastra el .exe → **Publish release**.
3. Me avisas y yo registro la versión en la Central apuntando a esa
   descarga. Tus cajas la recibirán automáticamente.
