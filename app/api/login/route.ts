import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const correctUsername = process.env.CRM_USERNAME || 'LISELOT'
  const correctPassword = process.env.CRM_PASSWORD || 'Alejandrina0720$$$'

  if (username !== correctUsername || password !== correctPassword) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('crm_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
