'use client'

import { useState } from 'react'
import { GraduationCap, ChevronDown, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

/**
 * Instructivo OFICIAL de la versión 6.7.0 — funciones y procesos básicos,
 * escrito para empleados. Solo este instructivo vive aquí; el material que ya
 * no servía fue retirado.
 */
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
      'Agrega productos escaneando el código de barras con la pistola o buscándolos por nombre.',
      'Los tickets abiertos se muestran en pila arriba; toca un ticket para retomarlo. Los productos del ticket activo se ven en lista.',
      'Botón Cobrar (o doble F12): cobra en efectivo, tarjeta u otro método y el ticket sale impreso.',
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
      'El catálogo carga ligero y muestra el stock de cada producto.',
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
      'Instala CipherPoint Móvil en el celular, pon la dirección que aparece en el menú Móvil de la PC (mismo WiFi) y entra con un usuario del negocio.',
      'El escáner del celular manda productos directo al ticket de la PC.',
      'También hay mensajería con respuestas e impresión desde el celular.',
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
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-emerald-700" aria-hidden />
          Aprende
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Instructivo oficial de la versión 6.7.0 — características y procesos básicos del programa,
          para empleados. Aquí solo vive este instructivo: lo que ya no servía fue retirado.
        </p>
      </div>

      <Card className="shadow-sm border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex flex-wrap items-center gap-2 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden />
          <p className="text-sm text-emerald-900 font-semibold flex-1 min-w-0">
            Instructivo de funciones — Sell-Plus 6.7.0 «Cifra Fresca» (versión oficial)
          </p>
          <Badge className="bg-emerald-800 text-white hover:bg-emerald-800 shrink-0">
            Para empleados
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {SECCIONES.map((sec, i) => {
          const abierta = abiertas.has(i)
          return (
            <Collapsible key={sec.titulo} open={abierta} onOpenChange={() => alternar(i)}>
              <Card className="shadow-sm border-stone-200">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-expanded={abierta}
                  >
                    <CardContent className="flex items-center justify-between gap-2 px-4 py-3">
                      <span className="text-sm font-bold text-stone-800 flex-1 min-w-0 break-words">
                        {sec.titulo}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-stone-400 shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </CardContent>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0">
                    <ul className="space-y-1.5">
                      {sec.puntos.map((p, j) => (
                        <li key={j} className="text-sm text-stone-700 flex gap-2">
                          <span className="text-emerald-600 mt-0.5 shrink-0" aria-hidden>•</span>
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

      <p className="text-xs text-stone-500">
        Este instructivo corresponde a la versión oficial 6.7.0. Si un empleado necesita aprender
        algo que no está aquí, pídelo en Solicitudes y lo añado a este mismo instructivo.
      </p>
    </div>
  )
}
