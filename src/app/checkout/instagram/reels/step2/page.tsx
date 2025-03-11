'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/hooks/useSupabase';
import { toast } from 'sonner';
import { ReelSelector } from '@/components/instagram/visualizacao/ReelSelector';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../../utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';
import { CouponInput } from '@/components/checkout/CouponInput';
import axios from 'axios';

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
  selected?: boolean;
  displayName?: string;
}

export default function Step2Page() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [selectedReels, setSelectedReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);
  const [instagramReels, setInstagramReels] = useState<Post[] | null>(null);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    whatsapp: ''
  });
  const [paymentData, setPaymentData] = useState<any>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    // Carregar dados do localStorage
    const checkoutData = localStorage.getItem('checkoutProfileData');
    
    if (!checkoutData) {
      toast.error('Dados do perfil não encontrados');
      router.push('/');
      return;
    }

    const loadData = async () => {
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
          const serviceData = await fetchService(serviceId);
          if (serviceData) {
            setService(serviceData);
            setFinalAmount(serviceData.preco);
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast.error('Erro ao carregar dados do perfil');
        router.push('/');
      }
    };

    loadData();
  }, []);

  const fetchService = async (externalId: string) => {
    console.log('Buscando serviço com ID:', externalId);
    
    try {
      // Verificar se temos uma quantidade específica no localStorage
      const checkoutData = localStorage.getItem('checkoutProfileData');
      let quantity = null;
      
      if (checkoutData) {
        const parsedData = JSON.parse(checkoutData);
        quantity = parsedData.quantity;
        console.log('Quantidade encontrada no localStorage:', quantity);
      }

      // Limpar o externalId para garantir que não tenha aspas extras
      const cleanExternalId = externalId ? externalId.replace(/"/g, '') : '';
      console.log('External ID limpo:', cleanExternalId);
      
      // Buscar primeiro pelo external_id
      let { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('external_id', cleanExternalId);
      
      // Se não encontrar pelo external_id, tentar pelo id
      if (!data || data.length === 0) {
        console.log('Serviço não encontrado pelo external_id, tentando pelo id');
        const result = await supabase
          .from('services')
          .select('*')
          .eq('id', cleanExternalId);
          
        data = result.data;
        error = result.error;
      }
      
      // Verificar se encontramos o serviço
      if (error) {
        console.error('Erro ao buscar serviço:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.error('Nenhum serviço encontrado');
        return null;
      }
      
      // Pegar o primeiro serviço encontrado
      const serviceData = data[0];
      console.log('Serviço encontrado:', serviceData);
      
      // Se temos uma quantidade específica, atualizar o serviço
      if (quantity) {
        console.log('Atualizando quantidade do serviço para:', quantity);
        serviceData.quantidade = parseInt(quantity);
        
        // Atualizar o preço se houver variações de preço
        if (serviceData.service_variations && serviceData.service_variations.length > 0) {
          const selectedVariation = serviceData.service_variations.find(
            (v: any) => v.quantidade === parseInt(quantity)
          );
          
          if (selectedVariation) {
            console.log('Variação de preço encontrada:', selectedVariation);
            serviceData.preco = selectedVariation.preco;
          }
        }
      }
      
      return serviceData;
    } catch (error) {
      console.error('Erro ao buscar serviço:', error);
      return null;
    }
  };

  // Calcular o número de visualizações por item
  const maxTotalItems = 10; // Máximo de itens que podem ser selecionados
  const selectedItemsCount = selectedReels.length;
  const visualizacoesPerItem = selectedItemsCount > 0 
    ? Math.floor(service?.quantidade || 0 / selectedItemsCount) 
    : 0;

  // Buscar reels do Instagram
  const fetchInstagramReels = async (username: string) => {
    if (!username) return;
    
    try {
      setLoadingReels(true);
      
      // Configurar a requisição para a API do RapidAPI
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/user/reels',
        params: { username },
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };

      console.log('Buscando reels para:', username);
      const response = await axios.request(options);
      const reels = response.data.data?.items || response.data.items || [];
      
      console.log(`Encontrados ${reels.length} reels para ${username}`);
      
      // Mapear os dados para o formato esperado
      const formattedReels = reels.map((reel: any) => {
        // Extrair a URL da imagem de thumbnail
        const thumbnailUrl = 
          reel.image_versions2?.candidates?.[0]?.url || 
          reel.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
          reel.thumbnail_url ||
          '';
        
        return {
          id: reel.id || `reel_${Math.random().toString(36).substring(2, 11)}`,
          code: reel.code || reel.shortcode,
          shortcode: reel.shortcode || reel.code,
          thumbnail_url: thumbnailUrl,
          image_url: thumbnailUrl,
          display_url: thumbnailUrl,
          caption: reel.caption?.text || reel.caption || '',
          like_count: reel.like_count || 0,
          comment_count: reel.comment_count || 0,
          views_count: reel.view_count || reel.play_count || 0,
          play_count: reel.play_count || reel.view_count || 0
        };
      });
      
      setInstagramReels(formattedReels);
      setReelsLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar reels:', error);
      toast.error('Não foi possível carregar os reels. Tente novamente.');
    } finally {
      setLoadingReels(false);
    }
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
    
    if (selectedReels.length === 0) {
      toast.error('Selecione pelo menos um reel');
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
        description: `${service.quantidade} visualizações para ${selectedReels.length} reels`,
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
        posts: selectedReels.map(reel => ({
          id: reel.id,
          code: reel.code || reel.shortcode,
          image_url: reel.image_url,
          caption: reel.caption,
          link: `https://instagram.com/reel/${reel.shortcode}`
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
        const errorData = await response.json();
        console.error('Error creating payment:', errorData);
        throw new Error(errorData.message || 'Erro ao criar pagamento');
      }

      const pixData = await response.json();
      console.log('Pagamento criado:', pixData);
      
      // Atualizar a transação com o ID do pagamento
      if (transaction) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            payment_id: pixData.id,
            metadata: {
              ...transaction.metadata,
              payment: pixData
            }
          })
          .eq('id', transaction.id);
          
        if (updateError) {
          console.error('Error updating transaction:', updateError);
        }
      }
      
      setPaymentData(pixData);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar os reels quando o perfil estiver disponível
  useEffect(() => {
    if (profileData?.username && !reelsLoaded && !loadingReels) {
      fetchInstagramReels(profileData.username);
    }
  }, [profileData]);

  // Função para selecionar/deselecionar um reel
  const toggleReelSelection = (reel: Post) => {
    const isSelected = selectedReels.some(p => p.id === reel.id);
    
    if (isSelected) {
      // Remover da seleção
      setSelectedReels(selectedReels.filter(p => p.id !== reel.id));
    } else {
      // Verificar se já atingiu o limite
      if (selectedReels.length >= maxTotalItems) {
        toast.error(`Você só pode selecionar até ${maxTotalItems} itens`);
        return;
      }
      
      // Adicionar à seleção
      setSelectedReels([...selectedReels, reel]);
    }
  };

  // Função para aplicar cupom de desconto
  const applyCoupon = async (code: string) => {
    if (!service) return false;
    
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('status', true)
        .single();
        
      if (error || !data) {
        toast.error('Cupom inválido ou expirado');
        return false;
      }
      
      // Verificar se o cupom já expirou
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Cupom expirado');
        return false;
      }
      
      // Calcular o desconto
      let discount = 0;
      if (data.discount_type === 'percentage') {
        discount = (service.preco * data.discount_value) / 100;
      } else {
        discount = data.discount_value;
      }
      
      // Garantir que o desconto não seja maior que o valor do serviço
      discount = Math.min(discount, service.preco);
      
      // Atualizar o valor final
      const newFinalAmount = service.preco - discount;
      setFinalAmount(newFinalAmount);
      setDiscountAmount(discount);
      setAppliedCoupon(code);
      
      toast.success(`Cupom aplicado! Desconto de R$ ${discount.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Erro ao aplicar cupom');
      return false;
    }
  };

  // Função para remover o cupom aplicado
  const removeCoupon = () => {
    if (!service) return;
    
    setFinalAmount(service.preco);
    setDiscountAmount(0);
    setAppliedCoupon(null);
    
    toast.success('Cupom removido');
  };

  // Renderizar o modal de pagamento se houver dados de pagamento
  if (paymentData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <PaymentPixModal 
          pixData={paymentData}
          serviceData={{
            name: service?.name || '',
            price: finalAmount || service?.preco || 0,
            originalPrice: service?.preco || 0,
            discount: discountAmount
          }}
          onClose={() => router.push('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Selecione os Reels para adicionar visualizações</h1>
        
        {/* Informações do perfil */}
        {profileData && (
          <div className="mb-6 flex items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
              <img 
                src={getProxiedImageUrl(profileData.profile_pic_url)} 
                alt={profileData.username} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{profileData.full_name}</h2>
              <p className="text-gray-600">@{profileData.username}</p>
              <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                <span>{profileData.follower_count.toLocaleString()} seguidores</span>
                <span>{profileData.following_count.toLocaleString()} seguindo</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Informações do serviço */}
        {service && (
          <Card className="p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">{service.name}</h2>
            <p className="text-gray-600 mb-2">
              {service.quantidade.toLocaleString()} visualizações no total
            </p>
            {selectedReels.length > 0 && (
              <p className="text-sm text-gray-600">
                Aproximadamente {visualizacoesPerItem.toLocaleString()} visualizações por reel
              </p>
            )}
          </Card>
        )}
        
        {/* Seleção de Reels */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Seus Reels</h2>
          
          {loadingReels ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Carregando reels...</span>
            </div>
          ) : instagramReels && instagramReels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {instagramReels.map((reel) => (
                <ReelSelector
                  key={reel.id}
                  reel={reel}
                  selected={selectedReels.some(p => p.id === reel.id)}
                  onSelect={() => toggleReelSelection(reel)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-100 rounded-lg">
              <p className="text-gray-600">Nenhum reel encontrado para este perfil.</p>
              <p className="text-sm text-gray-500 mt-2">
                Certifique-se de que o perfil tenha reels públicos.
              </p>
            </div>
          )}
          
          {selectedReels.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Reels selecionados ({selectedReels.length}/{maxTotalItems})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedReels.map((reel) => (
                  <div 
                    key={reel.id} 
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <span className="truncate max-w-[150px]">
                      {reel.caption ? reel.caption.substring(0, 20) + '...' : 'Reel sem legenda'}
                    </span>
                    <button 
                      className="ml-2 text-primary hover:text-primary/80"
                      onClick={() => toggleReelSelection(reel)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Formulário de pagamento */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Seu nome completo"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="seu@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                required
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cupom de desconto (opcional)
              </label>
              <CouponInput
                onApply={applyCoupon}
                onRemove={removeCoupon}
                appliedCoupon={appliedCoupon}
              />
            </div>
          </div>
          
          {/* Resumo do pedido */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Resumo do pedido</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Serviço:</span>
                <span>{service?.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Quantidade:</span>
                <span>{service?.quantidade.toLocaleString()} visualizações</span>
              </div>
              
              <div className="flex justify-between">
                <span>Reels selecionados:</span>
                <span>{selectedReels.length}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span>-R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total:</span>
                <span>R$ {(finalAmount || service?.preco || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || selectedReels.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Pagar com PIX'
              )}
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
}
