'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import PostSelector from '@/components/instagram/PostSelector';
import ReelSelector from '@/components/instagram/ReelSelector';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '@/app/checkout/instagram-v2/utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';
import { CouponInput } from '@/components/checkout/CouponInput';
import axios from 'axios';

const API_KEY = process.env.SCRAPECREATORS_API_KEY;

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
  is_reel?: boolean;
  view_count?: number;
}

interface InstagramPostsReelsStep2Props {
  serviceType: 'curtidas' | 'visualizacao' | 'comentarios' | 'reels';
  title: string;
}

export function InstagramPostsReelsStep2({ serviceType, title }: InstagramPostsReelsStep2Props) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [service, setService] = useState<Service | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [selectedReels, setSelectedReels] = useState<Post[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<Post[]>([]);
  const [instagramReels, setInstagramReels] = useState<Post[]>([]);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
    amount: number;
    qrCodeBase64?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('reels');
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [error, setError] = useState('');

  const supabase = createClient();

  // Calcular o número total de itens selecionados
  const selectedItemsCount = selectedPosts.length + selectedReels.length;
  const maxTotalItems = 5; // Máximo de 5 itens no total entre posts e reels
  
  // Calcular comentários por item
  const commentsPerItem = service?.quantidade && selectedItemsCount > 0
    ? Math.floor(service.quantidade / selectedItemsCount)
    : 0;

  // Função para extrair o código correto de um post do Instagram
  const extractPostCode = (post: any): string => {
    // Se o post já tem um código que não é numérico, usar esse código
    if (post.code && !/^\d+$/.test(post.code)) {
      return post.code;
    }
    
    // Se tem shortcode, usar o shortcode
    if (post.shortcode) {
      return post.shortcode;
    }
    
    // Se tem permalink ou link, extrair o código da URL
    if (post.permalink || post.link) {
      const url = post.permalink || post.link;
      const match = url.match(/instagram\.com\/p\/([^\/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Se nada funcionar, usar o ID (não ideal, mas é o que temos)
    return post.id;
  };

  // Função para buscar serviço pelo ID
  const fetchService = async (serviceId: string) => {
    try {
      const supabase = createClient();
      
      // Limpar o serviceId para garantir que não tenha aspas extras
      const cleanServiceId = serviceId ? serviceId.replace(/"/g, '') : '';
      console.log('Service ID limpo:', cleanServiceId);
      
      // Verificar se o ID é válido
      if (!cleanServiceId) {
        console.error('ID de serviço inválido ou vazio');
        return null;
      }
      
      console.log('Buscando serviço pelo external_id:', cleanServiceId);
      
      // Buscar primeiro pelo external_id
      let { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('external_id', cleanServiceId);
      
      console.log('Resultado da busca por external_id:', { 
        encontrado: data && data.length > 0, 
        quantidade: data?.length || 0,
        erro: error ? error.message : null 
      });
      
      // Se não encontrar pelo external_id, tentar pelo id
      if (!data || data.length === 0) {
        console.log('Serviço não encontrado pelo external_id, tentando pelo id');
        const result = await supabase
          .from('services')
          .select('*')
          .eq('id', cleanServiceId);
          
        data = result.data;
        error = result.error;
        
        console.log('Resultado da busca por id:', { 
          encontrado: data && data.length > 0, 
          quantidade: data?.length || 0,
          erro: error ? error.message : null 
        });
      }
      
      // Verificar se encontramos o serviço
      if (error) {
        console.error('Erro ao buscar serviço:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.error('Nenhum serviço encontrado para o ID:', cleanServiceId);
        
        // Tentar uma busca mais ampla para depuração
        console.log('Realizando busca ampla para depuração...');
        const { data: allServices, error: allError } = await supabase
          .from('services')
          .select('id, external_id, name')
          .limit(5);
          
        if (allError) {
          console.error('Erro ao buscar serviços para depuração:', allError);
        } else {
          console.log('Amostra de serviços disponíveis:', allServices);
        }
        
        return null;
      }
      
      // Pegar o primeiro serviço encontrado
      const serviceData = data[0];
      console.log('Serviço encontrado:', serviceData);
      
      return serviceData;
    } catch (error) {
      console.error('Erro ao buscar serviço:', error);
      return null;
    }
  };

  // Função para buscar posts e reels do Instagram em uma única chamada
  const fetchInstagramData = async (type: 'posts' | 'reels', nextMaxId?: string) => {
    if (!profileData?.username) {
      console.error(`fetchInstagramData (${type}): profileData ou username não definido`, profileData);
      return;
    }
    
    console.log(`Iniciando fetchInstagramData para ${type} do usuário ${profileData.username}`);
    
    try {
      if (type === 'posts') {
        setLoadingPosts(true);
        const apiUrl = `/checkout/instagram-v2/curtidas?username=${profileData.username}&type=posts`;
        
        console.log('Buscando posts do Instagram:', apiUrl);
        
        const response = await axios.get(apiUrl);
        
        // Log detalhado da resposta
        console.log('Resposta da API para posts:');
        console.log('Status:', response.status);
        console.log('Estrutura da resposta:', Object.keys(response.data));
        console.log('Quantidade de itens:', response.data.items?.length || 0);
        
        if (response.data && response.data.items) {
          console.log(`Recebidos ${response.data.items.length} posts do Instagram`);
          response.data.items.forEach(item => {
            console.log(`Media Type: ${item.media_type}`);
          });
          const reels = response.data.items.filter(item => item.media_type === 2);
          console.log(`Filtrados ${reels.length} reels do Instagram`);
          
          // Verificar e normalizar os dados recebidos
          const normalizedPosts = response.data.items.map((post: any) => {
            // Log para cada post
            console.log(`Processando post ${post.id || post.pk}:`, {
              id: post.id || post.pk,
              code: post.code || post.shortcode,
              image_url: post.image_url || post.thumbnail_url || post.display_url
            });
            
            return {
              id: post.id || post.pk || '',
              code: post.code || post.shortcode || '',
              shortcode: post.shortcode || post.code || '',
              image_url: post.image_url || post.thumbnail_url || post.display_url || '',
              caption: post.caption || '',
              like_count: post.like_count || 0,
              comment_count: post.comment_count || 0,
              thumbnail_url: post.thumbnail_url || post.image_url || post.display_url || '',
              display_url: post.display_url || post.image_url || post.thumbnail_url || '',
              is_reel: false
            };
          });
          
          console.log('Posts normalizados:', normalizedPosts.slice(0, 2));
          setInstagramPosts(normalizedPosts);
        } else {
          console.error('Formato de resposta inválido para posts:', response.data);
          if (response.data && response.data.error) {
            console.error('Erro retornado pela API:', response.data.error);
          }
          setInstagramPosts([]);
        }
      } else if (type === 'reels') {
        setLoadingReels(true);
        const apiUrl = `https://api.scrapecreators.com/v2/instagram/user/posts?handle=${profileData.username}&next_max_id=${nextMaxId || ''}`;
        console.log('Buscando reels do Instagram usando o endpoint específico:', apiUrl);
        
        const reelsResponse = await axios.get(apiUrl, {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY }
        });
        
        // Log detalhado da resposta
        console.log('Resposta da API para reels:', reelsResponse.data);
        console.log('Status:', reelsResponse.status);
        console.log('Estrutura da resposta:', Object.keys(reelsResponse.data));
        console.log('Quantidade de itens:', reelsResponse.data.items?.length || 0);
        
        console.log('Resposta completa da API para reels:', reelsResponse.data); // Log da resposta completa
        
        if (reelsResponse.data && reelsResponse.data.items && reelsResponse.data.items.length > 0) {
          console.log(`Recebidos ${reelsResponse.data.items.length} reels do Instagram`);
          
          // Verificar e normalizar os dados recebidos
          const normalizedReels = reelsResponse.data.items.map(reel => {
            console.log(`Normalizando reel: ${reel.id}`, reel);
            console.log(`Contagem de visualizações: ${reel.view_count}`); // Log para verificar o valor de visualizações
            return {
              id: reel.id,
              code: reel.code,
              image_url: reel.display_uri || reel.thumbnail_url || '', // Garantir que sempre tenha um valor
              is_reel: true,
              caption: reel.caption?.text || '',
              like_count: reel.like_count || 0,
              view_count: reel.view_count || 0, // Capturando contagem de visualizações
              comment_count: reel.comment_count || 0
            };
          });
          console.log('Reels normalizados:', normalizedReels);
          setInstagramReels(normalizedReels);
        } else {
          console.error('Formato de resposta inválido para reels:', reelsResponse.data);
          console.error('Verifique se o campo items está presente e contém dados.');
          setInstagramReels([]);
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar ${type} do Instagram:`, error);
      
      // Log detalhado do erro
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro Axios:');
        console.error('Status:', error.response?.status);
        console.error('Dados:', error.response?.data);
        console.error('Configuração:', error.config);
      }
      
      if (type === 'posts') {
        setInstagramPosts([]);
      } else {
        setInstagramReels([]);
      }
    } finally {
      if (type === 'posts') {
        setLoadingPosts(false);
        setPostsLoaded(true);
      } else {
        setLoadingReels(false);
        setReelsLoaded(true);
      }
    }
  };

  // Efeito para buscar apenas reels quando profileData for definido
  useEffect(() => {
    if (profileData?.username) {
      console.log('profileData foi definido, buscando reels para:', profileData.username);
      
      // Buscar apenas reels
      fetchInstagramData('reels');
    }
  }, [profileData]);

  useEffect(() => {
    try {
      // Recuperar dados do checkout do localStorage
      const checkoutData = localStorage.getItem('checkoutProfileData');
      
      if (checkoutData) {
        const parsedCheckoutData = JSON.parse(checkoutData);
        console.log('Dados do checkout recuperados:', parsedCheckoutData);
        
        // Verificar se temos um external_id válido
        let externalId = parsedCheckoutData.external_id;
        if (!externalId) {
          // Tentar buscar de outros campos possíveis
          externalId = parsedCheckoutData.serviceId || parsedCheckoutData.service_id;
          console.log('External ID alternativo encontrado:', externalId);
        }
        
        if (!externalId) {
          console.error('External ID não encontrado nos dados de checkout');
          toast.error('ID do serviço não encontrado. Por favor, volte à etapa anterior.');
          return;
        }
        
        // Recuperar dados do perfil
        const profileData = 
          parsedCheckoutData.profileData || 
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
        } else {
          console.error('Dados do perfil não encontrados');
          toast.error('Dados do perfil não encontrados. Por favor, volte à etapa anterior.');
          return;
        }

        if (externalId) {
          console.log('Iniciando busca de serviço para o ID:', externalId);
          
          // Buscar apenas o serviço aqui, posts e reels serão buscados no outro useEffect
          fetchService(externalId).then(serviceData => {
            if (serviceData) {
              // Definir o ID do provedor padrão se não estiver presente
              if (!serviceData.provider_id) {
                serviceData.provider_id = '1';
              }
              console.log('Serviço encontrado e configurado:', serviceData);
              setService(serviceData);
            } else {
              console.error('Serviço não encontrado para o ID:', externalId);
              toast.error('Serviço não encontrado. Por favor, tente novamente.');
            }
          }).catch(error => {
            console.error('Erro ao buscar serviço:', error);
            toast.error('Erro ao carregar dados do serviço. Por favor, tente novamente.');
          });
        } else {
          console.error('Dados insuficientes para buscar serviço');
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
    if (!service || !profileData || !formData || (selectedPosts.length + selectedReels.length) === 0 || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    // Calcular quantidade de curtidas/visualizações/comentários por item
    const totalItems = selectedPosts.length + selectedReels.length;
    const totalQuantity = service.quantidade;
    const quantityPerItem = Math.floor(totalQuantity / totalItems);
    const remainingQuantity = totalQuantity % totalItems;

    // Preparar metadados dos posts
    const postsMetadata = selectedPosts.map((post, index) => {
      // Usar o campo code correto para a URL do post
      const postCode = post.code || post.shortcode || post.id;
      return {
        postId: post.id,
        postCode: postCode,
        postLink: `https://instagram.com/p/${postCode}`,
        quantity: index === 0 ? quantityPerItem + remainingQuantity : quantityPerItem,
        type: 'post', // Adicionar tipo explícito para posts
        imageUrl: post.image_url || post.thumbnail_url || post.display_url || ''
      };
    });

    const reelsMetadata = selectedReels.map((reel, index) => {
      // Usar o campo code correto para a URL do reel
      const reelCode = reel.code || reel.shortcode || reel.id;
      return {
        postId: reel.id,
        postCode: reelCode,
        postLink: `https://instagram.com/reel/${reelCode}`,
        quantity: quantityPerItem,
        type: 'reel', // Adicionar tipo explícito para reels
        imageUrl: reel.image_url || reel.thumbnail_url || reel.display_url || ''
      };
    });

    // Determinar o tipo de quantidade com base no serviço
    let quantityType = 'curtidas';
    if (serviceType === 'visualizacao') {
      quantityType = 'visualizações';
    } else if (serviceType === 'comentarios') {
      quantityType = 'comentários';
    } else if (serviceType === 'reels') {
      quantityType = 'visualizações';
    }

    return {
      user_id: formData.name || null,
      order_id: paymentData.paymentId,
      type: serviceType,
      amount: finalAmount || service.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentData.paymentId,
      metadata: {
        posts: [...postsMetadata, ...reelsMetadata],
        serviceDetails: service,
        quantityType: quantityType,
        totalQuantity: totalQuantity,
        username: profileData.username
      },
      customer_name: formData.name || null,
      customer_email: formData.email || null,
      customer_phone: formData.phone || null,
      discount: discountAmount || 0,
      coupon: appliedCoupon || null
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
    if (!profileData || !service || (selectedPosts.length + selectedReels.length) === 0) {
      toast.error('Selecione pelo menos um post ou reel');
      return;
    }

    setLoading(true);

    try {
      // Log detalhado dos posts e reels selecionados
      console.log('📊 Posts selecionados para pagamento:', selectedPosts.map(post => ({
        id: post.id,
        code: post.code,
        shortcode: post.shortcode,
        url: `https://instagram.com/p/${post.code}`
      })));
      
      console.log('📊 Reels selecionados para pagamento:', selectedReels.map(reel => ({
        id: reel.id,
        code: reel.code,
        shortcode: reel.shortcode,
        url: `https://instagram.com/reel/${reel.code}`
      })));

      // Preparar os dados para o pagamento
      const postIds = selectedPosts.map(post => post.id);
      const reelIds = selectedReels.map(reel => reel.id);
      const postCodes = selectedPosts.map(post => extractPostCode(post));
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
        posts: [...selectedPosts, ...selectedReels],
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
  };

  // Função para atualizar o estado de seleção quando o usuário troca entre as abas
  const updateSelectionState = (activeTab: 'posts' | 'reels') => {
    console.log('updateSelectionState chamado com activeTab:', activeTab);
    setActiveTab(activeTab);
  };

  // Função para verificar se um item pode ser selecionado com base no limite total
  const canSelectMoreItems = (currentTab: 'posts' | 'reels') => {
    const totalSelected = selectedPosts.length + selectedReels.length;
    return totalSelected < maxTotalItems;
  };

  // Função para lidar com a seleção de posts
  const handlePostSelect = useCallback((posts: Post[]) => {
    const totalSelected = posts.length + selectedReels.length;
    if (totalSelected > maxTotalItems) {
      toast.error(`Você só pode selecionar até ${maxTotalItems} itens no total (posts + reels)`);
      return;
    }
    setSelectedPosts(posts);
  }, [selectedReels.length, maxTotalItems]);

  // Função para lidar com a seleção de reels
  const handleReelSelect = useCallback((reels: Post[]) => {
    const totalSelected = selectedPosts.length + reels.length;
    if (totalSelected > maxTotalItems) {
      toast.error(`Você só pode selecionar até ${maxTotalItems} itens no total (posts + reels)`);
      return;
    }
    setSelectedReels(reels);
  }, [selectedPosts.length, maxTotalItems]);

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
              
              {/* Título da seção de Reels */}
              <div className="flex items-center justify-center mb-6">
                <button
                  className="px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider
                    transition-all duration-300 ease-in-out transform
                    bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg"
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Reels ({instagramReels?.length || 0})
                  </span>
                </button>
              </div>

              {/* Conteúdo de Reels */}
              {instagramReels && instagramReels.length > 0 && (
                <ReelSelector
                  reels={instagramReels}
                  loading={loadingReels}
                  loadingMessage="Carregando reels do Instagram..."
                  selectedReels={selectedReels}
                  onSelectReels={handleReelSelect}
                  maxReels={maxTotalItems}
                  selectedPosts={selectedPosts}
                  serviceType={serviceType}
                />
              )}
              {instagramReels && instagramReels.length === 0 && (
                <div className="text-center text-lg font-medium text-gray-700 mt-4">
                  Não encontramos reels públicos para @{profileData.username}. Verifique se o nome de usuário está correto e se o perfil é público.
                </div>
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantidade de {serviceType === 'curtidas' ? 'curtidas' : serviceType === 'visualizacao' ? 'visualizações' : 'comentários'}:</span>
                      <span>{service.quantidade.toLocaleString()}</span>
                    </div>
                    {(selectedPosts.length + selectedReels.length) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>{serviceType === 'curtidas' ? 'Curtidas' : serviceType === 'visualizacao' ? 'Visualizações' : 'Comentários'} por item:</span>
                        <span>{commentsPerItem.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Itens selecionados:</span>
                      <span>{selectedItemsCount} / {maxTotalItems}</span>
                    </div>

                    {/* Miniaturas dos itens selecionados */}
                    {selectedItemsCount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">Itens selecionados:</p>
                        <div className="flex flex-wrap gap-0">
                          {selectedPosts.map((post) => (
                            <div key={`post-${post.id}`} className="relative w-12 h-12 rounded-sm overflow-hidden border border-pink-300 group m-0.5">
                              <img 
                                src={getProxiedImageUrl(post.image_url)} 
                                alt="Post selecionado" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.src.includes('placeholder-post.svg')) {
                                    target.src = '/images/placeholder-post.svg';
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                              <div className="absolute bottom-0 left-0 right-0 text-white text-[8px] bg-pink-500 text-center">
                                Post
                              </div>
                              {/* Botão X para remover */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedPosts = selectedPosts.filter(p => p.id !== post.id);
                                  setSelectedPosts(updatedPosts);
                                  handlePostSelect(updatedPosts);
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] 
                                  shadow-md hover:bg-red-600"
                                aria-label="Remover post"
                              >
                                ×
                              </button>
                            </div>
                          ))}
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
                                Reel
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
                          <span className="flex items-center">
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

      {(loadingPosts || loadingReels) && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-center text-lg font-medium text-gray-700">Buscando dados do Instagram</p>
            <p className="text-center text-sm text-gray-500 mt-2">Isso pode levar até 60 segundos. Por favor, aguarde...</p>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-red-100 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-center text-lg font-medium text-red-700">{error}</p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem quando não há posts ou reels */}
      {!error && postsLoaded && reelsLoaded && instagramPosts.length === 0 && instagramReels.length === 0 && profileData?.username && (
        <div className="mt-6 text-center">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex flex-col items-center justify-center">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Não encontramos posts ou reels públicos para @{profileData.username}. Verifique se o nome de usuário está correto e se o perfil é público.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
