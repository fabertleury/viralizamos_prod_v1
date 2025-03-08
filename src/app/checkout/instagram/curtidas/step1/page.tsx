'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInstagramAPI } from '@/hooks/useInstagramAPI';
import { LoadingProfileModal } from '../../components/LoadingProfileModal';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { useForm } from 'react-hook-form';
import { fetchInstagramProfile } from '@/lib/services/instagram-profile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCoffee, faLemon, faCar, faHeart, faStar, faClock, faCheck, 
  faShield, faRocket, faGlobe, faUsers, faThumbsUp, faEye, faComment, 
  faBolt, faMedal, faTrophy, faGem, faCrown, faFire, faSmile, faLock, faUnlock 
} from '@fortawesome/free-solid-svg-icons';

interface ServiceDetail {
  title: string;
  emoji: string;
}

interface QuantidadePreco {
  quantidade: number;
  preco: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  preco: number;
  quantidade: number;
  service_variations?: QuantidadePreco[];
  service_details?: ServiceDetail[];
  metadata?: {
    quantidade_preco?: QuantidadePreco[];
    serviceDetails?: ServiceDetail[];
  };
}

interface FormData {
  instagram_username: string;
  is_public_confirmed: boolean;
}

interface ProfileData {
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_private: boolean;
}

export default function Step1Page() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'loading' | 'error' | 'done'>('loading');
  const [service, setService] = useState<Service | null>(null);
  const [loadingStageService, setLoadingStageService] = useState<'searching' | 'checking' | 'loading' | 'done' | 'error'>('searching');

  const router = useRouter();
  const { fetchInstagramProfileInfo } = useInstagramAPI();
  const searchParams = useRouter().useSearchParams();
  const serviceId = searchParams.get('service_id');
  const quantity = searchParams.get('quantity');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      is_public_confirmed: false
    }
  });

  useEffect(() => {
    const fetchServiceData = async () => {
      if (!serviceId) {
        toast.error('ID do serviço não encontrado');
        return;
      }

      const { data, error } = await fetch('https://api.example.com/services/' + serviceId)
        .then(response => response.json())
        .catch(error => {
          console.error('Erro ao buscar detalhes do serviço:', error);
          toast.error('Erro ao buscar detalhes do serviço');
          return null;
        });

      if (!data) {
        return;
      }

      // Definir o serviço com todos os dados
      setService(data);

      // Verificar preço com base na quantidade escolhida
      const variations = data.service_variations || data.metadata?.quantidade_preco || [];
      const selectedVariation = variations.find(
        (v: QuantidadePreco) => v.quantidade === parseInt(quantity || '0')
      );
      if (selectedVariation) {
        setService(prevService => {
          if (prevService) {
            return { ...prevService, preco: selectedVariation.preco };
          }
          return prevService;
        });
      } else {
        toast.error('Variação de quantidade não encontrada');
      }
    };

    fetchServiceData();
  }, [serviceId, quantity]);

  // Função para verificar o perfil do Instagram
  const checkProfile = async (usernameToCheck: string) => {
    setIsLoading(true);
    setError(null);
    setShowModal(true);
    setLoadingStage('loading');
    
    try {
      console.log(`Verificando perfil: ${usernameToCheck}`);
      const data = await fetchInstagramProfileInfo(usernameToCheck);
      
      if (!data) {
        setError('Não foi possível encontrar o perfil. Verifique o nome de usuário e tente novamente.');
        setLoadingStage('error');
        return;
      }
      
      setProfileData(data);
      
      if (data.is_private) {
        console.log('Perfil privado detectado:', data);
        setLoadingStage('error');
        return;
      }
      
      // Perfil está público, redirecionar para a próxima etapa
      setLoadingStage('done');
      router.push(`/checkout/instagram/curtidas/step2?username=${encodeURIComponent(usernameToCheck)}`);
    } catch (error: any) {
      console.error('Erro ao verificar perfil:', error);
      setError(error.message || 'Erro ao verificar o perfil');
      setLoadingStage('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para tentar novamente após o usuário tornar o perfil público
  const handleRetryAfterPrivate = async () => {
    if (profileData?.username) {
      await checkProfile(profileData.username);
    }
  };

  const onSubmit = async (formData: FormData) => {
    if (!formData.is_public_confirmed) {
      toast.error('Confirme que seu perfil é público');
      return;
    }

    await checkProfile(formData.instagram_username);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Passos para Comprar */}
          <div className="mb-8 bg-white shadow-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-center mb-6 text-gray-800">Como Comprar Curtidas</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  1
                </div>
                <h4 className="font-semibold text-gray-700 text-center">Verificar Perfil</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Insira seu perfil do Instagram
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  2
                </div>
                <h4 className="font-semibold text-gray-700 text-center">Escolher Posts</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Selecione os posts para curtidas
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold text-gray-700 text-center">Finalizar Compra</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Pague e receba curtidas
                </p>
              </div>
            </div>
          </div>

          {/* Card do Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-purple-600"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{service?.name}</h2>
              </div>
              <p className="text-gray-600 mb-4">{service?.description}</p>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">Quantidade</span>
                  <p className="text-lg font-semibold text-gray-800">{quantity} curtidas</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Preço</span>
                  <p className="text-2xl font-bold text-purple-600">
                    R$ {service?.preco.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalhes do Serviço</h3>
                <p>{service?.description}</p>
                <ul className="space-y-2 mt-2">
                  {service?.service_details || service?.metadata?.serviceDetails ? (
                    (service.service_details || service.metadata?.serviceDetails || []).map((detail, index) => {
                      return (
                        <li key={index} className="flex items-center">
                          <span className="mr-2">{detail.emoji}</span>
                          <span className="font-semibold text-gray-800">{detail.title}</span>
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-gray-500">Nenhum detalhe disponível</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Formulário de Verificação */}
          <div className="bg-white shadow-md rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Verificar Perfil do Instagram
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="instagram_username" className="block mb-2">Perfil do Instagram</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">@</span>
                  </div>
                  <input 
                    type="text" 
                    id="instagram_username"
                    placeholder="seuperfil" 
                    className="pl-8 w-full py-3 border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 rounded-lg"
                    {...register('instagram_username', { 
                      required: 'Informe seu perfil do Instagram',
                      pattern: {
                        value: /^[a-zA-Z0-9._]+$/,
                        message: 'Formato de usuário inválido'
                      }
                    })}
                  />
                </div>
                {errors.instagram_username && (
                  <p className="text-red-500 text-sm mt-2 flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.instagram_username.message}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="is_public_confirmed"
                  {...register('is_public_confirmed', {
                    required: 'Confirme que o perfil é público'
                  })}
                />
                <label 
                  htmlFor="is_public_confirmed" 
                  className="text-sm text-gray-700"
                >
                  Confirmo que meu perfil é público
                </label>
              </div>
              {errors.is_public_confirmed && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.is_public_confirmed.message}
                </p>
              )}

              <button 
                type="submit" 
                className="w-full py-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Verificando...' : 'Verificar Perfil'}
              </button>
            </form>
          </div>
        </div>

        <LoadingProfileModal 
          open={showModal}
          onOpenChange={setShowModal}
          loadingStage={loadingStage}
          profileData={profileData}
          error={error}
          checkoutSlug="curtidas"
          onRetryAfterPrivate={handleRetryAfterPrivate}
        />
      </main>
    </div>
  );
}
