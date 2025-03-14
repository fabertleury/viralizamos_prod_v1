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
  serviceType: 'curtidas' | 'visualizacao' | 'comentarios';
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
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handlePostSelect = useCallback((posts: Post[]) => {
    setSelectedPosts(posts);
  }, []);

  const handleReelSelect = useCallback((reels: Post[]) => {
    setSelectedReels(reels);
  }, []);

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
  const fetchInstagramData = async (username: string) => {
    setLoadingPosts(true);
    setLoadingReels(true);
    setError(null);
    
    // Criar um controller para abortar a requisição em caso de timeout
    const controller = new AbortController();
    
    // Configurar um timeout de 60 segundos
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);
    
    try {
      // Usar a nova API de visualização que combina posts e reels
      const response = await fetch(`/api/instagram/visualizacao/${username}`, {
        signal: controller.signal
      });
      
      // Limpar o timeout se a requisição completar antes
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados do Instagram: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados do Instagram recebidos:', JSON.stringify(data));
      
      // Verificar se a resposta tem o formato esperado
      if (!data) {
        console.error('Resposta vazia da API');
        setInstagramPosts([]);
        setInstagramReels([]);
        setPostsLoaded(true);
        setReelsLoaded(true);
        setError("Não foi possível obter dados do Instagram. Por favor, tente novamente mais tarde.");
        return null;
      }
      
      // Verificar se temos mensagens de erro específicas da API
      if (data.message) {
        if (data.fromCache) {
          console.log(`Usando dados em cache (${data.cacheAge}s atrás)`);
        }
        
        // Exibir mensagem específica se não houver posts ou reels
        if (!data.hasPosts && !data.hasReels) {
          setError(`@${username} não possui posts ou reels públicos. Verifique se o nome de usuário está correto e se o perfil é público.`);
        }
      }
      
      // Processar posts - verificar se posts existe e qual seu formato
      if (data.posts) {
        console.log('Tipo de data.posts:', typeof data.posts);
        
        // Se posts for um array, usar diretamente
        if (Array.isArray(data.posts)) {
          console.log('Posts recebidos como array:', data.posts.length);
          setInstagramPosts(data.posts);
        } 
        // Se posts for um objeto com propriedades, pode ser que a API tenha mudado o formato
        else if (typeof data.posts === 'object') {
          console.log('Posts recebidos como objeto:', Object.keys(data.posts));
          // Verificar se há uma propriedade que contém os posts
          if (data.posts.items && Array.isArray(data.posts.items)) {
            console.log('Posts encontrados em data.posts.items:', data.posts.items.length);
            setInstagramPosts(data.posts.items);
          } else {
            console.error('Formato de posts desconhecido:', data.posts);
            setInstagramPosts([]);
          }
        } else {
          console.error('Formato de posts desconhecido:', data.posts);
          setInstagramPosts([]);
        }
      } else {
        console.log('Nenhum post recebido');
        setInstagramPosts([]);
      }
      
      // Processar reels - verificar se reels existe e qual seu formato
      if (data.reels) {
        console.log('Tipo de data.reels:', typeof data.reels);
        
        // Se reels for um array, usar diretamente
        if (Array.isArray(data.reels)) {
          console.log('Reels recebidos como array:', data.reels.length);
          setInstagramReels(data.reels);
        } 
        // Se reels for um objeto com propriedades, pode ser que a API tenha mudado o formato
        else if (typeof data.reels === 'object') {
          console.log('Reels recebidos como objeto:', Object.keys(data.reels));
          // Verificar se há uma propriedade que contém os reels
          if (data.reels.items && Array.isArray(data.reels.items)) {
            console.log('Reels encontrados em data.reels.items:', data.reels.items.length);
            setInstagramReels(data.reels.items);
          } else {
            console.error('Formato de reels desconhecido:', data.reels);
            setInstagramReels([]);
          }
        } else {
          console.error('Formato de reels desconhecido:', data.reels);
          setInstagramReels([]);
        }
      } else {
        console.log('Nenhum reel recebido');
        setInstagramReels([]);
      }
      
      // Atualizar flags de carregamento
      setPostsLoaded(true);
      setReelsLoaded(true);
      
      return data;
    } catch (fetchError: unknown) {
      // Limpar o timeout em caso de erro
      clearTimeout(timeoutId);
      
      // Verificar se foi um erro de timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Timeout ao buscar dados do Instagram');
        setError('O tempo limite foi excedido ao buscar os dados do Instagram. Por favor, tente novamente.');
      } else {
        console.error('Erro ao buscar dados do Instagram:', fetchError);
        setError('Ocorreu um erro ao buscar os dados do Instagram. Por favor, tente novamente mais tarde.');
      }
      
      // Atualizar flags de carregamento mesmo em caso de erro
      setPostsLoaded(true);
      setReelsLoaded(true);
      
      return null;
    }
  };

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

        if (externalId && profileData?.username) {
          console.log('Iniciando busca de serviço e posts para o usuário:', profileData.username);
          console.log('External ID para busca de serviço:', externalId);
          
          // Buscar serviço e posts em paralelo
          Promise.all([
            fetchService(externalId),
            fetchInstagramData(profileData.username)
          ]).then(([serviceData, instagramData]) => {
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
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar dados. Por favor, tente novamente.');
          });
        } else {
          console.error('Dados insuficientes para buscar serviço e posts');
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

  useEffect(() => {
    const fetchReels = async () => {
      try {
        if (profileData?.username && !reelsLoaded) {
          setLoadingReels(true);
          await fetchInstagramData(profileData.username);
          setLoadingReels(false);
        }
      } catch (error) {
        console.error('Erro ao buscar reels:', error);
      }
    };

    fetchReels();
  }, [profileData, reelsLoaded]);

  useEffect(() => {
    if (activeTab === 'reels' && !reelsLoaded && profileData?.username) {
      fetchInstagramData(profileData.username);
    }
  }, [activeTab, reelsLoaded, profileData]);

  const prepareTransactionData = () => {
    if (!service || !profileData || !formData || (selectedPosts.length + selectedReels.length) === 0 || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    // Calcular quantidade de comentários por post
    const totalItems = selectedPosts.length + selectedReels.length;
    const totalComments = service.quantidade;
    const commentsPerItem = Math.floor(totalComments / totalItems);
    const remainingComments = totalComments % totalItems;

    // Preparar metadados dos posts
    const postsMetadata = selectedPosts.map((post, index) => {
      // Usar o campo code correto para a URL do post
      const postCode = post.code || post.shortcode || post.id;
      return {
        postId: post.id,
        postCode: postCode,
        postLink: `https://instagram.com/p/${postCode}`,
        comments: index === 0 ? commentsPerItem + remainingComments : commentsPerItem,
        type: 'post' // Adicionar tipo explícito para posts
      };
    });

    const reelsMetadata = selectedReels.map((reel, index) => {
      // Usar o campo code correto para a URL do reel
      const reelCode = reel.code || reel.shortcode || reel.id;
      return {
        postId: reel.id,
        postCode: reelCode,
        postLink: `https://instagram.com/reel/${reelCode}`,
        comments: commentsPerItem,
        type: 'reel' // Adicionar tipo explícito para reels
      };
    });

    return {
      user_id: formData.name || null,
      order_id: paymentData.paymentId,
      type: serviceType,
      amount: service.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentData.paymentId,
      metadata: {
        posts: [...postsMetadata, ...reelsMetadata],
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
                      fetchInstagramData(profileData.username);
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
                      fetchInstagramData(profileData.username);
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
                  totalComments={service?.quantidade || 100}
                  loading={loadingPosts}
                />
              ) : (
                <ReelSelector 
                  username={profileData.username}
                  onSelectReels={handleReelSelect}
                  selectedReels={selectedReels}
                  selectedPosts={selectedPosts}
                  maxReels={maxTotalItems}
                  totalComments={service?.quantidade || 100}
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
      {!error && postsLoaded && reelsLoaded && instagramPosts.length === 0 && instagramReels.length === 0 && username && (
        <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-800">Nenhum conteúdo encontrado</p>
              <p className="mt-1 text-sm text-yellow-700">
                Não encontramos posts ou reels públicos para @{username}. Verifique se o nome de usuário está correto e se o perfil é público.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
