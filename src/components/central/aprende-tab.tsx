'use client'

import { useState } from 'react'
import { GraduationCap, ChevronDown, ShieldCheck, FileDown, FileText, PlayCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

/**
 * Instructivo OFICIAL de la versión 6.7.0 — funciones y procesos básicos,
 * escrito para empleados. Los instructivos son VIDEOS (uno por parte básica)
 * + un PDF imprimible; el texto rápido queda como referencia debajo.
 */

const PDF_URL = '/instructivos/instructivo-cipherpoint-6.7.0.pdf'

const VIDEOS: { archivo: string; titulo: string; desc: string; dur: string }[] = [
  {
    archivo: 'instructivo-1-entrar-y-abrir-la-caja',
    titulo: 'Parte 1 · Entrar y abrir la caja',
    desc: '«¿Quién está en caja?», tu nombre y PIN, apertura con efectivo y dólares, y la barra de avisos.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-2-vender-en-la-caja',
    titulo: 'Parte 2 · Vender en la Caja',
    desc: 'Escáner y F10, pila de tickets con F6, cobro con F12, doble F12 y el ticket impreso.',
    dur: '0:21',
  },
  {
    archivo: 'instructivo-3-dinero-y-corte-de-caja',
    titulo: 'Parte 3 · Dinero y corte de caja',
    desc: 'Entradas F7 y salidas F8, Cierre X para consultar y Cierre Z oficial con todo el desglose.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-4-inventarios',
    titulo: 'Parte 4 · Inventarios',
    desc: 'Catálogo y Ctrl+T, métricas, vender sin stock (SÍ/NO), Excel por lotes y el Kardex.',
    dur: '0:22',
  },
  {
    archivo: 'instructivo-5-ventas-y-cdai',
    titulo: 'Parte 5 · Ventas y CDAI',
    desc: 'Historial con F1, devoluciones con motivo, crédito (fiado), apartados, escalas y CxP.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-6-el-celular-de-la-tienda',
    titulo: 'Parte 6 · El celular de la tienda',
    desc: 'Dirección de la PC y QR, instalar el APK desde la Central, escáner, mensajería e impresión.',
    dur: '0:23',
  },
]

const SECCIONES: { titulo: string; puntos: string[] }[] = [
  {
    titulo: '1. Abrir y cerrar el día',
    puntos: [
      'Entra con tu usuario y fija con cuánto dinero arranca la caja (apertura).',
      'Cierre X: revisa cuánto hay en caja sin cerrar el día. Úsalo cuando quieras ver el corte al momento.',
      'Cierre Z: cierra el día oficialmente. El corte queda guardado con ventas del día, efectivo, tarjeta y diferencias, y no se puede borrar.',
    ],
  },
  {
    titulo: '2. Vender en la Caja',
    puntos: [
      'Agrega productos escaneando el código de barras con la pistola o buscándolos por nombre (F10).',
      'Los tickets abiertos se muestran en pila arriba; toca un ticket para retomarlo. F6 abre una nueva venta (máx. 20).',
      'Botón Cobrar (F12 o doble F12): cobra en efectivo, tarjeta u otro método y el ticket sale impreso.',
      'F3 reimprime el último ticket si el papel se atascó o se perdió.',
    ],
  },
  {
    titulo: '3. Dinero en caja',
    puntos: [
      'Entrada (F7): registrar dinero que entra y no es venta (cambio inicial, fondos).',
      'Salida (F8): registrar dinero que sale con motivo (pago a proveedor, retiro).',
      'Ambas quedan registradas y aparecen en el corte del día.',
    ],
  },
  {
    titulo: '4. Inventario',
    puntos: [
      'El catálogo carga ligero y muestra el stock de cada producto (Ctrl+T filtra todos).',
      'Tarjetas de métricas: Productos, Valor del inventario, Por caducar (≤ 30 días) y Stock bajo.',
      'Kardex: el historial completo de entradas y salidas de cada producto.',
      'Importar Excel: crea o actualiza productos por lote; si un renglón falla, el sistema te dice exactamente cuál renglón y por qué.',
    ],
  },
  {
    titulo: '5. Avisos y notificaciones',
    puntos: [
      'La barra de avisos marca: productos vencidos, por caducar y con stock bajo.',
      'Las ventanas emergentes te avisan sin salir de la caja; el botón Tickets abre el historial de tickets con reimpresión.',
    ],
  },
  {
    titulo: '6. Usuarios y permisos',
    puntos: [
      'EMPLEADO: opera la caja, el escáner y (según los permisos que active el administrador) agregar o eliminar productos. Solo ve las secciones permitidas.',
      'ADMINISTRADOR: tiene todo — permisos, analítica, importaciones, usuarios y configuración.',
      'Los permisos se guardan y se respetan en la PC y en el celular.',
    ],
  },
  {
    titulo: '7. El celular de la tienda',
    puntos: [
      'Instala CipherPoint Móvil desde la Central, pon la dirección que aparece en el menú Móvil de la PC (mismo WiFi) o escanea el QR, y entra con un usuario del negocio.',
      'El escáner del celular manda productos directo al ticket de la PC.',
      'También hay mensajería con respuestas e impresión desde el celular.',
      'Para actualizar la app: descarga la nueva versión desde la Central e instálala encima (sin desinstalar).',
    ],
  },
  {
    titulo: '8. Actualizaciones',
    puntos: [
      'El software revisa la Central cada 15 minutos e instala las mejoras solo, sin borrar nada.',
      'Tus ventas, productos, inventarios y usuarios NUNCA se borran al actualizar.',
      'La versión oficial es la 6.7.0 «Cifra Fresca»: siempre disponible en la Central.',
    ],
  },
]

export default function AprendeTab() {
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set([0]))

  const alternar = (i: number) => {
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="sp-chrome-text text-lg font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-cyan-300" aria-hidden />
          Aprende
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Instructivo oficial de la versión 6.7.0 — cada parte básica del programa en video,
          más un manual en PDF listo para imprimir. Para empleados.
        </p>
      </div>

      {/* Manual imprimible en PDF */}
      <Card className="shadow-[0_0_30px_rgba(34,211,238,0.08)] border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 via-sky-400/5 to-blue-500/10">
        <CardContent className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <div className="sp-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-gradient-to-br from-cyan-400/80 to-blue-600/80">
            <FileText className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div className="min-w-[230px] flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cyan-200">
              Instructivo en PDF — listo para imprimir
              <Badge className="bg-cyan-400/25 text-cyan-100 hover:bg-cyan-400/35 shrink-0">
                Para empleados
              </Badge>
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Manual completo de la versión oficial 6.7.0 «Cifra Fresca»: las 12 secciones,
              la tabla de atajos y los problemas frecuentes. Listo para imprimir en tamaño carta.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Ver en pantalla
            </a>
            <a
              href={PDF_URL}
              download
              className="sp-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:from-cyan-400 hover:to-blue-500"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Descargar PDF
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Videos instructivos */}
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <PlayCircle className="h-4 w-4 text-cyan-300" aria-hidden />
          Videos instructivos (6 partes)
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VIDEOS.map((v) => (
            <Card key={v.archivo} className="overflow-hidden shadow-sm border-white/10 bg-white/5">
              <div className="relative bg-black/40">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  controls
                  preload="none"
                  poster={`/instructivos/${v.archivo}.jpg`}
                  className="aspect-video w-full"
                >
                  <source src={`/instructivos/${v.archivo}.mp4`} type="video/mp4" />
                  Tu navegador no reproduce este video; descarga el PDF o pide el video en Solicitudes.
                </video>
              </div>
              <CardContent className="px-4 py-3">
                <p className="flex items-center justify-between gap-2 text-sm font-bold text-slate-100">
                  {v.titulo}
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Clock className="h-3 w-3" aria-hidden />
                    {v.dur}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-400">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Referencia rápida en texto */}
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden />
          Instructivo de funciones — Sell-Plus 6.7.0 (referencia rápida)
        </p>
      </div>

      <div className="space-y-2">
        {SECCIONES.map((sec, i) => {
          const abierta = abiertas.has(i)
          return (
            <Collapsible key={sec.titulo} open={abierta} onOpenChange={() => alternar(i)}>
              <Card className="shadow-sm border-white/10 bg-white/5">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-expanded={abierta}
                  >
                    <CardContent className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-sm font-bold text-slate-100 flex-1 min-w-0 break-words">
                        {sec.titulo}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </CardContent>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0">
                    <ul className="space-y-1.5">
                      {sec.puntos.map((p, j) => (
                        <li key={j} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-cyan-400 mt-0.5 shrink-0" aria-hidden>•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      <p className="text-xs text-slate-500">
        Este instructivo corresponde a la versión oficial 6.7.0. Si un empleado necesita aprender
        algo que no está aquí, pídelo en Solicitudes y lo añado a este mismo instructivo.
      </p>
    </div>
  )
}
