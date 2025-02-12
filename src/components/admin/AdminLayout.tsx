import { Header } from '@/components/layout/header';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <Header />
      <main className="container mx-auto py-8">
        {children}
      </main>
    </>
  );
}
