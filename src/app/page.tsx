'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';
import { 
  FaQuestionCircle, 
  FaLock,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaUser,
  FaCog,
  FaUnlock,
  FaTimes
} from 'react-icons/fa';
import './styles.css';

// Importar o hook de idioma
import { useLanguage } from '@/contexts/LanguageContext';

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
const useCooldown = (key: string, cooldownTime: number = 30 * 1000) => {
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

// Hook personalizado para gerenciar tentativas de verificação
const useProfileCheck = () => {
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [rateLimitReached, setRateLimitReached] = useState(false);

  const canCheckProfile = () => {
    // Se atingiu o rate limit, não permite novas tentativas
    if (rateLimitReached) return false;

    // Se nunca foi feita uma verificação, permite
    if (!lastCheckTimestamp) return true;

    // Permite nova verificação se passou mais de 5 segundos
    const timeSinceLastCheck = Date.now() - lastCheckTimestamp;
    return timeSinceLastCheck > 5000;
  };

  const recordCheck = (success: boolean, isRateLimited: boolean = false) => {
    setLastCheckTimestamp(Date.now());
    
    if (isRateLimited) {
      // Define rate limit atingido
      setRateLimitReached(true);
      // Reseta após 1 minuto
      setTimeout(() => {
        setRateLimitReached(false);
        setConsecutiveFailures(0);
      }, 60000);
    } else if (success) {
      // Reseta falhas consecutivas se sucesso
      setConsecutiveFailures(0);
      setRateLimitReached(false);
    } else {
      // Incrementa falhas consecutivas
      setConsecutiveFailures(prev => prev + 1);
    }
  };

  const shouldWait = () => {
    // Aumenta o tempo de espera exponencialmente após falhas consecutivas
    return consecutiveFailures > 3 || rateLimitReached;
  };

  return { 
    canCheckProfile, 
    recordCheck, 
    shouldWait,
    consecutiveFailures,
    rateLimitReached 
  };
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
    remainingTime: cooldownRemainingTime, 
    startCooldown 
  } = useCooldown('instagram-profile-check', 30 * 1000); // 30 segundos

  const { 
    canCheckProfile, 
    recordCheck, 
    shouldWait,
    consecutiveFailures,
    rateLimitReached 
  } = useProfileCheck();

  // Estados para gerenciamento de carregamento e perfil privado
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [privateProfileData, setPrivateProfileData] = useState<{
    username: string;
    profilePicUrl?: string;
  } | null>(null);
  const [loadingStage, setLoadingStage] = useState<
    'idle' | 'checking' | 'validating' | 'fetching' | 'private' | 'error'
  >('idle');

  // Estado para controlar o temporizador
  const [remainingTime, setRemainingTime] = useState(120); // 2 minutos = 120 segundos
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Usar o contexto de idioma
  const { language, translations, changeLanguage } = useLanguage();

  // Efeito para gerenciar o temporizador
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isTimerActive && remainingTime > 0) {
      intervalId = setInterval(() => {
        setRemainingTime((prev) => prev - 1);
      }, 1000);
    } else if (remainingTime === 0) {
      setIsTimerActive(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerActive, remainingTime]);

  // Função para formatar o tempo restante
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Função para iniciar o temporizador
  const startTimer = () => {
    setRemainingTime(120);
    setIsTimerActive(true);

    const timer = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setIsTimerActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

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
    // Regex atualizada para permitir underscores no final
    const instagramUsernameRegex = /^[a-zA-Z0-9](?!.*\.\.|.*\.$)(?!.*\.{2,})[a-zA-Z0-9._]+_?$/;
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
    
    // Limpa resultados anteriores
    setSearchResults(null);
    setShowPrivateMessage(false);
  };

  const handleAnalyze = async () => {
    // Validações iniciais
    if (!username) {
      alert('Por favor, insira um username do Instagram');
      return;
    }

    if (!validateInstagramUsername(username)) {
      alert('Username inválido. Use apenas letras, números, pontos e underscores.');
      return;
    }

    // Verificações de cooldown e rate limit
    if (!canTryAgain || !canCheckProfile()) {
      setShowPrivateMessage(true);
      return;
    }

    // Reinicia os estados
    setIsLoading(true);
    setSearchResults(null);
    setShowPrivateMessage(false);
    setLoadingStage('searching');
    setPrivateProfileData(null);

    try {
      // Simula um tempo de carregamento para mostrar as mensagens
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingStage('verifying');

      const response = await fetch(`/api/instagram?username=${username}`);
      const data = await response.json();

      console.log('API Response:', response); // Log de depuração
      console.log('API Data:', data); // Log de depuração

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      // Registra o sucesso da verificação
      recordCheck(true);
      startCooldown();

      // Simula um tempo adicional para mostrar a mensagem de encontrado
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingStage('found');

      // Diferencia o tratamento para perfis públicos e privados
      if (data.isPrivate) {
        console.log('Perfil privado'); // Log de depuração
        
        // Aguarda um momento antes de mostrar o perfil privado
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoadingStage('private');
        
        // Armazena dados do perfil privado
        setPrivateProfileData({
          username: data.username,
          profilePicUrl: data.profilePicUrl
        });
      } else {
        console.log('Perfil público', data); // Log de depuração
        
        // Redireciona para página de análise com o username
        window.location.href = `/analisar-perfil?username=${username}`;
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      
      // Registra a falha da verificação
      recordCheck(false, error.message.includes('Rate limit'));
      
      // Tratamento de erros específicos
      if (error.message.includes('Rate limit')) {
        setRateLimitReached(true);
      } else {
        alert(error.message || 'Erro ao verificar o perfil');
      }

      // Reseta o estado de loading
      setLoadingStage('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    if (!shouldWait()) {
      setShowPrivateMessage(false);
      handleAnalyze();
    }
  };

  // Função para buscar dados do perfil do Instagram
  const fetchInstagramProfile = async (username: string) => {
    try {
      // Define o estágio de carregamento
      setLoadingStage('checking');

      // Busca informações do perfil usando a nova API
      const response = await fetch(`/api/instagram-profile?username=${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Verifica se a resposta não é ok
      if (!response.ok) {
        const errorData = await response.json();
        
        // Verifica se é um perfil privado
        if (errorData.error.includes('privado')) {
          setLoadingStage('private');
          setIsPrivateProfile(true);
          setPrivateProfileData({
            username: username,
            profilePicUrl: '' // Pode ser atualizado depois
          });
          return null;
        }

        // Outros tipos de erro
        setLoadingStage('error');
        toast.error(errorData.error || 'Erro ao buscar perfil');
        return null;
      }

      // Define o estágio de carregamento
      setLoadingStage('fetching');

      const data = await response.json();

      // Verifica se o perfil é privado
      if (data.isPrivate) {
        setLoadingStage('private');
        setIsPrivateProfile(true);
        setPrivateProfileData({
          username: data.username,
          profilePicUrl: data.profilePicUrl
        });
        return null;
      }

      // Processamento dos dados recebidos
      const processedData = {
        username: data.username,
        profilePicUrl: proxyInstagramImage(data.profilePicUrl),
        followerCount: data.followerCount,
        isPrivate: data.isPrivate,
        biography: data.biography,
        isVerified: data.isVerified,
        externalUrl: data.externalUrl,
        followingCount: data.followingCount,
        totalPosts: 0 // Não temos essa informação nesta API
      };

      // Reseta o estágio de carregamento
      setLoadingStage('idle');

      return processedData;

    } catch (error) {
      console.error('Erro ao buscar perfil do Instagram:', error);
      
      // Define o estágio de erro
      setLoadingStage('error');
      toast.error('Erro interno ao processar o perfil');
      
      return null;
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

  const proxyInstagramImage = (originalUrl: string) => {
    if (!originalUrl) return '/default-profile.png';
    
    try {
      const url = new URL(originalUrl);
      
      // Remove o domínio e deixa apenas o caminho e query
      let path = url.pathname.replace(/^\//, '');
      
      // Adiciona a query string se existir
      if (url.search) {
        path += url.search;
      }
      
      // Codifica o caminho para evitar problemas com caracteres especiais
      const encodedPath = encodeURIComponent(path);
      
      return `/proxy/instagram-image/${encodedPath}`;
    } catch (error) {
      console.error('Erro ao processar URL da imagem:', error);
      return '/default-profile.png';
    }
  };

  // Renderização do loading
  const renderLoading = () => {
    if (isLoading) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">
              Buscando dados do perfil...
            </h2>
            <p className="text-gray-600 mt-2">
              Isso pode levar alguns segundos
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Frases motivacionais para exibir durante o carregamento
  const motivationalPhrases = [
    "Preparando insights incríveis...",
    "Analisando métricas do perfil...",
    "Desvendando o potencial do seu Instagram...",
    "Carregando dados estratégicos...",
    "Transformando números em inteligência..."
  ];

  // Renderização do modal de perfil privado
  const renderPrivateProfileModal = () => {
    if (loadingStage !== 'private' || !privateProfileData) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Verifica se o clique foi diretamente no overlay
      if (e.target === e.currentTarget) {
        setLoadingStage('idle');
      }
    };

    // Função para tentar novamente
    const handleTryAgain = () => {
      // Reinicia o estado e tenta novamente
      setLoadingStage('idle');
      
      // Opcional: Você pode adicionar lógica adicional aqui se necessário
      // Por exemplo, limpar campos ou redefinir algum estado
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        <div 
          className="bg-white rounded-lg max-w-md w-full p-6 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4">
            <img 
              src={proxyInstagramImage(privateProfileData.profilePicUrl || '')} 
              alt={`Perfil de ${privateProfileData.username}`} 
              className="w-24 h-24 rounded-full border-4 border-gray-300 object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-profile.png';
              }}
            />
          </div>
          <h2 className="text-xl font-bold mb-2">{privateProfileData.username}</h2>
          <div className="flex items-center justify-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="font-semibold">Perfil Privado</p>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Seu perfil está configurado como privado. Para continuar a análise, 
            você precisa tornar seu perfil público temporariamente.
          </p>

          {/* Seção do temporizador */}
          {!isTimerActive ? (
            <div className="space-y-2">
              <button 
                onClick={startTimer}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Iniciar Contagem Regressiva
              </button>
              <button 
                onClick={() => setLoadingStage('idle')}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div>
              {remainingTime > 0 ? (
                <div>
                  <p className="text-lg font-bold text-blue-600 mb-4">
                    Tempo Restante: {formatTime(remainingTime)}
                  </p>
                  <button 
                    onClick={handleTryAgain}
                    className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
                    disabled={remainingTime > 0}
                  >
                    {remainingTime > 0 
                      ? `Aguarde ${formatTime(remainingTime)}` 
                      : 'Tentar Novamente'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleTryAgain}
                  className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
                >
                  Tentar Novamente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderização dos seletores de idioma
  // Removido

  return (
    <main className="home-v3 pt-24">
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
                    disabled={isLoading || rateLimitReached}
                  >
                    {isLoading ? 'Analisando...' : 
                     rateLimitReached ? 'Limite Excedido' : 
                     'Analisar Agora'}
                  </button>
                </div>
                
                {rateLimitReached && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4 rounded-lg flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      <FaLock className="text-red-600 text-2xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-red-700 font-semibold">
                        Limite de requisições excedido. Tente novamente em 1 minuto.
                      </p>
                    </div>
                  </div>
                )}

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
                        
                        <button
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm 
                            ${shouldWait() 
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          onClick={handleTryAgain}
                          disabled={shouldWait()}
                        >
                          {shouldWait() ? 'Aguarde' : 'Tentar Novamente'}
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

      {/* Renderização do tutorial Modal */}
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
      
      {renderLoading()}
      {renderPrivateProfileModal()}
    </main>
  );
}
