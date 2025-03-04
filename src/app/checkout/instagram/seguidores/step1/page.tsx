'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSupabase } from '../../../../../../src/lib/hooks/useSupabase';
import { LoadingProfileModal } from '../../components/LoadingProfileModal';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { useForm } from 'react-hook-form';
import { fetchInstagramProfile } from '@/lib/services/instagram-profile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { maskPhone } from '@/lib/utils/mask';
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
  whatsapp: string;
  email: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'checking' | 'loading' | 'done' | 'error'>('searching');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const serviceId = searchParams.get('service_id');
  const quantity = searchParams.get('quantity');

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
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

      const { data, error } = await supabase.client
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) {
        toast.error('Erro ao buscar detalhes do serviço');
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
  }, [serviceId, quantity, supabase]);

  const onSubmit = async (formData: FormData) => {
    if (!formData.is_public_confirmed) {
      toast.error('Confirme que seu perfil é público');
      return;
    }

    // Garantir que o WhatsApp esteja formatado corretamente
    const formattedWhatsApp = maskPhone(formData.whatsapp);
    if (formattedWhatsApp !== formData.whatsapp) {
      setValue('whatsapp', formattedWhatsApp);
    }

    setIsLoading(true);
    setIsModalOpen(true);
    setLoadingStage('searching');
    setError(undefined);

    try {
      const result = await fetchInstagramProfile(formData.instagram_username);

      if (result.error) {
        setLoadingStage('error');
        setError(result.error);
        setProfileData(result.profileData || null);
        return;
      }

      // Adicionar os dados do formulário ao profileData
      setProfileData({
        ...(result.profileData || {}),
        username: formData.instagram_username,
        email: formData.email,
        whatsapp: formattedWhatsApp
      });
      setLoadingStage('done');
    } catch {
      setLoadingStage('error');
      setError('Erro ao verificar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    // Verificar se temos todos os dados necessários
    if (!profileData?.username || !serviceId) {
      toast.error('Informações incompletas. Por favor, preencha todos os campos.');
      return;
    }

    try {
      // Salvar dados no localStorage para garantir que estejam disponíveis no step2
      localStorage.setItem('checkoutProfileData', JSON.stringify({
        profileData: {
          ...profileData,
          username: profileData.username,
          email: profileData.email,
          whatsapp: profileData.whatsapp
        },
        serviceId: serviceId,
        quantity: quantity || undefined,
        timestamp: new Date().getTime()
      }));

      console.log('Dados salvos no localStorage:', {
        profileData,
        serviceId,
        quantity
      });

      // Redirecionar para o step2 com os parâmetros mínimos necessários
      window.location.href = `/checkout/instagram/seguidores/step2?username=${encodeURIComponent(profileData.username)}&service_id=${encodeURIComponent(serviceId)}`;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast.error('Erro ao processar dados. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Passos para Comprar */}
          <div className="mb-8 bg-white shadow-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-center mb-6 text-gray-800">Como Comprar Seguidores</h3>
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
                <h4 className="font-semibold text-gray-700 text-center">Confirmar Perfil</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Confirme seu perfil para seguidores
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold text-gray-700 text-center">Finalizar Compra</h4>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Pague e receba seguidores
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{service?.name}</h2>
              </div>
              <p className="text-gray-600 mb-4">{service?.description}</p>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">Quantidade</span>
                  <p className="text-lg font-semibold text-gray-800">{quantity} seguidores</p>
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

              <div>
                <label htmlFor="whatsapp" className="block mb-2">WhatsApp</label>
                <input 
                  type="text" 
                  id="whatsapp"
                  placeholder="(00) 00000-0000" 
                  className="w-full py-3 border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 rounded-lg"
                  {...register('whatsapp', { 
                    required: 'Informe seu WhatsApp',
                    pattern: {
                      value: /^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$/,
                      message: 'Formato de WhatsApp inválido'
                    }
                  })}
                  onChange={(e) => {
                    const maskedValue = maskPhone(e.target.value);
                    e.target.value = maskedValue;
                  }}
                />
                {errors.whatsapp && (
                  <p className="text-red-500 text-sm mt-2 flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.whatsapp.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block mb-2">E-mail</label>
                <input 
                  type="email" 
                  id="email"
                  placeholder="seu@email.com" 
                  className="w-full py-3 border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 rounded-lg"
                  {...register('email', { 
                    required: 'Informe seu e-mail',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Formato de e-mail inválido'
                    }
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.email.message}</span>
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
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          loadingStage={loadingStage}
          error={error}
          profileData={profileData}
          serviceId={serviceId || undefined}
          checkoutSlug="seguidores"
          service={{
            id: service?.id,
            name: service?.name,
            quantity: service?.quantidade,
            link: `https://instagram.com/${profileData?.username}`
          }}
          profile={{
            username: profileData?.username,
            full_name: profileData?.full_name
          }}
          customer={{
            name: '',
            email: profileData?.email,
            phone: profileData?.whatsapp
          }}
          handleConfirm={handleConfirm}
        />
      </main>
    </div>
  );
}
