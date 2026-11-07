import { NextRequest, NextResponse } from 'next/server'
import { handleDownload } from '@/lib/download-version'
import { corsOptions } from '@/lib/central'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params
  return handleDownload(req, version)
}

export async function OPTIONS() {
  return corsOptions()
}
