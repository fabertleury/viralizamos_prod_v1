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

export default function HomeV3() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateMessage, setShowPrivateMessage] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timer, setTimer] = useState(300);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
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
