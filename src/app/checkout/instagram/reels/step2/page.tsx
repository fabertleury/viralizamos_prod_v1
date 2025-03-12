'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import ReelSelector from '@/components/instagram/reels/ReelSelector';
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
  provider_id: string;
}

interface Post {
  id: string;
  code: string;
  shortcode: string;
  image_url: string;
  caption?: string;
  like_count?: number;
  comment_count?: number;
  thumbnail_url?: string;
  display_url?: string;
  image_versions?: any;
}

interface InstagramPost {
  id: string;
  code: string;
  shortcode: string;
  image_url: string;
  caption?: string;
}

export default function Step2Page() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [service, setService] = useState<Service | null>(null);
  const [selectedReels, setSelectedReels] = useState<Post[]>([]);
  const [instagramReels, setInstagramReels] = useState<Post[]>([]);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
    amount: number;
    qrCodeBase64?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const supabase = createClient();

  const handleReelSelect = useCallback((reels: InstagramPost[]) => {
    setSelectedReels(reels as Post[]);
  }, []);

  // Calcular o número total de itens selecionados
  const selectedItemsCount = selectedReels.length;
  const maxTotalItems = 5; // Máximo de 5 reels
  
  // Calcular visualizações por item
  const viewsPerItem = service?.quantidade && selectedItemsCount > 0 
    ? Math.floor(service.quantidade / selectedItemsCount) 
    : 0;

  // Função para extrair o código correto de um reel do Instagram
  const extractPostCode = (post: any): string => {
    // Se o post já tem um código que não é numérico, usar esse código
    if (post.code && !/^\d+$/.test(post.code)) {
      console.log('✅ Usando código existente:', post.code);
      return post.code;
    }
    
    // Se tem shortcode, usar o shortcode
    if (post.shortcode) {
      console.log('✅ Usando shortcode:', post.shortcode);
      return post.shortcode;
    }
    
    // Se tem permalink ou link, extrair o código da URL
    if (post.permalink || post.link) {
      const url = post.permalink || post.link;
      const match = url.match(/instagram\.com\/reel\/([^\/]+)/);
      if (match && match[1]) {
        console.log('✅ Código extraído da URL:', match[1]);
        return match[1];
      }
    }
    
    // Se nada funcionar, usar o ID (não ideal, mas é o que temos)
    console.warn('⚠️ Não foi possível extrair um código curto válido, usando ID:', post.id);
    return post.id;
  };

  const fetchInstagramReels = async (username: string) => {
    try {
      // Se já carregou os reels, não precisa buscar novamente
      if (reelsLoaded && instagramReels.length > 0) {
        console.log('Usando reels em cache:', instagramReels.length);
        return instagramReels;
      }

      setLoadingReels(true);
      
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/reels',
        params: { username_or_id_or_url: username },
        headers: {
          'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };
      const response = await axios.request(options);
      console.log('Resposta da API de reels:', response.data);

      // Verificar se a resposta tem a estrutura esperada
      const reels = response.data.data?.items || response.data.items || [];
      console.log('Reels encontrados:', reels.length);

      // Mapear os reels para o formato esperado
      const formattedReels: Post[] = reels.map((reel: any) => {
        // Tentar diferentes caminhos para a imagem do reel
        const imageUrl = 
          reel.image_versions?.items?.[0]?.url || 
          reel.thumbnail_url || 
          reel.cover_frame_url || 
          reel.display_url;

        // Extrair o código correto do reel para a URL
        const reelCode = extractPostCode(reel);
        
        return {
          id: reel.id || '',
          code: reelCode,
          shortcode: reelCode,
          image_url: imageUrl,
          caption: reel.caption 
              ? (typeof reel.caption === 'object' 
                ? reel.caption.text || 'Sem legenda'
                : String(reel.caption)) 
              : 'Sem legenda',
          like_count: reel.like_count || reel.likes_count || 0,
          comment_count: reel.comment_count || reel.comments_count || 0,
          // Alterar o nome de 'Curtidas' para 'Visualizações'
          display_name: 'Visualizações',
          display_icon: '👁️', // Emoji de visualização
          thumbnail_url: reel.thumbnail_url || '',
          display_url: reel.display_url || '',
          image_versions: reel.image_versions || null
        };
      }).filter(reel => reel.image_url || reel.thumbnail_url || reel.display_url); // Remover reels sem imagem

      console.log('Reels formatados:', formattedReels.length);
      setInstagramReels(formattedReels);
      setReelsLoaded(true);
      setLoadingReels(false);
      return formattedReels;
    } catch (error) {
      console.error('Erro ao buscar reels do Instagram:', error);
      setLoadingReels(false);
      return [];
    }
  };

  const fetchService = async (externalId: string) => {
    console.log('Buscando serviço com ID:', externalId);
    
    try {
      const supabase = createClient();
      
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

  useEffect(() => {
    const checkoutData = localStorage.getItem('checkoutProfileData');
    console.log('Dados de checkout brutos:', checkoutData);

    try {
      if (checkoutData) {
        const parsedCheckoutData = JSON.parse(checkoutData);
        console.log('Dados de checkout parseados:', parsedCheckoutData);

        // Recuperar o external_id com mais flexibilidade
        const externalId = 
          parsedCheckoutData.external_id || 
          parsedCheckoutData.serviceId || 
          localStorage.getItem('serviceId') || 
          localStorage.getItem('external_id');

        // Recuperar a quantidade, se disponível
        const quantity = parsedCheckoutData.quantity;
        
        console.log('External ID recuperado:', externalId);
        console.log('Quantidade recuperada:', quantity);

        // Recuperar o perfil do usuário
        const profileData = 
          parsedCheckoutData.profileData || 
          parsedCheckoutData.profile || 
          parsedCheckoutData.user;

        console.log('Perfil recuperado:', profileData);

        if (profileData) {
          setProfileData(profileData);
          // Atualizar formData com dados do perfil, se disponíveis
          setFormData({
            name: parsedCheckoutData.name || '',
            email: parsedCheckoutData.email || '',
            phone: parsedCheckoutData.phone || ''
          });
        }

        if (externalId && profileData?.username) {
          console.log('Iniciando busca de serviço e reels para o usuário:', profileData.username);
          
          // Buscar serviço e reels em paralelo
          Promise.all([
            fetchService(externalId),
            fetchInstagramReels(profileData.username)
          ]).then(([serviceData, reelsData]) => {
            if (serviceData) {
              // Definir o ID do provedor padrão se não estiver presente
              if (!serviceData.provider_id) {
                serviceData.provider_id = '1';
              }
              setService(serviceData);
            } else {
              console.error('Serviço não encontrado');
              toast.error('Serviço não encontrado. Por favor, tente novamente.');
            }
          }).catch(error => {
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar dados. Por favor, tente novamente.');
          });
        } else {
          console.error('Dados insuficientes para buscar serviço e reels');
          toast.error('Dados insuficientes. Por favor, volte à etapa anterior.');
        }
      } else {
        console.error('Nenhum dado de checkout encontrado');
        toast.error('Nenhum dado de checkout encontrado. Por favor, volte à etapa anterior.');
      }
    } catch (error) {
      console.error('Erro ao processar dados de checkout:', error);
      toast.error('Erro ao processar dados. Por favor, tente novamente.');
    }
  }, []);

  const prepareTransactionData = () => {
    if (!service || !profileData || !formData || selectedReels.length === 0 || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    // Calcular quantidade de visualizações por reel
    const totalItems = selectedReels.length;
    const totalViews = service.quantidade;
    const viewsPerItem = Math.floor(totalViews / totalItems);
    const remainingViews = totalViews % totalItems;

    // Preparar metadados dos reels
    const reelsMetadata = selectedReels.map((reel, index) => {
      // Usar o campo code correto para a URL do reel
      const reelCode = reel.code || reel.shortcode || reel.id;
      return {
        postId: reel.id,
        postCode: reelCode,
        postLink: `https://instagram.com/reel/${reelCode}`,
        views: index === 0 ? viewsPerItem + remainingViews : viewsPerItem,
        type: 'reel'
      };
    });

    return {
      user_id: formData.name || null,
      order_id: paymentData.paymentId,
      type: 'reels',
      amount: service.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentData.paymentId,
      metadata: {
        reels: reelsMetadata,
        serviceDetails: service
      },
      customer_name: formData.name || null,
      customer_email: formData.email || null,
      customer_phone: formData.phone || null,
      target_username: profileData.username,
      target_full_name: profileData.full_name,
      payment_qr_code: paymentData.qrCodeText || null,
      payment_external_reference: paymentData.paymentId,
      service_id: service.id,
      provider_id: service.provider_id,
      target_profile_link: `https://www.instagram.com/${profileData.username}/`
    };
  };

  const sendTransactionToAdmin = async () => {
    try {
      setLoading(true);
      const transactionData = prepareTransactionData();

      if (!transactionData) {
        toast.error('Não foi possível preparar os dados da transação');
        return;
      }

      const response = await axios.post('/admin/transacoes', transactionData);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Transação registrada com sucesso');
        router.push('/pedidos');
      } else {
        toast.error('Erro ao registrar transação');
      }
    } catch (error) {
      console.error('Erro ao enviar transação:', error);
      toast.error('Falha ao processar transação');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profileData || !service || selectedReels.length === 0) {
      toast.error('Selecione pelo menos um reel');
      return;
    }

    setLoading(true);

    try {
      // Log detalhado dos reels selecionados
      console.log('📊 Reels selecionados para pagamento:', selectedReels.map(reel => ({
        id: reel.id,
        code: reel.code,
        shortcode: reel.shortcode,
        url: `https://instagram.com/reel/${reel.code}`
      })));

      // Preparar os dados para o pagamento
      const reelIds = selectedReels.map(reel => reel.id);
      const reelCodes = selectedReels.map(reel => extractPostCode(reel));

      // Estruturar os dados conforme esperado pela API
      const paymentData = {
        service: {
          id: service.id,
          name: service.name,
          price: finalAmount || service.preco,
          preco: finalAmount || service.preco,
          quantity: service.quantidade,
          quantidade: service.quantidade,
          provider_id: service.provider_id
        },
        profile: profileData,
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        },
        reels: selectedReels,
        amount: finalAmount || service.preco
      };

      console.log('Enviando dados para API de pagamento:', paymentData);

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
        throw new Error(error.message || 'Erro ao criar pagamento');
      }

      const paymentResponse = await response.json();
      
      console.log('Dados completos do pagamento:', {
        paymentId: paymentResponse.id,
        paymentIdType: typeof paymentResponse.id,
        paymentIdLength: paymentResponse.id?.length,
        paymentData: JSON.stringify(paymentResponse, null, 2)
      });

      // Garantir que temos todos os dados necessários
      if (!paymentResponse.id || !paymentResponse.qr_code) {
        throw new Error('Dados de pagamento incompletos');
      }

      setPaymentData({
        qrCodeText: paymentResponse.qr_code,
        paymentId: paymentResponse.id,
        amount: service.preco,
        qrCodeBase64: paymentResponse.qr_code_base64
      });

      await sendTransactionToAdmin();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao criar pagamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentData(null);
    router.push('/dashboard');
  };

  return (
    <div>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {profileData && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Seleção de Reels */}
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
              
              {/* Título da seção de reels */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div 
                  className="px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider 
                  bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg"
                >
                  <span className="flex items-center">
                    Reels ({instagramReels?.length || 0})
                  </span>
                </div>
              </div>

              <ReelSelector 
                username={profileData.username}
                onSelectReels={handleReelSelect}
                selectedReels={selectedReels}
                selectedPosts={[]}
                maxReels={maxTotalItems}
                totalViews={service?.quantidade || 100}
                loading={loadingReels}
              />
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantidade de visualizações:</span>
                      <span>{service.quantidade.toLocaleString()}</span>
                    </div>
                    {selectedReels.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Visualizações por reel:</span>
                        <span>{viewsPerItem.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Reels selecionados:</span>
                      <span>{selectedItemsCount} / {maxTotalItems}</span>
                    </div>

                    {/* Miniaturas dos reels selecionados */}
                    {selectedItemsCount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">Reels selecionados:</p>
                        <div className="flex flex-wrap gap-0">
                          {selectedReels.map((reel) => (
                            <div key={`reel-${reel.id}`} className="relative w-12 h-12 rounded-sm overflow-hidden border border-pink-300 group m-0.5">
                              <img 
                                src={getProxiedImageUrl(reel.image_url)} 
                                alt="Reel selecionado" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.src.includes('placeholder-reel.svg')) {
                                    target.src = '/images/placeholder-reel.svg';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                              <div className="absolute bottom-0 left-0 right-0 text-white text-[8px] bg-purple-500 text-center">
                                Reels
                              </div>
                              {/* Botão X para remover */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedReels = selectedReels.filter(r => r.id !== reel.id);
                                  setSelectedReels(updatedReels);
                                  handleReelSelect(updatedReels);
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] 
                                  shadow-md hover:bg-red-600"
                                aria-label="Remover reel"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                      <span>Valor total:</span>
                      <span>R$ {(finalAmount || service.preco).toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>Valor original:</span>
                        <span className="line-through">R$ {service.preco.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Botão de pagamento PIX */}
                    <div className="flex items-center justify-center my-4">
                      <button 
                        onClick={() => handleSubmit()}
                        disabled={loading || selectedItemsCount === 0 || !formData.name || !formData.email || !formData.phone}
                        className={`
                          px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider 
                          transition-all duration-300 ease-in-out transform w-full
                          ${loading || selectedItemsCount === 0 || !formData.name || !formData.email || !formData.phone
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-105 hover:shadow-lg'}
                        `}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processando...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            PAGAR COM PIX
                          </span>
                        )}
                      </button>
                    </div>

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
              </Card>
            </div>
          </div>
        )}
      </main>

      {paymentData ? (
        <div className="mt-6">
          <PaymentPixModal
            qrCodeText={paymentData.qrCodeText}
            qrCodeBase64={paymentData.qrCodeBase64}
            amount={paymentData.amount}
            paymentId={paymentData.paymentId}
            onClose={() => setPaymentData(null)}
            isOpen={!!paymentData}
          />
        </div>
      ) : null}
    </div>
  );
}
