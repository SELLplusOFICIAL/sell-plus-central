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
    titulo: 'Entrar y abrir la caja',
    desc: '«¿Quién está en caja?», tu nombre y PIN, apertura con efectivo y dólares, y la barra de avisos.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-2-vender-en-la-caja',
    titulo: 'Vender en la Caja',
    desc: 'Escáner y F10, pila de tickets con F6, cobro con F12, doble F12 y el ticket impreso.',
    dur: '0:21',
  },
  {
    archivo: 'instructivo-3-dinero-y-corte-de-caja',
    titulo: 'Dinero y corte de caja',
    desc: 'Entradas F7 y salidas F8, Cierre X para consultar y Cierre Z oficial con todo el desglose.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-4-inventarios',
    titulo: 'Inventarios',
    desc: 'Catálogo y Ctrl+T, métricas, vender sin stock (SÍ/NO), Excel por lotes y el Kardex.',
    dur: '0:22',
  },
  {
    archivo: 'instructivo-5-ventas-y-cdai',
    titulo: 'Ventas y CDAI',
    desc: 'Historial con F1, devoluciones con motivo, crédito (fiado), apartados, escalas y CxP.',
    dur: '0:20',
  },
  {
    archivo: 'instructivo-6-el-celular-de-la-tienda',
    titulo: 'El celular de la tienda',
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
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set())

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
        <h2 className="text-lg font-bold tracking-tight text-slate-100">Aprende</h2>
        <p className="text-xs text-slate-400">
          Instructivo oficial de la v6.7.0 — cada parte básica en video, más un manual en PDF listo
          para imprimir. Para empleados.
        </p>
      </div>

      {/* Manual imprimible en PDF — destacado */}
      <div className="sp-story rounded-[18px] p-[1.5px]">
        <Card className="border-0 bg-[#0a0e17] shadow-none">
          <CardContent className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-400/25 via-violet-400/20 to-orange-400/25">
              <FileText className="h-5 w-5 text-fuchsia-200" aria-hidden />
            </div>
            <div className="min-w-[220px] flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
                Instructivo en PDF
                <Badge className="border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200 hover:bg-fuchsia-400/20">
                  Listo para imprimir
                </Badge>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Manual completo de la 6.7.0 «Cifra Fresca»: 12 secciones, tabla de atajos y problemas
                frecuentes. Tamaño carta.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={PDF_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.11] hover:text-white"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Ver
              </a>
              <a
                href={PDF_URL}
                download
                className="sp-btn-grad inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-[0.97]"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                Descargar PDF
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos instructivos */}
      <div>
        <p className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-100">
          <PlayCircle className="h-4 w-4 text-cyan-300" aria-hidden />
          Videos instructivos
          <span className="text-xs font-normal text-slate-500">(6 partes · 20-23 s cada una)</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VIDEOS.map((v) => (
            <Card key={v.archivo} className="sp-hover-lift overflow-hidden">
              <div className="relative bg-black/50">
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
                <p className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-100">
                  {v.titulo}
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    <Clock className="h-3 w-3" aria-hidden />
                    {v.dur}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Referencia rápida en texto — colapsada por defecto */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger className="w-full text-left">
            <CardContent className="flex items-center justify-between gap-2 px-5 py-3.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <span className="truncate text-sm font-semibold text-slate-200">
                  Referencia rápida de funciones
                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                    ({SECCIONES.length} secciones, en texto)
                  </span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-1 px-3 pb-4 pt-0">
              {SECCIONES.map((sec, i) => {
                const abierta = abiertas.has(i)
                return (
                  <Collapsible key={sec.titulo} open={abierta} onOpenChange={() => alternar(i)}>
                    <div className="rounded-lg">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                          aria-expanded={abierta}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                            {sec.titulo}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${abierta ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="space-y-1.5 px-2 pb-3 pl-9">
                          {sec.puntos.map((p, j) => (
                            <li key={j} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                              <span className="mt-0.5 shrink-0 text-cyan-400/80" aria-hidden>•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <p className="text-xs text-slate-500">
        Este instructivo corresponde a la versión oficial 6.7.0. Si un empleado necesita aprender
        algo que no está aquí, pídelo en Solicitudes y lo añado.
      </p>
    </div>
  )
}
