import { NextRequest, NextResponse } from 'next/server'

const USERS = [
  { username: process.env.AUTH_USER_1 || '', password: process.env.AUTH_PASS_1 || '' },
  { username: process.env.AUTH_USER_2 || '', password: process.env.AUTH_PASS_2 || '' },
]

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const validUser = USERS.find(
    u => u.username && u.username === username && u.password === password
  )

  if (!validUser) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const sessionSecret = process.env.SESSION_SECRET || ''

  const response = NextResponse.json({ success: true })
  response.cookies.set('crm_session', sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
