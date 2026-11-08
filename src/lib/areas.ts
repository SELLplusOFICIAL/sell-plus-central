/**
 * Motor del comparador de versiones: lee las notas (SE AÑADE / SE CONSERVA / SE AJUSTA),
 * clasifica cada línea en un área del sistema y produce "huellas" para detectar líneas
 * que desaparecieron entre una versión y otra.
 */

export type NotasSecciones = {
  intro: string
  seAnade: string[]
  seConserva: string[]
  seAjusta: string[]
}

/** Minúsculas y sin acentos, para comparar texto de forma robusta. */
export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Separa las notas en sus tres secciones oficiales. */
export function parseNotas(notas: string): NotasSecciones {
  const res: NotasSecciones = { intro: '', seAnade: [], seConserva: [], seAjusta: [] }
  let actual: 'intro' | 'anade' | 'conserva' | 'ajusta' = 'intro'
  for (const linea of (notas ?? '').split('\n')) {
    const l = linea.trim()
    if (!l) continue
    const n = normalizar(l)
    if (n.startsWith('■ se anade')) {
      actual = 'anade'
      continue
    }
    if (n.startsWith('■ se conserva')) {
      actual = 'conserva'
      continue
    }
    if (n.startsWith('■ se ajusta')) {
      actual = 'ajusta'
      continue
    }
    const texto = l.replace(/^•\s*/, '')
    if (actual === 'intro') {
      res.intro += (res.intro ? ' ' : '') + texto
    } else if (actual === 'anade') {
      res.seAnade.push(texto)
    } else if (actual === 'conserva') {
      res.seConserva.push(texto)
    } else {
      res.seAjusta.push(texto)
    }
  }
  return res
}

export type Area = { id: string; nombre: string; claves: string[] }

/** Áreas del sistema, en orden de prioridad de clasificación. */
export const AREAS: Area[] = [
  {
    id: 'caja',
    nombre: 'Caja y ventas',
    claves: [
      'caja', 'ticket', 'cobrar', 'cobro', 'venta', 'dinero', 'efectivo', 'carrito',
      'devoluc', 'atajo', 'f6', 'f7', 'f8', 'f10', 'f12', 'factura', 'mostrador',
      'escaner', 'codigo de barras', 'lector',
    ],
  },
  {
    id: 'inventario',
    nombre: 'Inventarios',
    claves: [
      'inventari', 'lote', 'caduc', 'stock', 'fefo', 'producto', 'categor', 'almacen',
      'merma', 'proveedor', 'compra', 'precio', 'costo', 'etiqueta',
    ],
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    claves: ['report', 'corte', 'export', 'pdf', 'excel', 'csv', 'estadistic', 'grafic', 'historial'],
  },
  {
    id: 'usuarios',
    nombre: 'Usuarios y seguridad',
    claves: ['usuario', 'empleado', 'permiso', 'rol ', 'roles', 'contrasena', 'sesion', 'dueno', 'administrador'],
  },
  {
    id: 'basedatos',
    nombre: 'Base de datos',
    claves: ['base de datos', 'respaldo', 'backup', 'restaurac', 'migrac', 'sqlite', 'datos guardados'],
  },
  {
    id: 'sistema',
    nombre: 'Actualizador y Central',
    claves: [
      'central', 'paladin', 'actualizac', 'instalador', 'vigilante', 'heartbeat', 'descarga',
      'sha', 'servidor', 'salud', 'monitor', 'reinici', 'rollback', 'update', 'release',
      'version', 'instala', 'kit',
    ],
  },
  {
    id: 'interfaz',
    nombre: 'Interfaz y general',
    claves: [
      'color', 'boton', 'texto', 'ventana', 'pantalla', 'tema', 'interfaz', 'diseno',
      'fuente', 'icono', 'menu', 'pesta', 'estilo', 'sonido', 'idioma',
    ],
  },
]

export const NOMBRE_AREA: Record<string, string> = {
  ...Object.fromEntries(AREAS.map((a) => [a.id, a.nombre])),
  otros: 'Otros',
}

/** Clasifica una línea de notas en un área del sistema. */
export function clasificarArea(texto: string): string {
  const t = normalizar(texto)
  for (const a of AREAS) {
    if (a.claves.some((k) => t.includes(k))) return a.id
  }
  return 'otros'
}

/**
 * Huella de una línea para comparar entre versiones:
 * sin acentos, sin puntuación y con los números de versión sustituidos por "#",
 * así "Todo lo de la 3.3.2: …" coincide con "Todo lo de la 3.3.3: …".
 */
export function huella(linea: string): string {
  return normalizar(linea.replace(/^•\s*/, ''))
    .replace(/\d+/g, '#')
    .replace(/[^\w#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
