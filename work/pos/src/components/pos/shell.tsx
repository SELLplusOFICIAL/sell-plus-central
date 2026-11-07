'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBasket, Calculator, Boxes, ReceiptText, Users, LogOut } from 'lucide-react'
import type { Sesion } from '@/lib/sesion'

const PESTANAS = [
  { ruta: '/caja', etiqueta: 'Caja', icono: Calculator },
  { ruta: '/inventarios', etiqueta: 'Inventarios', icono: Boxes },
  { ruta: '/ventas', etiqueta: 'Ventas', icono: ReceiptText },
  { ruta: '/empleados', etiqueta: 'Empleados', icono: Users, soloDueno: true },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const ruta = usePathname()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/sesion', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.sesion) setSesion(d.sesion)
        else router.replace('/')
      })
      .catch(() => router.replace('/'))
      .finally(() => setCargando(false))
  }, [router])

  const salir = async () => {
    await fetch('/api/sesion', { method: 'DELETE' })
    router.replace('/')
  }

  if (cargando || !sesion) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="sp-pulso text-slate-500 text-sm">Cargando Sell-Plus…</div>
      </main>
    )
  }

  const pestañasVisibles = PESTANAS.filter((p) => !p.soloDueno || sesion.rol === 'dueno')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 bg-[#0d1526]/95 backdrop-blur border-b border-[var(--sp-border)]">
        <div className="px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <ShoppingBasket className="h-5 w-5 text-emerald-400" aria-hidden />
            </div>
            <span className="font-extrabold tracking-tight hidden sm:block">Sell-Plus</span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto flex-1" aria-label="Secciones">
            {pestañasVisibles.map((p) => (
              <button
                key={p.ruta}
                className="sp-tab"
                data-activa={ruta.startsWith(p.ruta) ? '1' : '0'}
                onClick={() => router.push(p.ruta)}
              >
                <p.icono className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
                {p.etiqueta}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{sesion.nombre}</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                {sesion.rol === 'dueno' ? 'Dueño' : 'Empleado'}
              </p>
            </div>
            <button
              className="sp-btn sp-btn-ghost !min-h-[40px] !px-3"
              onClick={salir}
              title="Salir"
              aria-label="Salir"
            >
              <LogOut className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  )
}
