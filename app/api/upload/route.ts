import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File
  const name = form.get('name') as string

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  const safeName = (name || 'file').replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')

  const blob = await put(`tayco/${safeName}-${Date.now()}-${safeFileName}`, file, {
    access: 'public',
  })

  return NextResponse.json({ url: blob.url })
}
