'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  KeyRound,
  Copy,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Timer,
  MonitorSmartphone,
} from 'lucide-react'

type CodigoMaestro = {
  id: number
  codigo: string
  estado: string
  creadoEn: string
  expiraEn: string
  usadoEn: string | null
  equipo: string | null
  nota: string | null
}

const CLAVE_ADMIN_LS = 'central-admin-key'

function llaveAdmin(): Record<string, string> {
  try {
    const k = window.localStorage.getItem(CLAVE_ADMIN_LS)
    return k ? { 'x-central-key': k } : {}
  } catch {
    return {}
  }
}

function formatoFecha(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function minutosRestantes(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
}

const ESTADO_COLOR: Record<string, string> = {
  activo: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  usado: 'border-stone-300 bg-stone-200 text-stone-700',
  revocado: 'border-red-300 bg-red-100 text-red-700',
  expirado: 'border-amber-300 bg-amber-100 text-amber-800',
}

export default function AccesoTab() {
  const [codigos, setCodigos] = useState<CodigoMaestro[]>([])
  const [cargando, setCargando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [nota, setNota] = useState('')
  const [activo, setActivo] = useState<CodigoMaestro | null>(null)
  const [segundos, setSegundos] = useState(0)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/acceso-maestro', { cache: 'no-store', headers: llaveAdmin() })
      if (res.status === 401) {
        toast.error('Tu llave de administrador no es válida para esta sección.')
        return
      }
      if (res.ok) {
        const d = await res.json()
        setCodigos(d.codigos || [])
        const a = (d.codigos || []).find(
          (c: CodigoMaestro) => c.estado === 'activo' && new Date(c.expiraEn).getTime() > Date.now()
        )
        setActivo(a || null)
      }
    } catch {
      toast.error('No se pudo cargar el historial de códigos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 30_000)
    return () => clearInterval(t)
  }, [cargar])

  // Cuenta regresiva del código activo
  useEffect(() => {
    if (!activo) {
      setSegundos(0)
      return
    }
    const tick = () => {
      const falta = Math.max(0, Math.floor((new Date(activo.expiraEn).getTime() - Date.now()) / 1000))
      setSegundos(falta)
      if (falta === 0) cargar()
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [activo, cargar])

  const generar = async () => {
    setGenerando(true)
    try {
      const res = await fetch('/api/acceso-maestro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...llaveAdmin() },
        body: JSON.stringify({ minutos: 15, nota: nota.trim() || undefined }),
      })
      const d = await res.json().catch(() => null)
      if (res.ok && d?.ok) {
        toast.success('Código maestro generado. Vence en 15 minutos y sirve una sola vez.')
        setNota('')
        await cargar()
      } else {
        toast.error(d?.detalle || d?.error || 'No se pudo generar el código.')
      }
    } catch {
      toast.error('No se pudo generar el código.')
    } finally {
      setGenerando(false)
    }
  }

  const revocar = async (id: number) => {
    try {
      const res = await fetch('/api/acceso-maestro', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...llaveAdmin() },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('Código revocado. Ya no podrá usarse.')
        await cargar()
      } else {
        toast.error('No se pudo revocar el código.')
      }
    } catch {
      toast.error('No se pudo revocar el código.')
    }
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Código copiado al portapapeles.')
    } catch {
      toast.error('No se pudo copiar; selecciónalo a mano.')
    }
  }

  const mmss = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`

  return (
    <div className="space-y-4">
      {/* Tarjeta principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-800" aria-hidden />
            Acceso maestro
          </CardTitle>
          <CardDescription>
            Recupera el acceso a cualquier caja con Sell-Plus cuando se olvidaron todas las claves.
            Genera un código aquí y escríbelo en el POS: pantalla de inicio de sesión → «Acceso maestro».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="nota-maestro">
                Nota opcional para tu bitácora (p. ej. «Caja 1, se olvidó el PIN»)
              </label>
              <Input
                id="nota-maestro"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={140}
                placeholder="Opcional…"
              />
            </div>
            <Button onClick={generar} disabled={generando} className="bg-emerald-900 hover:bg-emerald-800">
              <KeyRound className="mr-1 h-4 w-4" aria-hidden />
              {generando ? 'Generando…' : 'Generar código maestro'}
            </Button>
          </div>

          {activo && (
            <div className="rounded-xl border-2 border-emerald-700 bg-gradient-to-br from-emerald-50 to-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  <Timer className="h-4 w-4" aria-hidden /> Código vigente — expira en {mmss}
                </span>
                <Badge className={ESTADO_COLOR.activo}>un solo uso</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="select-all rounded-lg border border-emerald-200 bg-white px-4 py-2 font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900">
                  {activo.codigo}
                </code>
                <Button size="sm" variant="outline" onClick={() => copiar(activo.codigo)}>
                  <Copy className="mr-1 h-3.5 w-3.5" aria-hidden /> Copiar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => revocar(activo.id)}>
                  <Ban className="mr-1 h-3.5 w-3.5" aria-hidden /> Revocar
                </Button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-600">
                En la caja: abre Sell-Plus y, en la pantalla de inicio de sesión, pulsa <b>«Acceso maestro»</b> y
                escribe este código. Desde ahí podrás <b>cambiar la contraseña del administrador</b> y entrar
                conservando los datos, o <b>resetear el programa</b> y empezar de cero. El código muere al usarse
                o al expirar: nunca deja una puerta abierta.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Esta sección está protegida por tu llave de administrador de la Central. Cada generación y cada uso
                queda registrado en la bitácora del sistema. Si generas un código por error, revócalo aquí mismo.
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-stone-500" aria-hidden /> Últimos códigos
            </span>
            <Button size="sm" variant="ghost" onClick={cargar} disabled={cargando}>
              <RefreshCw className={'mr-1 h-3.5 w-3.5' + (cargando ? ' animate-spin' : '')} aria-hidden /> Actualizar
            </Button>
          </CardTitle>
          <CardDescription>Los 25 códigos más recientes, con su estado y el equipo que los usó.</CardDescription>
        </CardHeader>
        <CardContent>
          {codigos.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500">
              Todavía no has generado códigos maestros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-stone-400">
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Creado</th>
                    <th className="py-2 pr-3 font-medium">Vence</th>
                    <th className="py-2 pr-3 font-medium">Usado</th>
                    <th className="py-2 pr-3 font-medium">Equipo</th>
                    <th className="py-2 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {codigos.map((c) => (
                    <tr key={c.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs font-semibold text-stone-800">{c.codigo}</td>
                      <td className="py-2 pr-3">
                        <Badge className={(ESTADO_COLOR[c.estado] || '') + ' border'}>
                          {c.estado === 'usado' && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />}
                          {c.estado}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-stone-600">{formatoFecha(c.creadoEn)}</td>
                      <td className="py-2 pr-3 text-xs text-stone-600">
                        {formatoFecha(c.expiraEn)}
                        {c.estado === 'activo' && (
                          <span className="ml-1 text-[11px] text-emerald-700">({minutosRestantes(c.expiraEn)} min)</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-stone-600">{formatoFecha(c.usadoEn)}</td>
                      <td className="py-2 pr-3 text-xs text-stone-600">{c.equipo || '—'}</td>
                      <td className="py-2 text-xs text-stone-500">{c.nota || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
