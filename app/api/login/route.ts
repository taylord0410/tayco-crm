import { NextRequest, NextResponse } from 'next/server'

const USERS = [
  { username: 'LISELOT', password: 'Alejandrina0720$$$' },
  { username: 'JoseA',   password: 'Alejandrina0720$$$' },
]

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const validUser = USERS.find(
    u => u.username === username && u.password === password
  )

  if (!validUser) {
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
