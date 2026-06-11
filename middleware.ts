import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('crm_session')
  const pathname = req.nextUrl.pathname
  const isLoginPage = pathname === '/login'

  const isPublicForm = pathname.startsWith('/apply') || pathname.startsWith('/registro')
  const isPublicApi =
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/registro') ||
    pathname.startsWith('/api/apply') ||
    pathname.startsWith('/api/upload')

  if (isLoginPage || isPublicForm || isPublicApi) return NextResponse.next()

  const isAuthenticated = !!session?.value && session.value === process.env.SESSION_SECRET

  if (!isAuthenticated) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
