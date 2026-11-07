import { NextRequest } from 'next/server'
import { handleCheck, corsOptions } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return handleCheck(req)
}

export async function POST(req: NextRequest) {
  return handleCheck(req)
}

export async function OPTIONS() {
  return corsOptions()
}
