'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSupabase } from '../../../../../../src/lib/hooks/useSupabase';
import { LoadingProfileModal } from '../../components/LoadingProfileModal';
import { toast } from 'sonner';
import { Header } from '../../components/Header';
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
  const [isLoading, setIsLoading] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'checking' | 'loading' | 'done' | 'error'>('searching');
  const [profileData, setProfileData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const serviceId = searchParams.get('service_id');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const fetchService = async () => {
      try {
        if (!serviceId) {
          throw new Error('ID do serviço não encontrado');
        }

        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Serviço não encontrado');

        setService(data);
      } catch (error) {
        console.error('Erro ao carregar serviço:', error);
        toast.error('Erro ao carregar serviço');
      }
    };

    fetchService();
  }, [serviceId, supabase]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setIsModalOpen(true);
    setLoadingStage('searching');
    setProfileData(null);

    try {
      const username = data.instagram_username.replace('@', '');

      // Buscar dados do perfil
      setLoadingStage('loading');
      const response = await fetch(`/api/instagram/info/${username}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'Erro ao buscar perfil');
      }

      // Verificando se é público
      setLoadingStage('checking');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const profile = json.data;
      if (profile.is_private) {
        setProfileData({
          username: profile.username,
          full_name: profile.full_name,
          profile_pic_url: profile.profile_pic_url_hd || profile.profile_pic_url,
          follower_count: profile.follower_count,
          following_count: profile.following_count,
          media_count: profile.media_count,
          biography: profile.biography,
          is_private: profile.is_private,
          is_verified: profile.is_verified,
          whatsapp: data.whatsapp,
          email: data.email
        });
        throw new Error('Perfil privado');
      }

      // Perfil verificado
      setProfileData({
        username: profile.username,
        full_name: profile.full_name,
        profile_pic_url: profile.profile_pic_url_hd || profile.profile_pic_url,
        follower_count: profile.follower_count,
        following_count: profile.following_count,
        media_count: profile.media_count,
        biography: profile.biography,
        is_private: profile.is_private,
        is_verified: profile.is_verified,
        whatsapp: data.whatsapp,
        email: data.email
      });
      
      setLoadingStage('done');
    } catch (error) {
      setLoadingStage('error');
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    // Redirecionar para o step2 com os dados
    const params = new URLSearchParams({
      username: profileData.username,
      whatsapp: profileData.whatsapp,
      email: profileData.email,
      service_id: serviceId!,
    });

    window.location.href = `/checkout/instagram/curtidas/step2?${params.toString()}`;
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
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
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
                        <span className="text-sm text-gray-500">curtidas</span>
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
                      {...register('email', { 
                        required: true,
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "E-mail inválido"
                        }
                      })}
                      type="email"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                      placeholder="seu@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email.message || 'Campo obrigatório'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      {...register('is_public_confirmed', { required: true })}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="is_public_confirmed" className="font-medium text-gray-700">
                      Confirmo que meu perfil está configurado como público
                    </label>
                    {errors.is_public_confirmed && (
                      <p className="mt-1 text-sm text-red-600">Você precisa confirmar que seu perfil é público</p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Verificando...' : 'Continuar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <LoadingProfileModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        loadingStage={loadingStage}
        profileData={profileData}
        serviceId={serviceId || ''}
        checkoutSlug="curtidas"
      />
    </div>
  );
}
