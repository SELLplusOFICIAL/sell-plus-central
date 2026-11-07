#!/usr/bin/env python3
"""Construye el HTML de la Guía de Despliegue en Vercel reutilizando
el sistema de diseño del Manual del Dueño (mismo CSS, paleta y tipografía)."""
import re

CSS = open("/tmp/manual-css.css", encoding="utf-8").read()

# La guía no usa la clase .flecha del manual ni tablas; sólo las clases base.
BODY = """
<!-- ================= PORTADA ================= -->
<div class="cover">
  <div class="badge">SELL-PLUS CENTRAL</div>
  <h1>Tu Central<br>para siempre</h1>
  <p class="sub">Guía paso a paso para poner tu sitio de mando en Vercel:
  una dirección fija en internet, gratis, que tu programa consultará
  siempre para crecer sin límites.</p>
  <div class="chips">
    <span class="chip">GitHub · código e instaladores</span>
    <span class="chip">Vercel · sitio 24/7</span>
    <span class="chip">Neon · base de datos</span>
  </div>
  <div class="stats">
    <div class="st"><b>7</b><span>Pasos</span></div>
    <div class="st"><b>~30</b><span>Minutos</span></div>
    <div class="st"><b>$0</b><span>Costo mensual</span></div>
  </div>
  <div class="foot">Sell-Plus 3.1.0 · Guía de despliegue</div>
</div>

<div class="main-content">

<!-- ================= CAPÍTULO 1 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 1</div>
  <h2>Qué vas a conseguir</h2>
  <div class="divider"></div>
</div>

<p>Hoy tu Central vive en un taller temporal: funciona perfectamente, pero su
dirección solo existe mientras esta sesión esté abierta. Eso significa que el
día de mañana, si el taller se apaga, tu programa dejaría de encontrarla. La
solución es publicarla en internet de forma permanente, y se hace con tres
servicios gratuitos trabajando juntos:</p>

<div class="grid2">
  <div class="mini"><b>GitHub — el almacén</b>
    <p>Guarda el código del sitio y los instaladores grandes (Releases).
    Es gratis y los archivos se descargan desde su red mundial de servidores.</p></div>
  <div class="mini"><b>Vercel — el publinicador</b>
    <p>Toma el código de GitHub y mantiene el sitio encendido 24/7 con una
    dirección fija: <b>https://sell-plus-central.vercel.app</b>. Gratis.</p></div>
  <div class="mini"><b>Neon — la memoria</b>
    <p>Base de datos PostgreSQL en la nube donde viven tus versiones, el
    manual de Aprende, tus equipos conectados y el conocimiento del proyecto.</p></div>
  <div class="mini"><b>Tú — el dueño</b>
    <p>Creas 2 cuentas, arrastras las carpetas y pegas 1 URL. Esta guía te
    lleva de la mano en cada pantalla, sin conocimientos técnicos.</p></div>
</div>

<div class="callout"><span class="lbl">IMPORTANTE</span>
<b>Tu programa Sell-Plus no cambia nada.</b> Sigue siendo el mismo de siempre,
con todas sus funciones y su base de datos local. Solo cambia el lugar donde
vive la Central: el software tendrá exactamente la misma potencia para crecer
que hasta hoy — módulos nuevos, reportes, lo que pidas. Los instaladores, que
pesan unos 84 MB, se descargarán incluso más rápido desde la nube de GitHub.</p></div>

<div class="callout warn"><span class="lbl">TEN EN CUENTA</span>
El plan gratuito de Vercel está pensado para proyectos personales y de tamaño
pequeño: de sobra para ti. Si algún día necesitas un dominio propio
(<b>central.tutienda.com</b>) o soporte comercial, se puede subir de plan o
mover el sitio a otro servidor <b>sin perder ni un dato</b>: la base de datos
viaja contigo.</div>

<!-- ================= CAPÍTULO 2 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 2</div>
  <h2>Cuenta de GitHub y repositorio (Pasos 1 y 2)</h2>
  <div class="divider"></div>
</div>

<p>GitHub será la casa del código y de los instaladores. Solo se hace una vez.</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Crear la cuenta</b>
    <p>Entra a <span class="kbd">github.com</span> y pulsa <b>Sign up</b>. Pon tu correo,
    una contraseña y un nombre de usuario (aparecerá en tus direcciones web).
    Revisa tu correo y pulsa el botón <b>Verify</b> del mensaje de GitHub.</p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Crear el repositorio</b>
    <p>Ya con la sesión iniciada, pulsa el <b>+</b> (arriba a la derecha) y elige
    <b>New repository</b>. Nombre: <span class="path">sell-plus-central</span>.
    Marca <b>Public</b>. No marques ninguna otra casilla. Pulsa <b>Create repository</b>.</p></div></div>
</div>

<div class="callout"><span class="lbl">¿POR QUÉ PÚBLICO?</span>
El instalador debe descargarse sin contraseñas para que el Auto-Actualizador
de tus tiendas funcione siempre. Público no es peligroso aquí: el código no
contiene secretos — todas las contraseñas viven después, en la configuración
privada de Vercel (Capítulo 5).</div>

<!-- ================= CAPÍTULO 3 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 3</div>
  <h2>Subir el proyecto (Paso 3)</h2>
  <div class="divider"></div>
</div>

<p>En la página del repositorio recién creado, pulsa el enlace
<b>"uploading an existing file"</b> (o la pestaña <b>Uploads</b>). Se abre un
área para arrastrar. Sube en dos tandas:</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Tanda A — las 5 carpetas completas</b>
    <p>Arrastra a la vez: <span class="path">src/</span> <span class="path">prisma/</span>
    <span class="path">public/</span> <span class="path">scripts/</span>
    <span class="path">central-files/</span></p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Tanda B — los archivos sueltos</b>
    <p><span class="path">package.json</span> <span class="path">package-lock.json</span>
    <span class="path">next.config.ts</span> <span class="path">tsconfig.json</span>
    <span class="path">postcss.config.mjs</span> <span class="path">tailwind.config.ts</span>
    <span class="path">components.json</span> <span class="path">eslint.config.mjs</span>
    <span class="path">next-env.d.ts</span> <span class="path">.gitignore</span>
    <span class="path">.env.example</span> <span class="path">README.md</span>
    <span class="path">DESPLEGAR-EN-VERCEL.md</span></p></div></div>
  <div class="step"><div class="n">3</div><div class="t">
    <b>Guardar</b>
    <p>Pulsa <b>Commit changes</b> (si pide mensaje, escribe "Central inicial").
    En unos segundos verás todas las carpetas listadas en la página del repo.</p></div></div>
</div>

<div class="callout warn"><span class="lbl">NUNCA SUBAS</span>
La carpeta <span class="path">db/</span>, el archivo <span class="path">.env</span>
ni ningún <b>.exe</b>. Los instaladores grandes van por "Releases" (Capítulo 6)
y las contraseñas solo en Vercel. El ZIP que te entregué ya viene limpio:
simplemente no añadas archivos de tu PC.</div>

<!-- ================= CAPÍTULO 4 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 4</div>
  <h2>La base de datos (Paso 4)</h2>
  <div class="divider"></div>
</div>

<p>Ahora creamos la memoria de tu Central en la nube. Se hace desde el propio
Vercel, con un solo formulario.</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Entrar a Vercel con GitHub</b>
    <p>Ve a <span class="kbd">vercel.com</span> y pulsa <b>Continue with GitHub</b>.
    Autoriza con la cuenta que creaste en el Capítulo 2. Es rápido: dos clics.</p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Crear la base</b>
    <p>Pestaña <b>Storage</b> → <b>Create Database</b> → <b>Neon Postgres</b>.
    Nombre: <span class="path">sell-plus-central-db</span>. Región: la más cercana
    a tu país (ej. Washington D.C.). Pulsa <b>Create</b>.</p></div></div>
  <div class="step"><div class="n">3</div><div class="t">
    <b>Copiar la cadena de conexión</b>
    <p>Abre la base recién creada y busca el panel de <b>Connection string</b>.
    Copia la cadena <b>"Direct connection"</b> — la que <b>NO</b> contiene la
    palabra <span class="path">-pooler</span>. Guárdala en el portapapeles: es la
    única pieza que Vercel necesita.</p></div></div>
</div>

<div class="callout warn"><span class="lbl">CUIDADO — ES TU CONTRASEÑA</span>
Esa cadena abre tu base de datos. Solo va en la configuración de Vercel
(Capítulo 5). <b>Nunca</b> la subas a GitHub ni la compartas en chats.</div>

<!-- ================= CAPÍTULO 5 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 5</div>
  <h2>Importar y desplegar (Paso 5)</h2>
  <div class="divider"></div>
</div>

<p>El momento mágico: Vercel toma el código, crea las tablas y deja tu Central
encendida. Todo en un solo botón.</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Importar el repositorio</b>
    <p>En Vercel: <b>Add New...</b> → <b>Project</b> → aparece
    <span class="path">sell-plus-central</span> en la lista → pulsa <b>Import</b>.</p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Configurar la variable de la base</b>
    <p>Antes de desplegar, abre <b>Environment Variables</b> y agrega:
    Name: <span class="path">DATABASE_URL</span> — Value: *pega la cadena del
    Capítulo 4*. Es la única variable necesaria.</p></div></div>
  <div class="step"><div class="n">3</div><div class="t">
    <b>Deploy</b>
    <p>Pulsa <b>Deploy</b> y espera 2–4 minutos. Al terminar verás la pantalla
    de celebración con la dirección fija de tu Central. ¡Ya está en internet!</p></div></div>
</div>

<div class="callout"><span class="lbl">QUÉ HIZO VERCEL SOLO</span>
Durante ese despliegue, el script del proyecto: cambió el esquema a
PostgreSQL, creó todas las tablas y <b>cargó tus datos actuales</b>: las
versiones 3.0.1 y 3.1.0, el Manual del Dueño, la base de conocimiento, los
problemas conocidos, tus equipos conectados y el historial del chat. Todo
igual que lo dejaste, pero permanente.</div>

<p>La dirección que Vercel te asigna es fija y gratuita. Si quieres otra
(quizá <span class="path">mi-central.vercel.app</span>), cámbiala en
<b>Settings → Domains</b>, usando un nombre que esté libre.</p>

<!-- ================= CAPÍTULO 6 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 6</div>
  <h2>Los instaladores grandes (Paso 6)</h2>
  <div class="divider"></div>
</div>

<p>Tu instalador pesa unos 84 MB y crecerá con cada versión. Vercel no está
pensado para archivos tan grandes, pero GitHub sí: los "Releases" aceptan
archivos de hasta 2 GB cada uno y los sirven a máxima velocidad. El sitio se
encarga del resto: cuando una tienda pida la descarga, la Central redirige
automáticamente a GitHub. Nada cambia para el programa.</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Crear el release</b>
    <p>En tu repositorio: <b>Releases</b> (columna derecha) → <b>Draft a new
    release</b>. En el campo Tag escribe <span class="path">v3.1.0</span> y como
    título: <span class="path">Sell-Plus 3.1.0</span>.</p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Adjuntar el instalador</b>
    <p>Arrastra el archivo
    <span class="path">Sell-Plus-3.1.0-Instalador-Windows-64bits.exe</span> al área
    de adjuntos y pulsa <b>Publish release</b>. Subir toma un par de minutos.</p></div></div>
  <div class="step"><div class="n">3</div><div class="t">
    <b>Copiar el enlace del archivo</b>
    <p>En la página del release ya publicado, clic derecho sobre el nombre del
    .exe → <b>Copiar dirección del enlace</b>. Empieza por
    <span class="path">https://github.com/.../releases/download/...</span></p></div></div>
  <div class="step"><div class="n">4</div><div class="t">
    <b>Pegarla en tu Central</b>
    <p>Entra a tu Central → pestaña <b>Actualizaciones</b> → tarjeta de la
    v3.1.0 → botón <b>Usar URL de GitHub</b> → pega el enlace → <b>Guardar URL</b>.
    Aparecerá la etiqueta azul "GitHub" en esa versión.</p></div></div>
</div>

<div class="callout"><span class="lbl">DESDE AHORA</span>
Cada versión futura repite el mismo gesto: subes su .exe a un release nuevo y
pegas su URL en Actualizaciones. El Auto-Actualizador descargará desde la nube
de GitHub con la misma verificación de integridad (tamaño + SHA-256) de
siempre. Puedes pedirle a tu ingeniero el instalador de cada versión por el
chat de siempre.</div>

<!-- ================= CAPÍTULO 7 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 7</div>
  <h2>Tu PC: acceso directo y programa (Paso 7)</h2>
  <div class="divider"></div>
</div>

<p>Último paso: dejar tu computadora apuntando a la Central nueva. Con el
<b>Kit de Acceso Directo</b> que te entregué, son 20 segundos.</p>

<div class="steps">
  <div class="step"><div class="n">1</div><div class="t">
    <b>Descomprimir el kit</b>
    <p>Descarga y descomprime <span class="path">Kit-Acceso-Central.zip</span>
    en cualquier carpeta de tu PC.</p></div></div>
  <div class="step"><div class="n">2</div><div class="t">
    <b>Ejecutar</b>
    <p>Doble clic en <span class="path">Configurar-Central.bat</span>. Si Windows
    muestra un aviso azul (SmartScreen), pulsa <b>Más información</b> →
    <b>Ejecutar de todas formas</b>.</p></div></div>
  <div class="step"><div class="n">3</div><div class="t">
    <b>Escribir tu dirección de Vercel</b>
    <p>Cuando el kit pregunte, escribe la dirección fija que Vercel te dio
    (ej. <span class="path">https://sell-plus-central.vercel.app</span>) y pulsa
    ENTER.</p></div></div>
</div>

<div class="grid2">
  <div class="mini"><b>En tu escritorio</b>
    <p>Queda el acceso directo "Sell-Plus Central" con su icono verde oficial:
    doble clic y estás dentro, siempre.</p></div>
  <div class="mini"><b>En tu programa</b>
    <p>El Auto-Actualizador queda apuntando a la Central permanente:
    seguirá avisando e instalando cada versión nueva, solo.</p></div>
</div>

<div class="callout"><span class="lbl">TRANQUILIDAD</span>
El kit solo crea el acceso directo y actualiza la dirección de consulta.
<b>No toca tu base de datos de ventas, ni productos, ni usuarios</b> — eso
queda siempre en <span class="path">C:\Sell-Plus\resources\app\db\custom.db</span>,
intocable como siempre.</div>

<!-- ================= CAPÍTULO 8 ================= -->
<div class="chapter-header">
  <div class="section-tag">CAPÍTULO 8</div>
  <h2>Si algo no sale igual que en la guía</h2>
  <div class="divider"></div>
</div>

<p>Estos son los tropiezos más comunes y su salida. Si aparece cualquier otra
cosa, escríbeme por el chat con una captura y lo resolvemos juntos.</p>

<div class="grid2">
  <div class="mini"><b>El Deploy falla mencionando la base de datos</b>
    <p>La cadena DATABASE_URL quedó mal escrita o es la versión "pooled"
    (contiene -pooler). Corrígela en Settings → Environment Variables con la
    cadena "Direct connection" y pulsa Redeploy.</p></div>
  <div class="mini"><b>El sitio abre pero sin versiones ni manual</b>
    <p>El paso de carga de datos no pudo conectar. Revisa la variable
    DATABASE_URL y haz Redeploy. Los datos se cargan solos en cada despliegue.</p></div>
  <div class="mini"><b>La descarga del instalador da error</b>
    <p>Falta pegar la URL del release en Actualizaciones (Capítulo 6), o el
    enlace copiado no es el del archivo .exe. Verifícalo abriéndolo en el
    navegador: debe empezar a descargar.</p></div>
  <div class="mini"><b>GitHub no me deja arrastrar todo</b>
    <p>El navegador admite ~100 archivos por arrastre. Sube primero las 5
    carpetas y luego los archivos sueltos, tal como divide esta guía.</p></div>
  <div class="mini"><b>El asistente de IA responde que no está configurado</b>
    <p>Es lo esperado fuera del taller original: todo el sitio funciona igual,
    solo el asistente interno queda en pausa. Pide tus cambios por el chat
    directo de siempre.</p></div>
  <div class="mini"><b>Mi dirección vercel.app se me olvidó</b>
    <p>Ábrela desde GitHub: en tu repositorio, el panel derecho "Deployments"
    (con la integración activa) o entra a vercel.com con tu cuenta y verás el
    proyecto y su dirección. Y con el acceso directo del escritorio, no la
    necesitas de memoria.</p></div>
</div>

</div><!-- /main-content -->

<!-- ================= CIERRE ================= -->
<div class="ending">
  <div class="badge">CHECKLIST FINAL</div>
  <h2>Tu Central, en línea para siempre</h2>
  <div class="oro"><b>1 · REPOSITORIO</b>
    sell-plus-central en GitHub, público, con las 5 carpetas y los archivos sueltos.</div>
  <div class="oro"><b>2 · BASE DE DATOS</b>
    Neon Postgres creada y su cadena "Direct connection" puesta como DATABASE_URL en Vercel.</div>
  <div class="oro"><b>3 · DESPLIEGUE</b>
    Deploy terminado con celebración; tus versiones, manual y equipos ya visibles en la web.</div>
  <div class="oro"><b>4 · INSTALADOR</b>
    Release v3.1.0 publicado y su URL pegada en Actualizaciones (etiqueta azul GitHub).</div>
  <div class="oro"><b>5 · TU PC</b>
    Kit ejecutado con la dirección nueva: acceso directo en el escritorio y programa conectado.</div>
  <div class="pie">SELL-PLUS CENTRAL · SIEMPRE EN LÍNEA</div>
</div>
"""

HTML = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Tu Central para siempre — Guía de despliegue en Vercel</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
{BODY}
</body>
</html>
"""

out = "/home/z/my-project/download/Guia-Despliegue-Central-Vercel.html"
open(out, "w", encoding="utf-8").write(HTML)
print("HTML escrito:", out, len(HTML), "caracteres")
