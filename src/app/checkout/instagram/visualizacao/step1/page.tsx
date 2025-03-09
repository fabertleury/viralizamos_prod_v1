'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useSupabase } from '../../../../../../src/lib/hooks/useSupabase';
import { LoadingProfileModal } from '../../components/LoadingProfileModal';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { useForm } from 'react-hook-form';
import Image from 'next/image';

interface Service {
  id: string;
  name: string;
  description: string;
  preco: number;
  icon: string;
  checkout_type_id: string;
  quantidade: number;
  checkout: {
    id: string;
    name: string;
    slug: string;
  };
  external_id: string;
}

interface FormData {
  instagram_username: string;
  whatsapp: string;
  email: string;
  is_public_confirmed: boolean;
}

const messages = [
  "Estamos buscando seu perfil...",
  "Encontramos o seu perfil...",
  "Estamos verificando se o perfil é público...",
  "Perfil verificado"
];

export default function Step1Page() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'checking' | 'loading' | 'done' | 'error'>('searching');
  const [service, setService] = useState<Service | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('service_id');
  const quantity = searchParams.get('quantity');

  const supabase = useSupabase();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) return;

      try {
        const { data, error } = await supabase.client
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();

        if (error) {
          console.error('Erro ao buscar serviço:', error);
          toast.error('Erro ao carregar informações do serviço');
          return;
        }

        if (data) {
          setService(data);
        }
      } catch (error) {
        console.error('Erro ao buscar serviço:', error);
        toast.error('Erro ao carregar informações do serviço');
      }
    };

    fetchService();
  }, [serviceId, supabase.client]);

  // Função para verificar o perfil do Instagram usando a API em cascata
  const checkProfile = async (usernameToCheck: string) => {
    setIsLoading(true);
    setError(null);
    setShowModal(true);
    setLoadingStage('loading');
    
    try {
      console.log(`Verificando perfil: ${usernameToCheck}`);
      
      // Usar a API em cascata para verificar o perfil
      const response = await fetch(`/api/instagram/graphql-check?username=${usernameToCheck}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar perfil');
      }
      
      // Formatar os dados do perfil
      const profileInfo = {
        username: data.username,
        full_name: data.full_name,
        profile_pic_url: data.profile_pic_url,
        follower_count: data.follower_count,
        following_count: data.following_count,
        is_private: data.is_private,
        is_verified: data.is_verified,
        source: data.source
      };
      
      console.log('Dados do perfil:', profileInfo);
      setProfileData(profileInfo);
      
      if (profileInfo.is_private) {
        console.log('Perfil privado detectado:', profileInfo);
        setLoadingStage('error');
        return;
      }
      
      // Perfil está público, redirecionar para a próxima etapa
      setLoadingStage('done');
      
      // Armazenar dados do perfil e do serviço no localStorage para a próxima etapa
      const checkoutData = {
        profileData: profileInfo,
        serviceId: serviceId,
        external_id: service?.external_id || serviceId, // Armazenar tanto o serviceId quanto o external_id
        quantity: quantity || service?.quantidade
      };
      localStorage.setItem('checkoutProfileData', JSON.stringify(checkoutData));
      
      router.push(`/checkout/instagram/visualizacao/step2?username=${encodeURIComponent(usernameToCheck)}`);
    } catch (error: any) {
      console.error('Erro ao verificar perfil:', error);
      setError(error.message || 'Erro ao verificar o perfil');
      setLoadingStage('error');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    const usernameToCheck = data.instagram_username.replace('@', '');
    checkProfile(usernameToCheck);
  };

  if (!service) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Card do Serviço */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" className="text-pink-600">
                      <g stroke="currentColor" strokeWidth="2" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </g>
                    </svg>
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{service.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        R$ {service.preco.toFixed(2)}
                      </p>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span className="text-sm font-medium text-gray-900">{service.quantidade}</span>
                        <span className="text-sm text-gray-500">visualizações</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Entrega Imediata</span>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Perfil Seguro</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="instagram_username" className="block text-sm font-medium text-gray-700">
                    Perfil do Instagram
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('instagram_username', { required: true })}
                      type="text"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                      placeholder="@seu.perfil"
                    />
                    {errors.instagram_username && (
                      <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                    WhatsApp
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('whatsapp', { required: true })}
                      type="text"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                      placeholder="(00) 00000-0000"
                    />
                    {errors.whatsapp && (
                      <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-mail
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('email', { required: true })}
                      type="email"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                      placeholder="seu@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">Campo obrigatório</p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Verificando...' : 'Verificar Perfil'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <LoadingProfileModal
        open={showModal}
        onOpenChange={setShowModal}
        loadingStage={loadingStage}
        error={error || undefined}
        profileData={profileData}
        serviceId={serviceId || ''}
        checkoutSlug="visualizacao"
      />
    </div>
  );
}
