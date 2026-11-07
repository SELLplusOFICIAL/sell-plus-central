'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, ShieldCheck, User as UserIcon, Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Usuario {
  id: string
  nombre: string
  rol: string
}

// «¿Quién está en caja?» — selección de usuario y PIN
export function LoginScreen({ onEntrar }: { onEntrar: (u: { id: string; nombre: string; rol: string }) => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [elegido, setElegido] = useState<Usuario | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => {
      fetch('/api/usuarios')
        .then((r) => r.json())
        .then((d) => setUsuarios((d.usuarios || []).filter((u: Usuario & { activo: boolean }) => u.activo !== false)))
        .catch(() => {})
    }, 0)
    return () => clearTimeout(t0)
  }, [])

  const pulsar = (d: string) => {
    setError('')
    if (d === 'borrar') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= 4) return
    const nuevo = pin + d
    setPin(nuevo)
    if (nuevo.length === 4 && elegido) {
      setEntrando(true)
      fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: elegido.nombre, pin: nuevo }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) onEntrar(d.usuario)
          else {
            setError(d.error || 'PIN incorrecto')
            setPin('')
          }
        })
        .catch(() => {
          setError('No se pudo conectar')
          setPin('')
        })
        .finally(() => setEntrando(false))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center text-white mb-6">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur items-center justify-center mb-3">
            <ShoppingCart className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Sell-Plus</h1>
          <p className="text-emerald-100 mt-1">¿Quién está en caja?</p>
        </div>

        {!elegido ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() => setElegido(u)}
                className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:scale-[1.02] transition-transform text-left"
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${u.rol === 'dueno' ? 'bg-emerald-100' : 'bg-sky-50'}`}>
                  {u.rol === 'dueno' ? <ShieldCheck className="h-6 w-6 text-emerald-700" /> : <UserIcon className="h-6 w-6 text-sky-600" />}
                </div>
                <div>
                  <p className="font-bold text-lg">{u.nombre}</p>
                  <p className="text-sm text-muted-foreground">{u.rol === 'dueno' ? 'Dueño de la tienda' : 'Empleado'}</p>
                </div>
              </button>
            ))}
            {!usuarios.length && (
              <div className="sm:col-span-2 bg-white rounded-2xl p-6 text-center text-muted-foreground shadow-lg">
                Cargando usuarios…
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl max-w-md mx-auto">
            <div className="text-center mb-4">
              <p className="text-lg font-bold">{elegido.nombre}</p>
              <p className="text-sm text-muted-foreground">Escribe tu PIN de 4 dígitos</p>
            </div>
            <div className="flex justify-center gap-3 mb-4" aria-label="PIN escrito">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-4 w-4 rounded-full ${pin.length > i ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              ))}
            </div>
            {error && <p className="text-center text-sm text-red-600 mb-3">{error}</p>}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <Button key={d} variant="outline" className="h-14 text-xl font-semibold" onClick={() => pulsar(d)} disabled={entrando}>
                  {d}
                </Button>
              ))}
              <Button variant="ghost" className="h-14" onClick={() => { setElegido(null); setPin(''); setError('') }}>
                Cambiar
              </Button>
              <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => pulsar('0')} disabled={entrando}>
                0
              </Button>
              <Button variant="ghost" className="h-14" onClick={() => pulsar('borrar')} disabled={entrando}>
                <Delete className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
