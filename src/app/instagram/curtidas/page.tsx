import { Metadata } from 'next';
import { LikesPackages } from '@/components/instagram/curtidas/LikesPackages';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'Comprar Curtidas Instagram | Viralizai',
  description: 'Compre curtidas brasileiras ou mundiais para seus posts do Instagram de forma segura e rápida.',
};

export default function CurtidasPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <LikesPackages />
    </main>
  );
}
