/**
 * Resúmenes cortos del registro de actualizaciones (entrega «Cifra Fresca»).
 *
 * La pestaña Actualizaciones ya no muestra las notas completas (tres bloques
 * largos); muestra una línea de resumen por versión. Los resúmenes curados
 * están aquí; si una versión futura se publica sin entrada curada, se deriva
 * mecánicamente de sus notas con resumenDerivado() y nunca se rompe nada.
 */

/** Resumen curado por versión (las visibles: 6.0.0 en adelante). */
export const RESUMENES: Record<string, string> = {
  '6.6.2':
    'Notificaciones, historial de tickets y catálogo aparecen desde el PRIMER inicio de sesión: la caja reintenta sola y el motor espera a la base lista antes de abrir.',
  '6.6.1':
    'Vuelven la métrica de inventarios (4 tarjetas), los permisos de empleados que sí se guardan y las piezas del servidor que llegaban dañadas desde la 6.4.4.',
  '6.6.0':
    'El celular entra con usuario del negocio (administrador o empleado, cada quien con sus permisos) y su escáner manda productos al ticket de la PC.',
  '6.5.1':
    'Caja compacta: botón Cobrar más pequeño, corte de caja discreto y más espacio para los tickets abiertos.',
  '6.5.0':
    'Mensajería del negocio con respuestas desde el celular, rastreo por lotes, alertas con notificaciones y gráficas en el móvil.',
  '6.4.4':
    'El interruptor «Ver Analítica» ya se ve en Permisos, tema Neuronal OS terminado y el importador de Excel revisa el archivo antes de meterlo.',
  '6.4.3':
    'Tema nuevo «Neuronal OS», permiso Analítica de verdad para administrador y pantalla completa que abarca la barra de tareas.',
  '6.4.2':
    'Versión interna corregida en todos los campos y caché fresca al arrancar: los cambios ahora sí se ven al actualizar.',
  '6.4.1':
    'Los tickets de la caja abarcan toda la ventana, avisos abajo como botones y cobro directo con DOBLE F12.',
  '6.4.0':
    'Modo sin red del celular: datos a la vista sin conexión y cola de tickets que se imprime sola al reconectar.',
  '6.3.1':
    'Freno de seguridad de la cola de impresión: se acabó el atorón de la 6.3.0.',
  '6.3.0':
    'El celular imprime en la impresora de tu PC (papel 58/80 mm, hasta 3 copias) y escanea con la cámara.',
  '6.2.1':
    'La app Android ya conecta con tu PC: causa raíz del bloqueo del WebView corregida.',
  '6.2.0':
    'El celular entra sin trabas: dirección de la PC a la vista, firewall listo y permisos ajustados.',
  '6.1.0':
    'App Android v1 real (APK) descargable desde tu propia PC con QR y progreso.',
  '6.0.1':
    'Corrección quirúrgica: el código de emparejamiento vuelve a verse completo (6 dígitos).',
  '6.0.0':
    'Cifra Móvil: emparejamiento QR de celulares por el WiFi del negocio y vista móvil instalable (PWA).',
}

/** Primera versión cuyo registro se muestra completo en la pestaña. */
export const VISIBLE_DESDE = '6.0.0'

/**
 * Resumen mecánico de respaldo: primera línea útil de las notas,
 * cortada en un límite de palabra (nunca a mitad de palabra).
 */
export function resumenDerivado(notas: string, tope = 190): string {
  const linea = (notas || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('■') && !l.startsWith('#'))
  const texto = (linea || '').replace(/^[-•]\s*/, '')
  if (texto.length <= tope) return texto
  const corte = texto.lastIndexOf(' ', tope)
  return texto.slice(0, corte > 60 ? corte : tope).trimEnd() + '…'
}

/** Resumen de una versión: curado si existe; derivado de las notas si no. */
export function resumenDe(version: string, notas: string): string {
  return RESUMENES[version] ?? resumenDerivado(notas)
}
