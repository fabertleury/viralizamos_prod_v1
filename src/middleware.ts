import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Adiciona o pathname aos headers para uso no layout
  res.headers.set('x-pathname', request.nextUrl.pathname);
  
  // Se for a rota raiz ou rotas públicas, permite o acesso
  if (request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.pathname.startsWith('/servicos')) {
    return res;
  }

  // Para outras rotas, verifica autenticação
  const supabase = createMiddlewareClient({ req: request, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Se não houver sessão e for uma rota protegida, redireciona para login
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/cliente/:path*',
    '/suporte/:path*',
  ]
};