'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, CheckCircle2 } from 'lucide-react'

interface Tienda {
  id?: string
  nombre: string
  direccion: string
  telefono: string
  moneda: string
}

export function TiendaTab() {
  const [tienda, setTienda] = useState<Tienda>({ nombre: '', direccion: '', telefono: '', moneda: 'MXN' })
  const [cargando, setCargando] = useState(true)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetch('/api/tienda')
      .then((r) => r.json())
      .then((d) => d.tienda && setTienda(d.tienda))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const guardar = async () => {
    setGuardando(true)
    await fetch('/api/tienda', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tienda),
    }).catch(() => {})
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (cargando) {
    return (
      <Card>
        <CardContent className="p-8 animate-pulse" />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-5 w-5 text-emerald-600" /> Datos de mi tienda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <div className="space-y-1">
          <Label>Nombre de la tienda</Label>
          <Input value={tienda.nombre} onChange={(e) => setTienda({ ...tienda, nombre: e.target.value })} placeholder="Mi Tienda" />
        </div>
        <div className="space-y-1">
          <Label>Dirección</Label>
          <Input value={tienda.direccion} onChange={(e) => setTienda({ ...tienda, direccion: e.target.value })} placeholder="Calle, número, ciudad" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Teléfono</Label>
            <Input value={tienda.telefono} onChange={(e) => setTienda({ ...tienda, telefono: e.target.value })} placeholder="555 123 4567" />
          </div>
          <div className="space-y-1">
            <Label>Moneda</Label>
            <Input value={tienda.moneda} onChange={(e) => setTienda({ ...tienda, moneda: e.target.value })} placeholder="MXN" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={guardar} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
          {guardado && (
            <span className="text-sm text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Guardado
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
