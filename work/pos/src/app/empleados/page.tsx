'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, UserPlus, Check, X, KeyRound } from 'lucide-react'
import Shell from '@/components/pos/shell'
import { fechaCorta } from '@/lib/util'

type Usuario = {
  id: string
  nombre: string
  rol: string
  activo: boolean
  createdAt: string
}

export default function EmpleadosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [rol, setRol] = useState('empleado')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [cambiarPinDe, setCambiarPinDe] = useState<Usuario | null>(null)
  const [pinNuevo, setPinNuevo] = useState('')

  const cargar = useCallback(async () => {
    const res = await fetch('/api/usuarios', { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setUsuarios(d.usuarios)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(cargar, 100)
    return () => clearTimeout(t)
  }, [cargar])

  const notificar = (tipo: 'ok' | 'error', texto: string) => {
    setAviso({ tipo, texto })
    setTimeout(() => setAviso(null), 3500)
  }

  const crear = async () => {
    if (!nombre.trim() || !/^\d{4}$/.test(pin)) {
      notificar('error', 'Nombre y PIN de 4 dígitos son obligatorios')
      return
    }
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, pin, rol }),
    })
    const d = await res.json()
    if (res.ok) {
      notificar('ok', `Usuario "${nombre}" creado`)
      setNombre('')
      setPin('')
      setRol('empleado')
      cargar()
    } else {
      notificar('error', d.mensaje || 'No se pudo crear')
    }
  }

  const alternarActivo = async (u: Usuario) => {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !u.activo }),
    })
    if (res.ok) {
      notificar('ok', u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`)
      cargar()
    }
  }

  const guardarPin = async () => {
    if (!cambiarPinDe) return
    if (!/^\d{4}$/.test(pinNuevo)) {
      notificar('error', 'El PIN debe ser de 4 dígitos')
      return
    }
    const res = await fetch(`/api/usuarios/${cambiarPinDe.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinNuevo }),
    })
    if (res.ok) {
      notificar('ok', `PIN de ${cambiarPinDe.nombre} actualizado`)
      setCambiarPinDe(null)
      setPinNuevo('')
    }
  }

  return (
    <Shell>
      <h1 className="text-xl font-extrabold flex items-center gap-2 mb-1">
        <Users className="h-6 w-6 text-emerald-400" aria-hidden />
        Empleados y accesos
      </h1>
      <p className="text-xs text-slate-400 mb-4">
        Cada persona entra a la caja con su nombre y su PIN de 4 dígitos.
      </p>

      {aviso && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold mb-4 ${
            aviso.tipo === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-red-500/15 border-red-500/50 text-red-300'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-2.5">
          {usuarios === null && <div className="sp-panel p-6 text-slate-500 text-sm">Cargando…</div>}
          {usuarios?.map((u) => (
            <div key={u.id} className="sp-panel p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-emerald-400 text-lg">
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">
                  {u.nombre}{' '}
                  {u.rol === 'dueno' ? (
                    <span className="sp-badge sp-badge-ok ml-1">dueño</span>
                  ) : (
                    <span className="sp-badge sp-badge-muted ml-1">empleado</span>
                  )}
                  {!u.activo && <span className="sp-badge sp-badge-danger ml-1">inactivo</span>}
                </p>
                <p className="text-[11px] text-slate-500">desde {fechaCorta(u.createdAt)}</p>
              </div>
              <button
                className="sp-btn sp-btn-ghost !min-h-[36px] !py-1 !px-2.5 !text-[13px]"
                onClick={() => { setCambiarPinDe(u); setPinNuevo('') }}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> PIN
              </button>
              {u.rol !== 'dueno' && (
                <button
                  className={`sp-btn !min-h-[36px] !py-1 !px-2.5 !text-[13px] ${u.activo ? 'sp-btn-danger' : 'sp-btn-primary'}`}
                  onClick={() => alternarActivo(u)}
                >
                  {u.activo ? <><X className="h-3.5 w-3.5" aria-hidden /> Desactivar</> : <><Check className="h-3.5 w-3.5" aria-hidden /> Activar</>}
                </button>
              )}
            </div>
          ))}
        </div>

        <aside className="sp-panel p-5 h-fit">
          <h2 className="font-bold flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-emerald-400" aria-hidden /> Agregar persona
          </h2>
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              Nombre
              <input className="sp-input mt-1" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Carlos" />
            </label>
            <label className="block text-xs font-semibold text-slate-400">
              PIN (4 dígitos)
              <input
                className="sp-input mt-1 !tracking-[0.4em] text-center !text-lg"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="····"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-400">
              Rol
              <select className="sp-input mt-1" value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="empleado">Empleado (caja e inventarios)</option>
                <option value="dueno">Dueño (todo, incl. administración)</option>
              </select>
            </label>
            <button className="sp-btn sp-btn-primary w-full" onClick={crear}>Crear usuario</button>
          </div>
        </aside>
      </div>

      {cambiarPinDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Cambiar PIN">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCambiarPinDe(null)} />
          <div className="relative sp-panel p-6 w-full max-w-sm sp-animar">
            <h2 className="font-extrabold mb-1">Cambiar PIN de {cambiarPinDe.nombre}</h2>
            <p className="text-xs text-slate-400 mb-4">Escribe el nuevo PIN de 4 dígitos.</p>
            <input
              className="sp-input !tracking-[0.4em] text-center !text-xl"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ''))}
              placeholder="····"
            />
            <div className="flex gap-2 mt-4">
              <button className="sp-btn sp-btn-primary flex-1" onClick={guardarPin}>Guardar</button>
              <button className="sp-btn sp-btn-ghost" onClick={() => setCambiarPinDe(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
