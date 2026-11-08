'use client'

import { useEffect, useState } from 'react'
import { Copy, CheckCircle2, XCircle, Loader2, ShieldCheck, Wifi, FolderOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResumenData, CENTRAL_URL, centralUrlActual, haceCuando } from '@/lib/types'
import { toast } from 'sonner'

type EstadoPrueba = 'inactiva' | 'probando' | 'ok' | 'error'

export default function DiagnosticoTab({ resumen }: { resumen: ResumenData | null }) {
  const [estado, setEstado] = useState<EstadoPrueba>('inactiva')
  const [detalle, setDetalle] = useState<string>('')
  const [copiado, setCopiado] = useState(false)
  const [urlCentral, setUrlCentral] = useState<string>(CENTRAL_URL)

  useEffect(() => {
    setUrlCentral(centralUrlActual())
  }, [])

  const probar = async () => {
    setEstado('probando')
    setDetalle('')
    try {
      const res = await fetch(`/api/health?ts=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setEstado('ok')
        setDetalle(
          `La Central respondió correctamente a las ${new Date(data.hora).toLocaleTimeString(
            'es-MX'
          )} · Última versión publicada: v${data.ultimaVersion ?? '—'}`
        )
      } else {
        setEstado('error')
        setDetalle(`La Central respondió con código ${res.status}.`)
      }
    } catch {
      setEstado('error')
      setDetalle('No hubo respuesta del servidor. Si el sitio temporal está apagado, escríbeme en el chat y lo enciendo.')
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlCentral)
      setCopiado(true)
      toast.success('Dirección copiada')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('No se pudo copiar automáticamente; selecciona el texto y cópialo.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Prueba de conexión */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <Wifi className="h-5 w-5 text-emerald-700" aria-hidden />
            Probar la conexión ahora
          </CardTitle>
          <p className="text-xs text-stone-500">
            Comprueba que esta Central responde, igual que lo hace tu software automáticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={probar}
            disabled={estado === 'probando'}
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            {estado === 'probando' ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                Probando…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden />
                Probar conexión
              </>
            )}
          </Button>
          {estado === 'ok' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden />
              <p className="text-sm text-emerald-900">{detalle}</p>
            </div>
          )}
          {estado === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden />
              <p className="text-sm text-red-900">{detalle}</p>
            </div>
          )}
          {resumen?.ultimaConexion && (
            <p className="text-xs text-stone-500">
              Última conexión recibida de tu software: {haceCuando(resumen.ultimaConexion.fecha)} —{' '}
              <span className="text-stone-400">“{resumen.ultimaConexion.detalle}”</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <FolderOpen className="h-5 w-5 text-emerald-700" aria-hidden />
            La dirección de tu Central
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 p-2.5">
            <code className="text-xs sm:text-sm font-mono text-stone-700 break-all flex-1 select-all">
              {urlCentral}
            </code>
            <Button variant="outline" size="sm" onClick={copiar} className="shrink-0 border-stone-300">
              {copiado ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
            </Button>
          </div>
          <p className="text-xs text-stone-500">
            Esta misma dirección vive en dos lugares: en el acceso directo de tu escritorio y dentro
            de tu software, en el archivo{' '}
            <code className="font-mono text-[11px] bg-stone-100 px-1 rounded">
              C:\Sell-Plus\resources\app\db\central-url.txt
            </code>
            . Por eso tu PC ya sabe dónde buscar actualizaciones.
          </p>
        </CardContent>
      </Card>

      {/* Qué hacer si no abre */}
      <Card className="shadow-sm border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <XCircle className="h-5 w-5 text-amber-600" aria-hidden />
            Si algún día el sitio no abre
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-900 space-y-2">
          <p>
            Estamos en la fase de <strong>sitio temporal</strong>: vive en mi entorno de trabajo y
            puede apagarse cuando no estoy activamente conectado. Es normal en esta etapa.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Espera unos minutos y vuelve a intentar (yo mismo la re-enciendo al start de cada sesión).</li>
            <li>Escríbeme en el chat: “enciende la central” y en un par de minutos vuelve a estar en línea.</li>
            <li>
              Tu software <strong>no se afecta</strong>: sigue vendiendo y trabajando normal, y
              reintenta la conexión solo.
            </li>
          </ol>
          <p className="text-xs text-amber-700">
            Siguiente paso del proyecto: mudarla a hosting permanente (Vercel) para que esté en
            línea 24/7 y este aviso desaparezca para siempre.
          </p>
        </CardContent>
      </Card>

      {/* Cómo se ve un chequeo por dentro */}
      <Card className="shadow-sm border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-stone-800">
            <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            Para curiosos: el chequeo por dentro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-stone-600">
            Tu software pregunta aquí (es la petición que aparece en mi bitácora):
          </p>
          <code className="block text-xs font-mono bg-stone-900 text-emerald-200 rounded-lg p-3 overflow-x-auto">
            GET {urlCentral}/api/updates/check?version=3.2.0
          </code>
          <p className="text-sm text-stone-600">
            Si tu versión es menor que la publicada, la Central responde{' '}
            <Badge variant="secondary" className="font-mono text-[10px]">hasUpdate: true</Badge> con
            el enlace de descarga y su huella SHA-256; si estás al día, responde{' '}
            <Badge variant="secondary" className="font-mono text-[10px]">hasUpdate: false</Badge>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
