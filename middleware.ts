import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('crm_session')
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApi = req.nextUrl.pathname.startsWith('/api')

  if (isApi || isLoginPage) return NextResponse.next()

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
