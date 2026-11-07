'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, MonitorDown, Stethoscope, Copy, CheckCircle2, Globe } from 'lucide-react'

export function HerramientasTab() {
  const [urlCentral, setUrlCentral] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setUrlCentral(window.location.origin), 0)
    return () => clearTimeout(t0)
  }, [])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlCentral)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso de portapapeles */
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorDown className="h-5 w-5 text-emerald-600" /> Acceso directo para tu escritorio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Descarga este archivo y colócalo en tu escritorio de Windows: al hacer doble clic se abrirá la Central en
            tu navegador. Así nunca pierdes el acceso.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <a href="/api/recursos/acceso-directo" download="Central-Sell-Plus.url">
                <MonitorDown className="h-4 w-4 mr-1" /> Descargar acceso directo
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Guarda el archivo en: <code>Escritorio</code>. Si Windows lo abre con el bloc de notas la primera vez,
            no pasa nada: el acceso ya está creado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-emerald-600" /> Dirección de tu Central
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-3 py-2 text-sm break-all">{urlCentral}</code>
            <Button size="sm" variant="outline" onClick={copiar}>
              {copiado ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta es la dirección que tu software Sell-Plus usa para buscar actualizaciones. Si cambia algún día,
            se avisa desde aquí y el software se entera solo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-5 w-5 text-emerald-600" /> ¿Algo falla en tu caja?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            En tu computadora, dentro de <code>C:\Sell-Plus</code>, está el archivo{' '}
            <code>diagnostico.ps1</code>. Haz clic derecho sobre él y elige «Ejecutar con PowerShell»: revisa la
            conexión, la base de datos y la comunicación con esta Central, y te dice qué revisar.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Si la caja no abre: espera 30 segundos y vuelve a intentarlo.</li>
            <li>Si una actualización se quedó a medias: ejecuta el diagnóstico y pídele ayuda a tu asistente.</li>
            <li>Tus datos están en <code>C:\Sell-Plus\resources\app\db\custom.db</code> — ese archivo nunca se borra.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
