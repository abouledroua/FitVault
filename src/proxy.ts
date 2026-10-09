import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('fitvault_session')?.value;

  // Public paths that do not require authentication
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/api/auth');
  const isPublicStatic = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/uploads');

  if (isPublicStatic) {
    return NextResponse.next();
  }

  // If already authenticated and trying to access /login, redirect to dashboard
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not authenticated and accessing a protected route
  if (!sessionToken && !isAuthRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session non autorisée ou expirée' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
