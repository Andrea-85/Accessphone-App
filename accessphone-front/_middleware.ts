import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Capturamos la URL a la que el usuario intenta entrar
  const currentPath = request.nextUrl.pathname;

  // 2. Intentamos leer la cookie del token (en Next.js middleware se leen cookies, no localStorage)
  const token = request.cookies.get('accessphone_token')?.value;
  const userCookie = request.cookies.get('accessphone_user')?.value;

  let usuario = null;
  if (userCookie) {
    try {
      usuario = JSON.parse(userCookie);
    } catch (e) {
      // Si la cookie está corrupta, la ignoramos
    }
  }

  // 3. PROTEGER EL DASHBOARD GERENCIAL (Solo ADMIN)
  if (currentPath.startsWith('/dashboard')) {
    if (!token || !usuario || usuario.rol !== 'ADMIN') {
      // Si no es admin, lo rebotamos al login de inmediato
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4. PROTEGER EL ARQUEO DE CAJA O POS (ADMIN o VENDEDOR)
  if (currentPath.startsWith('/pos')) {
    if (!token || !usuario || (usuario.rol !== 'ADMIN' && usuario.rol !== 'VENDEDOR')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 5. PROTEGER LAS NOVEDADES DE BODEGA (Cualquiera autenticado, pero enfocado en BODEGUERO/ADMIN)
  if (currentPath.startsWith('/novedades')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Si todo está en orden, lo dejamos pasar libremente
  return NextResponse.next();
}

// Configuración para indicarle a Next.js qué rutas debe interceptar este policía
export const config = {
  matcher: ['/dashboard/:path*', '/pos/:path*', '/novedades/:path*'],
};