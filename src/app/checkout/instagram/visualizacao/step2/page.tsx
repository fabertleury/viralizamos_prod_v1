'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { toast } from 'sonner';
import { PostSelector } from '../../components/PostSelector';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';

interface ProfileData {
  username: string;
  full_name: string;
  profile_pic_url: string;
  follower_count: number;
  following_count: number;
  is_private: boolean;
}

interface Service {
  id: string;
  name: string;
  preco: number;
  quantidade: number;
}

interface Post {
  id: string;
  shortcode: string;
  image_url: string;
  caption: string;
}

export default function Step2Page() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    whatsapp: ''
  });
  const [paymentData, setPaymentData] = useState<{
    qrCode: string;
    qrCodeText: string;
    amount?: number;
    qrCodeBase64?: string;
  } | null>(null);

  const supabase = useSupabase();

  useEffect(() => {
    // Carregar dados do localStorage
    const checkoutData = localStorage.getItem('checkoutProfileData');
    
    if (!checkoutData) {
      toast.error('Dados do perfil não encontrados');
      router.push('/');
      return;
    }

    try {
      const { profileData: savedProfile, serviceId, formData: savedFormData, timestamp } = JSON.parse(checkoutData);
      
      // Verificar se os dados não são muito antigos (30 minutos)
      const thirtyMinutes = 30 * 60 * 1000;
      if (new Date().getTime() - timestamp > thirtyMinutes) {
        toast.error('Sessão expirada. Por favor, comece novamente.');
        localStorage.removeItem('checkoutProfileData');
        router.push('/');
        return;
      }

      setProfileData(savedProfile);
      setFormData(savedFormData || formData);
      
      if (serviceId) {
        fetchService(serviceId);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Erro ao carregar dados do perfil');
      router.push('/');
    }
  }, []);

  const fetchService = async (serviceId: string) => {
    const { data: serviceData, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      toast.error('Erro ao carregar serviço');
      return;
    }

    setService(serviceData);
  };

  const handleSubmit = async () => {
    if (!profileData || !service || selectedPosts.length === 0) {
      toast.error('Selecione pelo menos um reel');
      return;
    }

    setLoading(true);

    try {
      // Criar transação
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'payment',
          amount: service.preco,
          status: 'pending',
          payment_method: 'pix',
          payment_id: null, // será atualizado após a criação do pagamento
          metadata: {
            service: {
              id: service.id,
              name: service.name,
              quantidade: service.quantidade
            },
            posts: selectedPosts,
            profile: {
              username: profileData.username,
              full_name: profileData.full_name
            },
            customer: {
              name: formData.name,
              email: formData.email,
              phone: formData.whatsapp
            },
            checkout_type: 'Mostrar Posts'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        throw transactionError;
      }
      
      // Criar pagamento via Pix
      const response = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: service.preco,
          description: `${service.quantidade} visualizações para ${selectedPosts.length} reels`,
          service: {
            id: service.id,
            name: service.name,
            quantidade: service.quantidade
          },
          user_id: null, // será preenchido pelo servidor
          profile: {
            username: profileData.username,
            full_name: profileData.full_name
          },
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.whatsapp
          },
          posts: selectedPosts
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar pagamento');
      }

      const paymentData = await response.json();
      
      // Atualizar transação com dados do pagamento
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          payment_id: paymentData.id,
          metadata: {
            ...transaction.metadata,
            payment: paymentData
          }
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Mostrar modal de pagamento
      setPaymentData({
        qrCode: paymentData.qr_code_base64,
        qrCodeText: paymentData.qr_code,
        amount: paymentData.amount,
        qrCodeBase64: paymentData.qr_code_base64
      });

      // Limpar dados do checkout após sucesso
      localStorage.removeItem('checkoutProfileData');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao gerar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!profileData || !service) {
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
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{service.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Quantidade: {service.quantidade}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-pink-600">
                    R$ {service.preco.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Seletor de Posts */}
          <div className="max-w-xl mx-auto">
            <PostSelector
              username={profileData.username}
              onSelect={(selectedPosts) => {
                // Salvar os posts completos no estado
                setSelectedPosts(selectedPosts.map(post => ({
                  id: post.id,
                  shortcode: post.shortcode,
                  image_url: post.image_url,
                  caption: post.caption
                })));
              }}
              selected={selectedPosts.map(post => post.id)}
              maxPosts={1}
              showOnlyReels={true}
            />
          </div>

          {/* Botão de Continuar */}
          <div className="max-w-xl mx-auto mt-8">
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedPosts.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Modal de Pagamento */}
      {paymentData && (
        <PaymentPixModal
          isOpen={!!paymentData}
          onClose={() => {
            setPaymentData(null);
            router.push('/');
          }}
          qrCode={paymentData.qrCode}
          qrCodeText={paymentData.qrCodeText}
          amount={paymentData.amount}
          qrCodeBase64={paymentData.qrCodeBase64}
          onSuccess={() => {
            router.push('/checkout/instagram/visualizacao/success');
          }}
        />
      )}
    </div>
  );
}
