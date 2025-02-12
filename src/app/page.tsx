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
import './styles.css';

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

// Hook personalizado para gerenciar cooldown
const useCooldown = (key: string, cooldownTime: number = 5 * 60 * 1000) => {
  const [canTry, setCanTry] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const checkCooldown = () => {
      const lastAttempt = localStorage.getItem(key);
      if (lastAttempt) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt, 10);
        
        if (timeSinceLastAttempt < cooldownTime) {
          setCanTry(false);
          const remainingSeconds = Math.ceil((cooldownTime - timeSinceLastAttempt) / 1000);
          setRemainingTime(remainingSeconds);

          const timer = setInterval(() => {
            const updatedRemainingSeconds = Math.ceil((cooldownTime - (Date.now() - parseInt(lastAttempt, 10))) / 1000);
            setRemainingTime(updatedRemainingSeconds);

            if (updatedRemainingSeconds <= 0) {
              setCanTry(true);
              clearInterval(timer);
            }
          }, 1000);

          return () => clearInterval(timer);
        } else {
          setCanTry(true);
        }
      }
    };

    checkCooldown();
  }, [key, cooldownTime]);

  const startCooldown = () => {
    localStorage.setItem(key, Date.now().toString());
    setCanTry(false);
    setRemainingTime(cooldownTime / 1000);
  };

  return { canTry, remainingTime, startCooldown };
};

export default function HomeV3() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateMessage, setShowPrivateMessage] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
  const supabase = createClient();

  const { 
    canTry: canTryAgain, 
    remainingTime, 
    startCooldown 
  } = useCooldown('instagram-profile-check', 5 * 60 * 1000); // 5 minutos

  // Função para pegar o ícone correto baseado no nome
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      FaInstagram,
      FaTiktok,
      FaYoutube
    };
    return icons[iconName] || FaInstagram;
  };

  // Função para validar username do Instagram
  const validateInstagramUsername = (username: string): boolean => {
    // Regex para validar username do Instagram:
    // - Começa com letra ou número
    // - Pode conter letras, números, pontos e underscores
    // - 1 a 30 caracteres
    const instagramUsernameRegex = /^[a-zA-Z0-9](?!.*\.\.|.*\.$)(?!.*\.{2,})[a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$/;
    return instagramUsernameRegex.test(username);
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

  const handleUsernameChange = (e) => {
    const value = e.target.value.replace('@', '').trim();
    setUsername(value);

    // Se o usuário digitou algo, iniciar busca imediatamente
    if (!validateInstagramUsername(value)) {
      if (value.length > 0) {
        toast.error('Username inválido. Use apenas letras, números, pontos e underscores.');
      }
      setSearchResults(null);
      setShowPrivateMessage(false);
      return;
    }

    // Se o usuário digitou algo, iniciar busca imediatamente
    if (value.length > 2) {
      const fetchProfile = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/instagram?username=${value}`);
          const data = await response.json();

          if (data.error) {
            toast.error(data.error);
            setSearchResults(null);
            return;
          }

          if (data.isPrivate) {
            setShowPrivateMessage(true);
            toast.warning('Perfil privado detectado');
          } else {
            setShowPrivateMessage(false);
            toast.success('Perfil público encontrado');
          }

          setSearchResults(data);
        } catch (error) {
          console.error('Erro na busca:', error);
          setSearchResults(null);
          toast.error('Erro ao buscar perfil');
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    } else {
      setSearchResults(null);
      setShowPrivateMessage(false);
    }
  };

  const handleAnalyze = async () => {
    if (!username) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();

      if (data.isPrivate) {
        setShowPrivateMessage(true);
      } else {
        // Lógica para análise do perfil público
        toast.success(`Perfil de ${data.fullName} encontrado!`);
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    if (!canTryAgain) {
      toast.warning(`Aguarde ${formatTime(remainingTime)} antes de tentar novamente`);
      return;
    }
    
    // Lógica para tentar novamente
    setShowPrivateMessage(false);
    startCooldown(); // Inicia o cooldown
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
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
                      onChange={handleUsernameChange}
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
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 rounded-lg flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      <FaLock className="text-yellow-600 text-2xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-yellow-700 font-semibold">
                        Seu perfil está privado. Para continuar a análise, torne-o público.
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <button
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          onClick={() => setShowTutorial(true)}
                        >
                          <FaQuestionCircle className="mr-2" /> Ver Tutorial
                        </button>
                        
                        {!canTryAgain && (
                          <div className="text-yellow-800 text-sm">
                            Próxima tentativa em: {formatTime(remainingTime)}
                          </div>
                        )}
                        
                        <button
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm 
                            ${canTryAgain 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            }`}
                          onClick={handleTryAgain}
                          disabled={!canTryAgain}
                        >
                          {canTryAgain ? 'Tentar Novamente' : 'Aguarde'}
                        </button>
                      </div>
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
  );
}
