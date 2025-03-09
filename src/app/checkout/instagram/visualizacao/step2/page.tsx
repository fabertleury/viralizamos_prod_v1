'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { toast } from 'sonner';
import { PostSelector } from '@/components/instagram/visualizacao/PostSelector';
import { ReelSelector } from '@/components/instagram/visualizacao/ReelSelector';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../utils/proxy-image';
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
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [selectedReels, setSelectedReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<Post[] | null>(null);
  const [instagramReels, setInstagramReels] = useState<Post[] | null>(null);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
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

  const fetchService = async (externalId: string) => {
    console.log('Buscando serviço com ID:', externalId);
    
    try {
      const supabase = useSupabase();
      
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
  const selectedItemsCount = selectedPosts.length + selectedReels.length;
  const visualizacoesPerItem = selectedItemsCount > 0 
    ? Math.floor(service?.quantidade || 0 / selectedItemsCount) 
    : 0;

  // Buscar posts do Instagram
  const fetchInstagramPosts = async (username: string) => {
    if (!username) return;
    
    try {
      setLoadingPosts(true);
      
      // Configurar a requisição para a API do RapidAPI
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/user/posts',
        params: { username },
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };

      console.log('Buscando posts para:', username);
      const response = await axios.request(options);
      const posts = response.data.data?.items || response.data.items || [];
      
      console.log(`Encontrados ${posts.length} posts para ${username}`);
      
      // Filtrar para remover reels e vídeos
      const filteredPosts = posts.filter((post: any) => {
        return !post.is_video && !post.product_type?.includes('reel');
      });
      
      console.log(`${filteredPosts.length} posts após filtrar (sem reels/vídeos)`);
      
      // Mapear os dados para o formato esperado
      const formattedPosts = filteredPosts.map((post: any) => {
        // Extrair a URL da imagem
        const imageUrl = 
          post.image_versions2?.candidates?.[0]?.url || 
          post.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
          post.image_url ||
          '';
        
        return {
          id: post.id || `post_${Math.random().toString(36).substring(2, 11)}`,
          code: post.code || post.shortcode,
          shortcode: post.shortcode || post.code,
          image_url: imageUrl,
          display_url: imageUrl,
          thumbnail_url: imageUrl,
          caption: post.caption?.text || post.caption || '',
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0
        };
      });
      
      setInstagramPosts(formattedPosts);
      setPostsLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      toast.error('Não foi possível carregar os posts. Tente novamente.');
    } finally {
      setLoadingPosts(false);
    }
  };

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
    
    if (selectedPosts.length === 0 && selectedReels.length === 0) {
      toast.error('Selecione pelo menos um post ou reel');
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
        description: `${service.quantidade} visualizações para ${selectedPosts.length + selectedReels.length} itens`,
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
        posts: [...selectedPosts, ...selectedReels].map(post => ({
          id: post.id,
          code: post.code || post.shortcode,
          image_url: post.image_url,
          caption: post.caption,
          link: `https://instagram.com/p/${post.shortcode}`
        }))
      };

      // Criar transação
      const { data: transaction, error: transactionError } = await supabase.client
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
      const { error: updateError } = await supabase.client
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

  // Preparar dados da transação para o backend
  const prepareTransactionData = (paymentData: any) => {
    return {
      user_id: formData.name || null,
      order_id: paymentData.paymentId,
      type: service?.type, // Usar o tipo do serviço
      amount: service?.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_data: {
        qr_code: paymentData.qrCodeText,
        payment_id: paymentData.paymentId
      },
      metadata: {
        profile: profileData?.username,
        posts: [...selectedPosts, ...selectedReels].map(post => ({
          id: post.id,
          code: post.code || post.shortcode,
          caption: post.caption
        }))
      }
    };
  };

  // Função para lidar com a seleção de posts
  const handlePostSelect = (post: Post) => {
    console.log('Post selecionado/desselecionado:', post);
    
    // Verificar se o post já está selecionado
    const isSelected = selectedPosts.some(selectedPost => selectedPost.id === post.id);
    
    if (isSelected) {
      // Remover post da seleção
      setSelectedPosts(prev => prev.filter(item => item.id !== post.id));
    } else {
      // Adicionar post à seleção
      setSelectedPosts(prev => [...prev, post]);
    }
  };

  // Função para lidar com a seleção de reels
  const handleReelSelect = (reel: Post) => {
    console.log('Reel selecionado/desselecionado:', reel);
    
    // Verificar se o reel já está selecionado
    const isSelected = selectedReels.some(selectedReel => selectedReel.id === reel.id);
    
    if (isSelected) {
      // Remover reel da seleção
      setSelectedReels(prev => prev.filter(item => item.id !== reel.id));
    } else {
      // Adicionar reel à seleção
      setSelectedReels(prev => [...prev, reel]);
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
    <div>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {profileData && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Seleção de Posts e Reels */}
            <Card className="p-6 order-1 md:order-none">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src={getProxiedImageUrl(profileData.profile_pic_url)} 
                    alt={profileData.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{profileData.username}</h3>
                  <p className="text-sm text-gray-500">{profileData.follower_count.toLocaleString()} seguidores</p>
                </div>
              </div>
              
              {/* Tabs de navegação */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <button 
                  onClick={() => {
                    setActiveTab('posts');
                    // Garantir que os posts estejam carregados
                    if (!postsLoaded && profileData?.username) {
                      fetchInstagramPosts(profileData.username);
                    }
                  }}
                  className={`
                    px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider 
                    transition-all duration-300 ease-in-out transform 
                    ${activeTab === 'posts' 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}
                  `}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Posts ({instagramPosts?.length || 0})
                  </span>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('reels');
                    // Carregar reels se ainda não foram carregados
                    if (!reelsLoaded && profileData?.username) {
                      fetchInstagramReels(profileData.username);
                    }
                  }}
                  className={`
                    px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider 
                    transition-all duration-300 ease-in-out transform 
                    ${activeTab === 'reels' 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}
                  `}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Reels ({instagramReels?.length || 0})
                  </span>
                </button>
              </div>

              {activeTab === 'posts' ? (
                <PostSelector 
                  username={profileData.username}
                  onPostSelect={handlePostSelect}
                  selectedPosts={selectedPosts}
                  selectedReels={selectedReels}
                  maxPosts={maxTotalItems}
                  service={service}
                  posts={instagramPosts}
                  totalViews={service?.quantidade || 100}
                  loading={loadingPosts}
                />
              ) : (
                <ReelSelector 
                  username={profileData.username}
                  onSelectReels={handleReelSelect}
                  selectedReels={selectedReels}
                  selectedPosts={selectedPosts}
                  maxReels={maxTotalItems}
                  totalViews={service?.quantidade || 100}
                  loading={loadingReels}
                />
              )}
            </Card>

            {/* Informações do Pedido */}
            <div className="space-y-6 order-2 md:order-none">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-1">Informações do Pedido</h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    placeholder="E-mail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    placeholder="Telefone"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantidade de visualizações:</span>
                      <span>{service.quantidade.toLocaleString()}</span>
                    </div>
                    {(selectedPosts.length + selectedReels.length) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Visualizações por item:</span>
                        <span>{visualizacoesPerItem.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Itens selecionados:</span>
                      <span>{selectedItemsCount} / {maxTotalItems}</span>
                    </div>
                  </div>

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
                  
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mt-4"
                    disabled={loading || selectedPosts.length === 0 && selectedReels.length === 0 || !formData.email || !formData.name}
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
                </div>
              </Card>
            </div>
          </div>
        )}
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
