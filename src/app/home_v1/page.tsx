'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaTiktok, FaYoutube, FaCheck, FaShieldAlt, FaRocket, FaHeadset, FaSmile } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import './styles.css';

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  description: string;
  social: {
    id: string;
    name: string;
    icon: string;
  };
}

interface Service {
  id: string;
  name: string;
  preco: number;
  descricao: string;
  quantidade: number;
  featured: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    slug: string;
    social: {
      id: string;
      name: string;
      icon: string;
    };
  };
  checkout: {
    id: string;
    slug: string;
  };
}

interface SocialNetwork {
  id: string;
  name: string;
  icon: string;
}

export default function HomeV1() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [socialsData, setSocialsData] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Buscar categorias
      const { data: categoriesData } = await supabase
        .from('categories')
        .select(`
          *,
          social:social_id (
            id,
            name,
            icon
          )
        `)
        .eq('active', true)
        .order('order_position');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Buscar serviços em destaque
      const { data: servicesData } = await supabase
        .from('services')
        .select(`
          id,
          name,
          descricao,
          preco,
          quantidade,
          featured,
          category:categories(
            id,
            name,
            icon,
            slug,
            social:social_id(
              id,
              name,
              icon
            )
          ),
          checkout:checkout_type_id(
            id,
            slug
          )
        `)
        .eq('featured', true)
        .eq('status', true)
        .order('created_at');

      if (servicesData) {
        setFeaturedServices(servicesData);
      }

      // Buscar redes sociais
      const { data: socialsData } = await supabase
        .from('socials')
        .select('*')
        .eq('active', true)
        .order('order_position', { ascending: true });

      if (socialsData) {
        setSocialsData(socialsData);
      }

      // Buscar FAQs ativas
      const { data: faqsData } = await supabase
        .from('faqs')
        .select('*')
        .eq('active', true)
        .order('order_position');

      if (faqsData) {
        setFaqs(faqsData);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { value: '41M+', label: 'De seguidores entregues' },
    { value: '119K+', label: 'Pedidos para nossos clientes' },
    { value: '4.9', label: 'Avaliação de 52.259 clientes' }
  ];

  const features = [
    {
      icon: <FaShieldAlt className="text-2xl" />,
      title: 'Seguro e Sigiloso',
      description: 'Suas informações serão mantidas em total sigilo, respeitando sempre a política de privacidade.'
    },
    {
      icon: <FaRocket className="text-2xl" />,
      title: 'Entrega Rápida',
      description: 'Garantimos uma entrega ágil dos nossos serviços para você ver o impacto positivo rapidamente.'
    },
    {
      icon: <FaHeadset className="text-2xl" />,
      title: 'Suporte Premium',
      description: 'Nossa equipe está sempre disponível para ajudar durante todo o processo de venda e pós-venda.'
    },
    {
      icon: <FaSmile className="text-2xl" />,
      title: 'Satisfação Garantida',
      description: 'Oferecemos uma política de reembolso transparente e sem complicações.'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Escolha uma rede social',
      description: 'Selecione entre as diversas redes sociais disponíveis para impulsionar.'
    },
    {
      number: '2',
      title: 'Escolha uma métrica',
      description: 'Defina qual métrica você quer turbinar (seguidores, curtidas, etc).'
    },
    {
      number: '3',
      title: 'Conclua seu pedido',
      description: 'Preencha os campos necessários e efetue o pagamento.'
    },
    {
      number: '4',
      title: 'Aproveite a fama!',
      description: 'Relaxe e veja sua rede social sendo turbinada.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-pink-600">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-[#FF19D3] py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF19D3] to-[#FF19D3]/80"></div>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Potencialize seu Perfil nas Redes Sociais
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Alcance mais seguidores, aumente seu engajamento e destaque-se no mundo digital
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/analisar-perfil"
                className="bg-white text-[#FF19D3] px-8 py-4 rounded-full font-semibold text-lg hover:bg-opacity-90 transition-opacity"
              >
                Analisar Meu Perfil
              </Link>
              <Link
                href="/acompanhar-pedido"
                className="bg-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-colors border-2 border-white"
              >
                Acompanhar Pedido
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Por que escolher o Viralizai?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-20 bg-[#FF19D3]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Escolha sua Rede Social
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {socialsData.map((social) => (
              <Link
                key={social.id}
                href={`/${social.name.toLowerCase()}`}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24">
                    <img 
                      src={`/images/socials/${social.name.toLowerCase()}.svg`}
                      alt={social.name}
                      className="w-full h-full"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-800 group-hover:text-[#FF00CE] transition-colors">
                    {social.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-16">
            Como Funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="text-xl font-semibold mb-3 mt-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analysis Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                Análise Inteligente do seu Perfil
              </h2>
              <p className="text-xl mb-8 text-gray-600">
                Nossa IA avançada analisa seu perfil e fornece insights valiosos para maximizar seu crescimento nas redes sociais.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#FF19D3]/10 flex items-center justify-center">
                      <i className="fas fa-chart-line text-[#FF19D3] text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Análise Completa</h3>
                  </div>
                  <p className="text-gray-600">Avaliação detalhada do seu perfil com métricas importantes</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#FF19D3]/10 flex items-center justify-center">
                      <i className="fas fa-bullseye text-[#FF19D3] text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Recomendações</h3>
                  </div>
                  <p className="text-gray-600">Sugestões personalizadas baseadas no seu conteúdo</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#FF19D3]/10 flex items-center justify-center">
                      <i className="fas fa-rocket text-[#FF19D3] text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Crescimento</h3>
                  </div>
                  <p className="text-gray-600">Estratégias comprovadas para aumentar seguidores</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#FF19D3]/10 flex items-center justify-center">
                      <i className="fas fa-lightbulb text-[#FF19D3] text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Insights</h3>
                  </div>
                  <p className="text-gray-600">Dados e métricas para otimizar seu conteúdo</p>
                </div>
              </div>
              <Link 
                href="/analisar-perfil"
                className="inline-block bg-[#FF19D3] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-opacity-90 transition-opacity"
              >
                Analisar Meu Perfil Agora
              </Link>
            </div>
            <div className="flex-1">
              <div className="relative">
                <div className="absolute -inset-4">
                  <div className="w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter">
                    <div className="w-full h-full bg-gradient-to-r from-[#FF19D3] to-purple-600"></div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF19D3] to-purple-600 flex items-center justify-center">
                        <i className="fab fa-instagram text-2xl text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">@seuperfil</h3>
                        <p className="text-gray-500">Análise em Tempo Real</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Engajamento</span>
                            <span className="text-sm font-medium text-[#FF19D3]">89%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[#FF19D3] h-2 rounded-full" style={{ width: '89%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Alcance</span>
                            <span className="text-sm font-medium text-[#FF19D3]">76%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[#FF19D3] h-2 rounded-full" style={{ width: '76%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Crescimento</span>
                            <span className="text-sm font-medium text-[#FF19D3]">95%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[#FF19D3] h-2 rounded-full" style={{ width: '95%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="text-2xl font-bold text-[#FF19D3] mb-1">1.2K</div>
                          <div className="text-sm text-gray-600">Novos Seguidores</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="text-2xl font-bold text-[#FF19D3] mb-1">4.8K</div>
                          <div className="text-sm text-gray-600">Interações</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Perguntas Frequentes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Logo e Descrição */}
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Viralizai</h3>
              <p className="text-white/90 mb-6">
                Potencialize sua presença nas redes sociais com nossa plataforma inteligente.
                Alcance mais seguidores, aumente seu engajamento e destaque-se no mundo digital.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-white hover:text-[#FF19D3]">
                  <i className="fab fa-instagram text-2xl"></i>
                </a>
                <a href="#" className="text-white hover:text-[#FF19D3]">
                  <i className="fab fa-tiktok text-2xl"></i>
                </a>
                <a href="#" className="text-white hover:text-[#FF19D3]">
                  <i className="fab fa-facebook text-2xl"></i>
                </a>
              </div>
            </div>

            {/* Links Rápidos */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-white/90 hover:text-[#FF19D3]">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/analisar-perfil" className="text-white/90 hover:text-[#FF19D3]">
                    Analisar Perfil
                  </Link>
                </li>
                <li>
                  <Link href="/acompanhar-pedido" className="text-white/90 hover:text-[#FF19D3]">
                    Acompanhar Pedido
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <i className="fas fa-envelope"></i>
                  <a href="mailto:contato@viralizai.com" className="text-white/90 hover:text-[#FF19D3]">
                    contato@viralizai.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <i className="fab fa-whatsapp"></i>
                  <a href="https://wa.me/5511999999999" className="text-white/90 hover:text-[#FF19D3]">
                    (11) 99999-9999
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="text-white/90">
              {new Date().getFullYear()} Viralizai. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
