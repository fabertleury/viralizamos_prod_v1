'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SocialIcon } from '@/components/ui/social-icon';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrazilFlag, USAFlag, SpainFlag } from '@/components/ui/flags';
import { FaLanguage } from 'react-icons/fa';

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
  const [isSticky, setIsSticky] = useState(false);
  const supabase = useSupabase();
  const { language, translations, changeLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsSticky(scrollPosition > 100); // Fica sticky após 100px de rolagem
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const renderLanguageSelector = () => {
    const languages = [
      { code: 'pt', flag: <BrazilFlag />, name: 'Português' },
      { code: 'en', flag: <USAFlag />, name: 'English' },
      { code: 'es', flag: <SpainFlag />, name: 'Español' }
    ];

    return (
      <div className="flex space-x-2 ml-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code as any)}
            className={`
              p-1 rounded-full transition-all duration-300 
              ${language === lang.code 
                ? 'bg-[#FF00CE] text-white scale-110' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
            title={lang.name}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  };

  const languageFlags = [
    { code: 'pt-BR', name: 'Português', flag: '/images/flags/brasil.png' },
    { code: 'es', name: 'Español', flag: '/images/flags/espanha.png' },
    { code: 'en', name: 'English', flag: '/images/flags/estados-unidos.png' }
  ];

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const toggleLanguageMenu = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  return (
    <header 
      className={`
        bg-white border-b transition-all duration-300 z-[9999]
        ${isSticky 
          ? 'fixed top-0 left-0 right-0 shadow-md animate-slide-down' 
          : 'relative'
        }
      `}
    >
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
              {translations.header.home}
            </Link>
            
            {/* Social Networks */}
            {socialNetworks.map((social) => (
              <Link
                key={social.id}
                href={social.url}
                className="text-gray-800 hover:text-[#FF00CE] transition-colors"
              >
                <span>{social.name}</span>
              </Link>
            ))}
            
            {/* Action Buttons */}
            <Button asChild variant="ghost" className="font-medium bg-[#C43582] text-white hover:bg-[#a62c6c]">
              <Link href="/analisar-perfil">
                {translations.header.analyzeProfile}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="font-medium bg-[#C43582] text-white hover:bg-[#a62c6c]">
              <Link href="/acompanhar-pedido">
                {translations.header.trackOrder}
              </Link>
            </Button>
            
            {/* Tickets - só aparece se logado */}
            {isLoggedIn && (
              <div className="relative group">
                <Button asChild variant="ghost" className="font-medium bg-[#C43582] text-white hover:bg-[#a62c6c]">
                  <Link href="/tickets">
                    {translations.header.tickets}
                  </Link>
                </Button>
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs animate-bounce">
                  1
                </div>
              </div>
            )}

            {/* Seletores de Idioma */}
            {renderLanguageSelector()}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 z-50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Navigation */}
            {isMenuOpen && (
              <div className="fixed inset-0 bg-white z-40 md:hidden">
                <div className="container mx-auto px-4 py-8">
                  <div className="flex flex-col space-y-4">
                    <Link href="/" className="text-gray-700 hover:text-primary">
                      {translations.header.home}
                    </Link>
                    
                    {socialNetworks.map((social) => (
                      <Link
                        key={social.id}
                        href={social.url}
                        className="text-gray-800 hover:text-[#FF00CE] transition-colors"
                      >
                        <span>{translations.header.servicesFor} {social.name}</span>
                      </Link>
                    ))}
                    
                    <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
                      <Link href="/analisar-perfil">
                        {translations.header.analyzeProfile}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
                      <Link href="/acompanhar-pedido">
                        {translations.header.trackOrder}
                      </Link>
                    </Button>
                    
                    {isLoggedIn && (
                      <Button asChild variant="ghost" className="font-medium bg-[#FF00CE] text-white hover:bg-[#FF00CE]/90">
                        <Link href="/tickets">
                          {translations.header.tickets}
                        </Link>
                      </Button>
                    )}

                    {/* Seletores de Idioma no Menu Mobile */}
                    <div className="flex space-x-2">
                      {renderLanguageSelector()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
