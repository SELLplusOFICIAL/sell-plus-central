/**
 * Repara filas de Version con datos de archivo perdidos (p. ej. 3.2.0 con
 * fileName/fileSize en NULL tras los incidentes del entorno).
 * - Si falta fileName: busca el instalador por número de versión en la
 *   carpeta canónica /home/z/my-project/central-files/updates.
 * - Si falta sha256: calcula la huella real del archivo en disco.
 * Idempotente: solo rellena lo que falta.
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createHash } from 'crypto'

const prisma = new PrismaClient()
const UPDATES_DIR = '/home/z/my-project/central-files/updates'

function sha256Archivo(ruta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const s = fs.createReadStream(ruta)
    s.on('data', (d) => hash.update(d))
    s.on('end', () => resolve(hash.digest('hex')))
    s.on('error', reject)
  })
}

async function main() {
  const versiones = await prisma.version.findMany({ orderBy: { id: 'asc' } })
  for (const v of versiones) {
    let cambios: string[] = []
    let fileName = v.fileName
    let fileSize = v.fileSize

    if (!fileName) {
      const candidatos = fs
        .readdirSync(UPDATES_DIR)
        .filter((f) => f.includes(v.version) && f.toLowerCase().endsWith('.exe'))
      if (candidatos.length) {
        fileName = candidatos[0]
        cambios.push(`fileName=${fileName}`)
      } else {
        console.log(`${v.version}: SIN archivo en disco, se deja como está`)
        continue
      }
    }

    const ruta = path.join(UPDATES_DIR, path.basename(fileName))
    if (!fs.existsSync(ruta)) {
      console.log(`${v.version}: fileName apunta a archivo inexistente (${fileName})`)
      continue
    }

    if (!fileSize) {
      fileSize = fs.statSync(ruta).size
      cambios.push(`fileSize=${fileSize}`)
    }

    let sha256 = v.sha256
    if (!sha256) {
      sha256 = await sha256Archivo(ruta)
      cambios.push(`sha256=${sha256.slice(0, 12)}…`)
    }

    if (cambios.length) {
      await prisma.version.update({
        where: { id: v.id },
        data: { fileName, fileSize, sha256 },
      })
      console.log(`${v.version}: reparado → ${cambios.join(', ')}`)
    } else {
      console.log(`${v.version}: completo, sin cambios`)
    }
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
