'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
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
import { supabase } from '@/lib/hooks/useSupabase';

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
  external_id?: string;
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
  const searchParams = useSearchParams();
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

      try {
        setLoadingStageService('searching');
        
        // Buscar serviço pelo ID
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();
        
        if (error) {
          console.error('Erro ao buscar detalhes do serviço:', error);
          toast.error('Erro ao buscar detalhes do serviço');
          return;
        }

        if (!data) {
          toast.error('Serviço não encontrado');
          return;
        }

        setService(data);
        setLoadingStageService('done');
      } catch (error) {
        console.error('Erro ao buscar serviço:', error);
        toast.error('Erro ao carregar detalhes do serviço');
      }
    };

    fetchServiceData();
  }, [serviceId]);

  const checkProfile = async (usernameToCheck: string) => {
    if (!usernameToCheck) {
      toast.error('Por favor, insira um nome de usuário');
      return;
    }

    setIsLoading(true);
    setShowModal(true);
    setLoadingStage('loading');
    setError(null);

    try {
      // Verificar se o perfil existe e é público
      const profileInfo = await fetchInstagramProfileInfo(usernameToCheck);
      
      if (!profileInfo) {
        throw new Error('Não foi possível encontrar o perfil');
      }

      setProfileData(profileInfo);

      if (profileInfo.is_private) {
        setLoadingStage('error');
        setError('Este perfil é privado. Por favor, torne-o público para continuar.');
        return;
      }

      setLoadingStage('done');
      
      // Armazenar dados do perfil e do serviço no localStorage para a próxima etapa
      const checkoutData = {
        profileData: profileInfo,
        serviceId: serviceId,
        external_id: service?.external_id || serviceId,
        quantity: quantity || service?.quantidade
      };
      localStorage.setItem('checkoutProfileData', JSON.stringify(checkoutData));
      
      // Redirecionar para o step2 de Reels
      router.push(`/checkout/instagram/reels/step2?username=${encodeURIComponent(usernameToCheck)}`);
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
            <h3 className="text-xl font-bold text-center mb-6 text-gray-800">Como Comprar Visualizações para Reels</h3>
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
                <h4 className="font-semibold text-gray-700 text-center">Escolher Reels</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Selecione os reels para visualizações
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold text-gray-700 text-center">Finalizar Compra</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Pague e receba suas visualizações
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de Verificação de Perfil */}
          <div className="bg-white shadow-md rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Verificar Perfil do Instagram
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="instagram_username" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome de usuário do Instagram
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">@</span>
                  </div>
                  <input
                    type="text"
                    id="instagram_username"
                    className="focus:ring-pink-500 focus:border-pink-500 block w-full pl-8 pr-12 sm:text-sm border-gray-300 rounded-md py-3"
                    placeholder="seu_usuario"
                    {...register('instagram_username', { required: true })}
                  />
                </div>
                {errors.instagram_username && (
                  <p className="mt-2 text-sm text-red-600">
                    Por favor, insira seu nome de usuário do Instagram
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="is_public_confirmed"
                    type="checkbox"
                    className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                    {...register('is_public_confirmed', { required: true })}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is_public_confirmed" className="font-medium text-gray-700">
                    Confirmo que meu perfil é público
                  </label>
                  <p className="text-gray-500">
                    Para receber visualizações, seu perfil precisa ser público durante o processo.
                  </p>
                </div>
              </div>
              {errors.is_public_confirmed && (
                <p className="mt-2 text-sm text-red-600">
                  Você precisa confirmar que seu perfil é público
                </p>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verificando...' : 'Verificar Perfil'}
                </button>
              </div>
            </form>
          </div>

          {/* Informações do Serviço */}
          {service && (
            <div className="bg-white shadow-md rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Detalhes do Serviço</h3>
              <div className="flex flex-col space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700">{service.name}</h4>
                  <p className="text-gray-600">{service.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-semibold">{quantity || service.quantidade}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-semibold text-green-600">
                    R$ {(service.preco / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detalhes do Serviço */}
          <div className="bg-white shadow-md rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Por que escolher nosso serviço?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="text-pink-500">
                  <FontAwesomeIcon icon={faRocket} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Entrega Rápida</h4>
                  <p className="text-sm text-gray-600">
                    Começamos a entregar suas visualizações em até 30 minutos após a confirmação.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-pink-500">
                  <FontAwesomeIcon icon={faShield} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">100% Seguro</h4>
                  <p className="text-sm text-gray-600">
                    Não pedimos sua senha e utilizamos métodos seguros que não violam as políticas do Instagram.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-pink-500">
                  <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Visualizações Reais</h4>
                  <p className="text-sm text-gray-600">
                    Todas as visualizações vêm de contas reais, aumentando seu engajamento de forma natural.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-pink-500">
                  <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Garantia de Qualidade</h4>
                  <p className="text-sm text-gray-600">
                    Se houver qualquer problema, oferecemos suporte e garantia de reposição.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Carregamento */}
      <LoadingProfileModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        stage={loadingStage}
        error={error}
        profileData={profileData}
        onRetry={handleRetryAfterPrivate}
      />
    </div>
  );
}
