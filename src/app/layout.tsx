import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { headers } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Viralizai - Impulsione seu Instagram',
  description: 'Aumente seu alcance no Instagram com likes reais e seguidores engajados.',
};

async function getPathname() {
  const headersList = await headers();
  return headersList.get('x-pathname') || '/';
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = await getPathname();
  
  // Se for a rota raiz ou outras rotas públicas, não faz verificação
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/checkout')) {
    return (
      <html lang="pt-BR" suppressHydrationWarning>
        <head>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
            integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </head>
        <body className={inter.className} suppressHydrationWarning>
          <div className="min-h-screen flex flex-col w-full">
            <main className="flex-grow">{children}</main>
            <Footer />
            <Toaster richColors position="top-right" />
          </div>
        </body>
      </html>
    );
  }

  // Verificar autenticação
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen flex flex-col w-full">
          <main className="flex-grow">{children}</main>
          <Footer />
          <Toaster richColors position="top-right" />
        </div>
      </body>
    </html>
  );
}
