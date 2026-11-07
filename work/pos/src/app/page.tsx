'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBasket, Delete, ShieldCheck, ArrowRight } from 'lucide-react'

type UsuarioMini = { id: string; nombre: string; rol: string }

export default function Login() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<UsuarioMini[]>([])
  const [elegido, setElegido] = useState<UsuarioMini | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    fetch('/api/sesion', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setUsuarios(d.usuarios ?? [])
        if (d.sesion) router.replace('/caja')
      })
      .catch(() => {})
  }, [router])

  const ponerDigito = (d: string) => {
    setError('')
    setPin((p) => (p.length < 6 ? p + d : p))
  }
  const borrar = () => {
    setError('')
    setPin((p) => p.slice(0, -1))
  }

  const entrar = async () => {
    if (!elegido || pin.length < 3 || entrando) return
    setEntrando(true)
    setError('')
    try {
      const res = await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: elegido.nombre, pin }),
      })
      const data = await res.json()
      if (res.ok) {
        router.replace('/caja')
      } else {
        setError(data.mensaje || 'PIN incorrecto')
        setPin('')
      }
    } catch {
      setError('No se pudo conectar con el servidor local')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0b1220] via-[#0d1526] to-[#0b1a18]">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Columna izquierda: marca y selección */}
        <div className="sp-animar">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <ShoppingBasket className="h-7 w-7 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Sell-Plus</h1>
              <p className="text-xs text-slate-400">Punto de venta · v3.3.3</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-6 mb-1 text-slate-100">
            ¿Quién está en caja?
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            {elegido
              ? `Hola, ${elegido.nombre}. Escribe tu PIN para entrar.`
              : 'Elige tu nombre para comenzar.'}
          </p>

          <div className="space-y-2.5">
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setElegido(u)
                  setPin('')
                  setError('')
                }}
                className="w-full sp-panel !rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors hover:border-emerald-500/60"
                style={
                  elegido?.id === u.id
                    ? { borderColor: 'var(--sp-accent)', background: 'rgba(16,185,129,0.08)' }
                    : undefined
                }
              >
                <div className="h-10 w-10 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-emerald-400">
                  {u.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">{u.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {u.rol === 'dueno' ? 'Dueño de la tienda' : 'Empleado'}
                  </p>
                </div>
                {elegido?.id === u.id && (
                  <ArrowRight className="h-5 w-5 text-emerald-400" aria-hidden />
                )}
              </button>
            ))}
            {usuarios.length === 0 && (
              <div className="sp-panel p-5 text-sm text-slate-400">
                Cargando usuarios…
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: PIN */}
        <div className="sp-panel p-6 sp-animar">
          <div className="flex items-center justify-center gap-3 mb-5">
            {elegido ? (
              Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-emerald-400 scale-110' : 'bg-slate-600'
                  }`}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Elige tu nombre primero
              </p>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-400 mb-3 font-medium">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} className="sp-tecla" onClick={() => ponerDigito(d)} disabled={!elegido}>
                {d}
              </button>
            ))}
            <button className="sp-tecla" onClick={() => setPin('')} disabled={!elegido} aria-label="Borrar todo">
              C
            </button>
            <button className="sp-tecla" onClick={() => ponerDigito('0')} disabled={!elegido}>
              0
            </button>
            <button className="sp-tecla" onClick={borrar} disabled={!elegido} aria-label="Borrar último">
              <Delete className="h-6 w-6 mx-auto" aria-hidden />
            </button>
          </div>

          <button
            className="sp-btn sp-btn-primary w-full mt-4"
            onClick={entrar}
            disabled={!elegido || pin.length < 3 || entrando}
          >
            {entrando ? 'Entrando…' : 'Entrar a la caja'}
          </button>
        </div>
      </div>
    </main>
  )
}
