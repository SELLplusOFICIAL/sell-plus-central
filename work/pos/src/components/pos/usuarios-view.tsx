'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShieldCheck, User as UserIcon, Plus, KeyRound, UserX, UserCheck, Trash2 } from 'lucide-react'

interface Usuario {
  id: string
  nombre: string
  rol: string
  activo: boolean
}

export function UsuariosView({ usuarioActual }: { usuarioActual: { id: string; nombre: string } }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ nombre: '', pin: '', rol: 'empleado' })
  const [cambiarPin, setCambiarPin] = useState<Usuario | null>(null)
  const [nuevoPin, setNuevoPin] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = () =>
    fetch('/api/usuarios')
      .then((r) => r.json())
      .then((d) => setUsuarios(d.usuarios || []))
      .catch(() => {})

  useEffect(() => {
    const t0 = setTimeout(cargar, 0)
    return () => clearTimeout(t0)
  }, [])

  const crear = async () => {
    setGuardando(true)
    try {
      const d = await (await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })).json()
      if (d.ok) {
        setAbierto(false)
        setForm({ nombre: '', pin: '', rol: 'empleado' })
        cargar()
      }
    } finally {
      setGuardando(false)
    }
  }

  const editar = async (u: Usuario, datos: Record<string, unknown>) => {
    await fetch(`/api/usuarios/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
    cargar()
  }

  const eliminar = async (u: Usuario) => {
    await fetch(`/api/usuarios/${u.id}`, { method: 'DELETE' })
    cargar()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Personas que pueden abrir la caja con su PIN.</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4 mr-1" /> Agregar persona
        </Button>
      </div>

      {usuarios.map((u) => (
        <div key={u.id} className="rounded-xl border bg-white p-4 flex flex-wrap items-center gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${u.rol === 'dueno' ? 'bg-emerald-100' : 'bg-sky-50'}`}>
            {u.rol === 'dueno' ? <ShieldCheck className="h-5.5 w-5.5 text-emerald-700" /> : <UserIcon className="h-5.5 w-5.5 text-sky-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold flex items-center gap-2">
              {u.nombre}
              <Badge variant="secondary" className="text-[10px]">{u.rol === 'dueno' ? 'Dueño' : 'Empleado'}</Badge>
              {!u.activo && <Badge className="bg-gray-100 text-gray-500 text-[10px]">Inactiva</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">PIN: ••••</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => { setCambiarPin(u); setNuevoPin('') }}>
              <KeyRound className="h-3.5 w-3.5" /> Cambiar PIN
            </Button>
            {u.id !== usuarioActual.id && (
              <>
                <Button size="sm" variant="outline" onClick={() => editar(u, { activo: !u.activo })}>
                  {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Button>
                {u.rol !== 'dueno' && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => eliminar(u)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Carlos" />
            </div>
            <div className="space-y-1">
              <Label>PIN de 4 dígitos</Label>
              <Input inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} placeholder="1234" />
            </div>
            <div className="flex gap-2">
              {(['empleado', 'dueno'] as const).map((r) => (
                <Button key={r} size="sm" variant={form.rol === r ? 'default' : 'outline'} className={form.rol === r ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => setForm({ ...form, rol: r })}>
                  {r === 'dueno' ? 'Dueño' : 'Empleado'}
                </Button>
              ))}
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={crear} disabled={guardando || !form.nombre.trim() || form.pin.length !== 4}>
              {guardando ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cambiarPin} onOpenChange={(o) => !o && setCambiarPin(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar PIN de {cambiarPin?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nuevo PIN de 4 dígitos</Label>
              <Input inputMode="numeric" maxLength={4} value={nuevoPin} onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ''))} placeholder="0000" />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={nuevoPin.length !== 4}
              onClick={async () => {
                if (!cambiarPin) return
                await editar(cambiarPin, { pin: nuevoPin })
                setCambiarPin(null)
              }}
            >
              Guardar PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
