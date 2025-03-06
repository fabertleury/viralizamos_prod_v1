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
import { CouponInput } from '@/components/checkout/CouponInput';

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
  checkout: {
    slug: string;
  };
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
  const [paymentData, setPaymentData] = useState<any>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service) {
      toast.error('Serviço não encontrado');
      return;
    }
    
    if (!profileData) {
      toast.error('Perfil não encontrado');
      return;
    }
    
    if (selectedPosts.length === 0) {
      toast.error('Selecione pelo menos um post');
      return;
    }
    
    setLoading(true);
    
    try {
      // Preparar os dados para o pagamento
      const paymentData = {
        service_id: service.id,
        amount: finalAmount || service.preco,
        original_amount: service.preco,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon,
        description: `${service.quantidade} visualizações para ${selectedPosts.length} posts`,
        service: {
          id: service.id,
          name: service.name,
          quantity: service.quantidade
        },
        profile: {
          username: profileData.username,
          full_name: profileData.full_name,
          link: `https://instagram.com/${profileData.username}`
        },
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.whatsapp
        },
        posts: selectedPosts.map(post => ({
          id: post.id,
          code: post.shortcode,
          image_url: post.image_url,
          caption: post.caption,
          link: `https://instagram.com/p/${post.shortcode}`
        }))
      };

      // Criar transação
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'payment',
          amount: paymentData.amount,
          status: 'pending',
          payment_method: 'pix',
          payment_id: null, // será atualizado após a criação do pagamento
          metadata: paymentData,
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
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar pagamento');
      }

      const paymentDataResponse = await response.json();
      
      // Atualizar transação com dados do pagamento
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          payment_id: paymentDataResponse.id,
          metadata: {
            ...transaction.metadata,
            payment: paymentDataResponse
          }
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Mostrar modal de pagamento
      setPaymentData({
        qrCode: paymentDataResponse.qr_code_base64,
        qrCodeText: paymentDataResponse.qr_code,
        amount: paymentDataResponse.amount,
        qrCodeBase64: paymentDataResponse.qr_code_base64
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
              maxPosts={12}
              showReels={true}
              showPosts={true}
              reelsCount={12}
              postsCount={12}
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

          <div className="max-w-xl mx-auto mt-8">
            <div className="flex justify-between text-lg font-semibold mt-4 pt-2 border-t">
              <span>Valor total:</span>
              <span>R$ {(finalAmount || service.preco).toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Valor original:</span>
                <span className="line-through">R$ {service.preco.toFixed(2)}</span>
              </div>
            )}

            <CouponInput 
              serviceId={service.id}
              originalAmount={service.preco}
              onCouponApplied={(discount, final, code) => {
                setDiscountAmount(discount);
                setFinalAmount(final);
                setAppliedCoupon(code || null);
              }}
            />
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
