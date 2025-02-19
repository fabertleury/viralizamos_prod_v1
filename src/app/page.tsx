'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { 
  FaQuestionCircle, 
  FaTimes, 
  FaInstagram, 
  FaTiktok,
  FaYoutube,
  FaUser, 
  FaCog, 
  FaLock, 
  FaUnlock 
} from 'react-icons/fa';
import { FaQuoteLeft, FaQuoteRight } from 'react-icons/fa';
import { 
  FaClock, 
  FaWhatsapp, 
  FaShieldAlt, 
  FaCreditCard, 
  FaRocket 
} from 'react-icons/fa';
import { FaUsers, FaHandshake, FaChartLine, FaMoneyBillWave } from 'react-icons/fa';
import { FaTicketAlt } from 'react-icons/fa';
import './styles.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Interface para as redes sociais
interface SocialNetwork {
  id: string;
  name: string;
  slug: string;
  icon: string;
  active: boolean;
  url: string;
  icon_url?: string;
}

// Interface para Depoimentos
interface Depoimento {
  id: string;
  nome: string;
  texto: string;
  avatar?: string;
  estrelas: number;
}

// Interface para FAQs
interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// Componente de Depoimentos
const DepoimentosSection = () => {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchDepoimentos = async () => {
      const { data, error } = await supabase
        .from('depoimentos')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setDepoimentos(data);
    };

    fetchDepoimentos();
  }, []);

  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Depoimentos de Clientes</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {depoimentos.map((depoimento) => (
            <div 
              key={depoimento.id} 
              className="bg-white p-6 rounded-lg shadow-md relative"
            >
              <FaQuoteLeft className="absolute top-4 left-4 text-gray-200 text-3xl z-0" />
              <p className="text-gray-600 mb-4 italic relative z-10 pl-10">"{depoimento.texto}"</p>
              <div className="flex items-center">
                {depoimento.avatar ? (
                  <img 
                    src={depoimento.avatar} 
                    alt={depoimento.nome} 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center mr-4">
                    {depoimento.nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{depoimento.nome}</h3>
                  <div className="flex text-yellow-500">
                    {[...Array(depoimento.estrelas)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <FaQuoteRight className="absolute bottom-4 right-4 text-gray-200 text-3xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Componente de Serviços
const ServicosSection = () => {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Serviços de qualidade, Sigilo total!</h2>
          <p className="text-xl text-gray-600">Por que comprar no Viralizamos?</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
            <FaClock className="mx-auto text-4xl text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Resultados rápidos</h3>
            <p className="text-gray-600">
              Geralmente iniciamos em minutos e finalizamos em poucas horas
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
            <FaWhatsapp className="mx-auto text-4xl text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Suporte via WhatsApp</h3>
            <p className="text-gray-600">
              Suporte Online das 8h as 23h todos os dias, para dúvidas e reclamações
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
            <FaRocket className="mx-auto text-4xl text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Barato e acessível</h3>
            <p className="text-gray-600">
              Orgulhamos de nossa alta qualidade, velocidade e preços
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
            <FaShieldAlt className="mx-auto text-4xl text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pagamentos seguros</h3>
            <p className="text-gray-600">
              Temos métodos populares como MERCADO PAGO para processar seus pedidos
            </p>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <a 
            href="https://www.instagram.com/viralizamos.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#C43582] text-white px-8 py-3 rounded-full text-xl font-bold hover:bg-[#a62c6c] transition"
          >
            Clique aqui e Comece agora
          </a>
        </div>
      </div>
    </section>
  );
};

// Componente de FAQ
const FAQSection = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('active', true)
        .order('order_position', { ascending: true })
        .limit(5);

      if (data) setFaqs(data);
    };

    fetchFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              className="border-b border-gray-200 mb-4 pb-4"
            >
              <button 
                onClick={() => toggleFaq(faq.id)}
                className="w-full text-left flex justify-between items-center"
              >
                <h3 className="text-lg font-semibold">{faq.question}</h3>
                <span>{openFaq === faq.id ? '−' : '+'}</span>
              </button>
              {openFaq === faq.id && (
                <p className="mt-2 text-gray-600">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Componente de Redes Sociais
const RedesSociaisSection = () => {
  return (
    <section 
      className="py-16 text-white"
      style={{ backgroundColor: '#C43582' }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">O Poder das Redes Sociais</h2>
          <p className="text-xl">Por que aumentar seus Seguidores?</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <FaUsers className="text-4xl" />
            <p className="text-lg">Aumente a autoridade e confiança em seu perfil.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <FaChartLine className="text-4xl" />
            <p className="text-lg">Ganhe um público maior e mais diversificado.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <FaHandshake className="text-4xl" />
            <p className="text-lg">Estabeleça melhores parcerias.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <FaMoneyBillWave className="text-4xl" />
            <p className="text-lg">Monetize suas redes sociais.</p>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <a 
            href="https://www.instagram.com/viralizamos.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-[#C43582] px-8 py-3 rounded-full text-xl font-bold hover:bg-gray-100 transition"
          >
            Comece agora
          </a>
        </div>
      </div>
    </section>
  );
};

export default function HomeV3() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateMessage, setShowPrivateMessage] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timer, setTimer] = useState(300);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState({
    numero: '',
    ativo: false
  });
  const [ticketConfig, setTicketConfig] = useState({
    link: '',
    ativo: false
  });
  const supabase = createClient();

  // Função para pegar o ícone correto baseado no nome
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      FaInstagram,
      FaTiktok,
      FaYoutube
    };
    return icons[iconName] || FaInstagram;
  };

  // Buscar redes sociais cadastradas
  useEffect(() => {
    const fetchSocialNetworks = async () => {
      try {
        const { data: socialsData, error } = await supabase
          .from('socials')
          .select('*')
          .eq('active', true)
          .order('order_position');

        if (error) {
          throw error;
        }

        if (socialsData) {
          setSocialNetworks(socialsData);
        }
      } catch (error) {
        console.error('Erro ao carregar redes sociais:', error);
        toast.error('Erro ao carregar redes sociais');
      }
    };

    fetchSocialNetworks();
  }, []);

  useEffect(() => {
    const fetchConfiguracoes = async () => {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .single();

      if (data) {
        setWhatsappConfig({
          numero: data.whatsapp_numero || '',
          ativo: data.whatsapp_ativo || false
        });
        setTicketConfig({
          link: data.ticket_link || '',
          ativo: data.ticket_ativo || false
        });
      }
    };

    fetchConfiguracoes();
  }, []);

  const tutorialSteps = [
    {
      title: "Abra o Instagram",
      description: "Acesse o aplicativo do Instagram no seu celular",
      icon: FaInstagram
    },
    {
      title: "Acesse seu Perfil",
      description: "Toque no ícone do seu perfil no canto inferior direito",
      icon: FaUser
    },
    {
      title: "Menu de Configurações",
      description: "Toque no menu (três linhas) e depois em 'Configurações e privacidade'",
      icon: FaCog
    },
    {
      title: "Privacidade da Conta",
      description: "Selecione 'Privacidade da conta' nas configurações",
      icon: FaLock
    },
    {
      title: "Conta Pública",
      description: "Desative a opção 'Conta privada' para tornar seu perfil público",
      icon: FaUnlock
    }
  ];

  const handleAnalyze = async () => {
    if (!username) {
      toast.error('Digite seu @usuario');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_profiles')
        .select('*')
        .eq('username', username);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        if (profile.is_private) {
          setShowPrivateMessage(true);
          setTimer(300);
          toast.error('Perfil privado! Torne-o público para continuar.');
          setIsLoading(false);
          return;
        }

        window.location.href = `/analisar-perfil?username=${username}`;
      } else {
        toast.error('Perfil não encontrado');
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar perfil');
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    if (timer === 0) {
      setShowPrivateMessage(false);
      handleAnalyze();
    }
  };

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowTutorial(false);
      setCurrentStep(0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showPrivateMessage && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowPrivateMessage(false);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showPrivateMessage, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [configurations, setConfigurations] = useState<{[key: string]: string}>({
    whatsapp_numero: '+5562981287058',
    whatsapp_ativo: 'true',
    ticket_link: 'https://suporte.viralizamos.com',
    ticket_ativo: 'true'
  });

  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('key, value')
          .in('key', [
            'whatsapp_numero', 
            'whatsapp_ativo', 
            'ticket_link', 
            'ticket_ativo'
          ]);

        if (error) throw error;

        const configMap = data.reduce((acc, config) => {
          acc[config.key] = config.value;
          return acc;
        }, {});

        setConfigurations(prev => ({
          ...prev,
          ...configMap
        }));
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
      }
    };

    fetchConfigurations();
  }, []);

  const renderFloatingButtons = () => {
    return (
      <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-50">
        {configurations['whatsapp_ativo'] === 'true' && (
          <a 
            href={`https://wa.me/${configurations['whatsapp_numero']?.replace(/\D/g, '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-green-500 text-white p-4 rounded-full shadow-xl hover:bg-green-600 transition"
          >
            <FaWhatsapp size={24} />
          </a>
        )}
        
        {configurations['ticket_ativo'] === 'true' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={configurations['ticket_link'] || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-500 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 transition"
                >
                  <FaTicketAlt size={24} />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Abrir Ticket</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <div>
      <main className="home-v3">
        <Header />
        
        <section className="home-banner">
          <div className="container boxed">
            <div className="row align-items-center">
              <div className="col-md-6 mb-4 mb-md-0">
                <div className="area-texto">
                  <h3>ANALISE SEU PERFIL COM NOSSA INTELIGÊNCIA ARTIFICIAL DE GRAÇA</h3>
                  <h2>Descubra como melhorar seu perfil no Instagram e bombar nas redes!</h2>
                  <div className="input-group mb-3">
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Digite seu @usuario" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <button 
                      className="btn-analyze"
                      onClick={handleAnalyze}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Analisando...' : 'Analisar Agora'}
                    </button>
                  </div>
                  {showPrivateMessage && (
                    <div className="private-profile-message">
                      <div className="message-content">
                        <img src="/assets/hourglass.svg" alt="Timer" className="hourglass-icon" />
                        <p>
                          Seu perfil está privado! Torne-o público para continuar a análise.
                          <button
                            className="tutorial-button"
                            onClick={() => setShowTutorial(true)}
                          >
                            <FaQuestionCircle className="tutorial-icon" />
                            Como fazer?
                          </button>
                        </p>
                        <p>Tente novamente em: <span className="timer">{formatTime(timer)}</span></p>
                        <button 
                          className="btn-try-again"
                          onClick={handleTryAgain}
                          disabled={timer > 0}
                        >
                          {timer > 0 ? `Aguarde ${formatTime(timer)}` : 'Tentar Novamente'}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="subtitle">Análise completa e gratuita do seu perfil em segundos!</p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="hero" id="hero-ig-animation">
                  <div className="_right_pic">
                    <img alt="phone" className="phone transformY-4" width="300" src="https://fama24horas.com/assets/images/phone.svg" />
                    <img alt="icon" className="icon1 transformY-5" src="https://fama24horas.com/assets/images/icon1.svg" />
                    <div className="icon2 transformY-6">
                      <img className="icon-img" alt="icon" width="282" height="80" src="https://fama24horas.com/assets/images/icon2.svg" />
                      <ul className="_info">
                        <li className="post1">
                          <strong id="numroll1">
                            <em className="list" style={{marginTop: '-208px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <em className="list" style={{marginTop: '-156px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                          </strong>
                          <span>Posts</span>
                        </li>
                        <li className="post2">
                          <strong id="numroll3">
                            <em className="list" style={{marginTop: '-208px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <i className="comma">.</i>
                            <em className="list" style={{marginTop: '-234px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <em className="list" style={{marginTop: '-234px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <em className="list" style={{marginTop: '-156px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                          </strong>
                          <span>Seguidores</span>
                        </li>
                        <li className="post3">
                          <strong id="numroll2">
                            <em className="list" style={{marginTop: '-52px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <em className="list" style={{marginTop: '-234px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                            <em className="list" style={{marginTop: '-208px'}}><i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i></em>
                          </strong>
                          <span>Seguindo</span>
                        </li>
                      </ul>
                    </div>
                    <img alt="icon" className="icon3 transformY-7" src="https://fama24horas.com/assets/images/icon3.svg" loading="lazy" />
                    <img alt="icon" className="icon4 transformY-8" src="https://fama24horas.com/assets/images/icon4.svg" loading="lazy" />
                    <img alt="icon" className="icon5 transformY-8" src="https://fama24horas.com/assets/images/icon5.svg" loading="lazy" />
                    <img alt="icon" className="icon6 transformY-8" src="https://fama24horas.com/assets/images/icon4.svg" loading="lazy" />
                    <img alt="icon" className="icon7 transformY-8" src="https://fama24horas.com/assets/images/icon5.svg" loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
            <defs>
              <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"></path>
            </defs>
            <g className="parallax">
              <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(255,255,255,0.7)" />
              <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.5)" />
              <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(255,255,255,0.3)" />
              <use xlinkHref="#gentle-wave" x="48" y="7" fill="#fff" />
            </g>
          </svg>
        </section>

        <section className="choose-social">
          <div className="container">
            <div className="section-header">
              <h2>Compre seguidores, curtidas, comentários e muito mais...</h2>
              <p>Escolha a rede social que você deseja impulsionar</p>
            </div>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 justify-content-center">
              {socialNetworks.map((social) => (
                <div key={social.id} className="col">
                  <div className={`social-card ${social.active ? 'active' : 'disabled'}`}>
                    <div className="icon">
                      {social.icon_url ? (
                        <img src={social.icon_url} alt={social.name} className="custom-icon" />
                      ) : (
                        <FaInstagram />
                      )}
                    </div>
                    <h3>{social.name}</h3>
                    <a 
                      href={social.active ? `/${social.url}` : '#'} 
                      className="btn-choose"
                    >
                      Compre agora
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ServicosSection />
        <RedesSociaisSection />
        <DepoimentosSection />
        <FAQSection />

        {/* Tutorial Modal */}
        {showTutorial && (
          <div className="tutorial-overlay">
            <div className="tutorial-modal">
              <button className="close-tutorial" onClick={() => setShowTutorial(false)}>
                <FaTimes />
              </button>
              
              <div className="tutorial-content">
                <div className="tutorial-header">
                  <h3>Como tornar seu perfil público</h3>
                  <p className="step-indicator">
                    Passo {currentStep + 1} de {tutorialSteps.length}
                  </p>
                </div>

                <div className="tutorial-step">
                  <h4>{tutorialSteps[currentStep].title}</h4>
                  <div className="tutorial-icon-container">
                    {tutorialSteps[currentStep].icon}
                  </div>
                  <p>{tutorialSteps[currentStep].description}</p>
                </div>

                <div className="tutorial-navigation">
                  <button
                    className="nav-button prev"
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                  >
                    Anterior
                  </button>
                  <button
                    className="nav-button next"
                    onClick={handleNextStep}
                  >
                    {currentStep === tutorialSteps.length - 1 ? 'Concluir' : 'Próximo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {renderFloatingButtons()}
    </div>
  );
}
