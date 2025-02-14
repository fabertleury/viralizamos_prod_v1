import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Proxy para imagens do Instagram
  if (request.nextUrl.pathname.startsWith('/proxy/instagram-image')) {
    // Decodifica o caminho da imagem
    const encodedPath = request.nextUrl.pathname.replace('/proxy/instagram-image/', '');
    const imagePath = decodeURIComponent(encodedPath);

    // Lista de domínios possíveis do Instagram
    const instagramDomains = [
      'scontent-waw2-1.cdninstagram.com',
      'scontent.cdninstagram.com',
      'scontent-gru1-1.cdninstagram.com',
      'scontent-gru2-1.cdninstagram.com',
      'instagram.fmci2-1.fna.fbcdn.net',
      'instagram.fcgh2-1.fna.fbcdn.net',
      'instagram.fpoa1-1.fna.fbcdn.net'
    ];

    // Tenta buscar a imagem de diferentes domínios
    for (const domain of instagramDomains) {
      const imageUrl = `https://${domain}/${imagePath}`;

      try {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          return new NextResponse(imageBlob, {
            status: 200,
            headers: {
              'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar imagem do domínio ${domain}:`, error);
      }
    }

    // Se nenhum domínio funcionar, retorna 404
    return new NextResponse(null, { status: 404 });
  }

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
    '/proxy/instagram-image/:path*'
  ]
};