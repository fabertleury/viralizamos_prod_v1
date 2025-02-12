'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SocialIcon } from '@/components/ui/social-icon';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { Menu, X } from 'lucide-react';

interface Social {
  id: string;
  name: string;
  icon: string;
  url: string;
  slug: string;
  active: boolean;
  order_position: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  url: string;
  social?: Social;
  social_id?: string;
  order_position: number;
  active: boolean;
}

export function Header() {
  const [socialNetworks, setSocialNetworks] = useState<Social[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = useSupabase();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verificar se usuário está logado
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);

        // Buscar redes sociais ativas
        const { data: socialsData } = await supabase
          .from('socials')
          .select('*')
          .eq('active', true)
          .order('order_position', { ascending: true });

        if (socialsData) {
          setSocialNetworks(socialsData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    fetchData();
  }, [supabase]);

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.webp"
              alt="Viralizai"
              width={150}
              height={50}
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-primary">
              Home
            </Link>
            
            {/* Social Networks */}
            {socialNetworks.map((social) => (
              <Link
                key={social.id}
                href={`/${social.name.toLowerCase()}`}
                className="text-gray-800 hover:text-[#FF00CE] transition-colors"
              >
                <span>{social.name}</span>
              </Link>
            ))}
            
            {/* Action Buttons */}
            <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
              <Link href="/analisar-perfil">
                Analisar Perfil
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
              <Link href="/acompanhar-pedido">
                Acompanhar Pedido
              </Link>
            </Button>
            
            {/* Tickets - só aparece se logado */}
            {isLoggedIn && (
              <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
                <Link href="/tickets">
                  Tickets
                </Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-lg z-50 transform transition-transform md:hidden">
            <div className="p-4">
              <button
                className="absolute top-4 right-4"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={24} />
              </button>

              <nav className="flex flex-col gap-4 mt-12">
                <Link
                  href="/"
                  className="text-gray-700 hover:text-primary py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                
                {/* Social Networks */}
                {socialNetworks.map((social) => (
                  <Link
                    key={social.id}
                    href={`/${social.name.toLowerCase()}`}
                    className="text-gray-800 hover:text-[#FF00CE] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>{social.name}</span>
                  </Link>
                ))}
                
                {/* Action Buttons */}
                <Link
                  href="/analisar-perfil"
                  className="bg-[#FF00CE] text-white py-2 px-4 rounded-lg hover:bg-[#FF00CE]/90 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Analisar Perfil
                </Link>
                <Link
                  href="/acompanhar-pedido"
                  className="bg-[#FF00CE] text-white py-2 px-4 rounded-lg hover:bg-[#FF00CE]/90 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Acompanhar Pedido
                </Link>
                
                {/* Tickets - só aparece se logado */}
                {isLoggedIn && (
                  <Link
                    href="/tickets"
                    className="bg-[#FF00CE] text-white py-2 px-4 rounded-lg hover:bg-[#FF00CE]/90 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Tickets
                  </Link>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
