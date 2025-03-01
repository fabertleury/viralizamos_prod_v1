'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import PostSelector from '@/components/instagram/curtidas/PostSelector';
import ReelSelector from '@/components/instagram/curtidas/ReelSelector';
import { Header } from '../../components/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';
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
}

interface Post {
  id: string;
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
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);
  const [selectedReels, setSelectedReels] = useState<InstagramPost[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<Post[]>([]);
  const [instagramReels, setInstagramReels] = useState<Post[]>([]);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [reelsLoaded, setReelsLoaded] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReels, setLoadingReels] = useState(false);

  const supabase = createClient();

  const handlePostSelect = useCallback((posts: InstagramPost[]) => {
    setSelectedPosts(posts);
  }, []);

  const handleReelSelect = useCallback((reels: InstagramPost[]) => {
    setSelectedReels(reels);
  }, []);

  // Calcular o número total de itens selecionados
  const selectedItemsCount = selectedPosts.length + selectedReels.length;
  const maxTotalItems = 5; // Máximo de 5 itens no total entre posts e reels
  
  // Calcular curtidas por item
  const likesPerItem = service?.quantidade && selectedItemsCount > 0 
    ? Math.floor(service.quantidade / selectedItemsCount) 
    : 0;

  const fetchInstagramPosts = async (username: string) => {
    try {
      // Se já carregou os posts, não precisa buscar novamente
      if (postsLoaded && instagramPosts.length > 0) {
        console.log('Usando posts em cache:', instagramPosts.length);
        return instagramPosts;
      }

      setLoadingPosts(true);
      
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/posts',
        params: { username_or_id_or_url: username },
        headers: {
          'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };
      const response = await axios.request(options);
      console.log('Resposta da API de posts:', response.data);

      // Verificar se a resposta tem a estrutura esperada
      const posts = response.data.data?.items || response.data.items || [];
      console.log('Posts encontrados:', posts.length);

      // Filtrar para remover reels e vídeos
      const filteredPosts = posts.filter((post: any) => {
        // Log para depuração
        console.log('Analisando post:', {
          id: post.id,
          media_type: post.media_type,
          is_video: post.is_video,
          product_type: post.product_type,
          is_reel: post.product_type === 'clips' || post.product_type === 'reels'
        });
        
        // Filtrar apenas posts de imagem (não reels, não vídeos)
        const isNotReel = post.product_type !== 'clips' && post.product_type !== 'reels';
        const isImageOrCarousel = (post.media_type === 1 || post.media_type === 8);
        const isNotVideo = !post.is_video;
        
        const shouldInclude = isNotReel && isImageOrCarousel && isNotVideo;
        
        if (!shouldInclude) {
          console.log(`Excluindo post ${post.id}: ${!isNotReel ? 'É um reel' : !isImageOrCarousel ? 'Não é imagem/carrossel' : 'É um vídeo'}`);
        }
        
        return shouldInclude;
      });
      
      console.log('Posts filtrados (sem reels):', filteredPosts.length);

      // Mapear os posts para o formato esperado
      const formattedPosts: Post[] = filteredPosts.map((post: any) => {
        // Para posts de carrossel, usar a primeira imagem
        const imageUrl = 
          post.carousel_media?.[0]?.image_versions?.items?.[0]?.url || 
          post.image_versions?.items?.[0]?.url || 
          post.display_url;

        return {
          id: post.code || post.id || post.shortcode,
          shortcode: post.code || post.id || post.shortcode,
          image_url: imageUrl,
          caption: post.caption 
              ? (typeof post.caption === 'object' 
                ? post.caption.text || 'Sem legenda'
                : String(post.caption)) 
              : 'Sem legenda',
          like_count: post.like_count || post.likes_count || 0,
          comment_count: post.comment_count || post.comments_count || 0
        };
      }).filter(post => post.image_url); // Remover posts sem imagem

      console.log('Posts formatados:', formattedPosts.length);
      setInstagramPosts(formattedPosts);
      setPostsLoaded(true);
      setLoadingPosts(false);
      return formattedPosts;
    } catch (error) {
      console.error('Erro ao buscar posts do Instagram:', error);
      setLoadingPosts(false);
      return [];
    }
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

        return {
          id: reel.code || reel.id || reel.shortcode,
          shortcode: reel.code || reel.id || reel.shortcode,
          image_url: imageUrl,
          caption: reel.caption 
              ? (typeof reel.caption === 'object' 
                ? reel.caption.text || 'Sem legenda'
                : String(reel.caption)) 
              : 'Sem legenda',
          like_count: reel.like_count || reel.likes_count || 0,
          comment_count: reel.comment_count || reel.comments_count || 0,
          // Campos específicos para reels
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
    try {
      console.log('Buscando serviço com ID:', externalId);
      
      // Verificar se temos uma quantidade específica no localStorage
      const checkoutData = localStorage.getItem('checkoutProfileData');
      let quantity = null;
      
      if (checkoutData) {
        const parsedData = JSON.parse(checkoutData);
        quantity = parsedData.quantity;
        console.log('Quantidade encontrada no localStorage:', quantity);
      }

      // Tentar várias formas de buscar o serviço
      const searchMethods = [
        () => supabase
          .from('services')
          .select('*')
          .eq('external_id', externalId)
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('external_id', externalId.replace(/"/g, ''))
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('id', externalId)
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('id', externalId.replace(/"/g, ''))
          .single()
      ];

      for (const searchMethod of searchMethods) {
        const { data, error } = await searchMethod();

        if (data) {
          console.log('Serviço encontrado:', data);
          
          // Se temos uma quantidade específica, atualizar o serviço
          if (quantity) {
            console.log('Atualizando quantidade do serviço para:', quantity);
            data.quantidade = parseInt(quantity);
            
            // Atualizar o preço se houver variações de preço
            if (data.service_variations && data.service_variations.length > 0) {
              const variation = data.service_variations.find((v: any) => v.quantidade === parseInt(quantity));
              if (variation) {
                console.log('Encontrada variação de preço:', variation);
                data.preco = variation.preco;
              }
            }
          }
          
          data.fama_id = '1';
          setService(data);
          return data;
        }

        if (error) {
          console.warn('Erro na busca:', error);
        }
      }

      console.error('Não foi possível encontrar o serviço');
      toast.error('Serviço não encontrado');
      return null;
    } catch (error) {
      console.error('Erro inesperado ao buscar serviço:', error);
      toast.error('Erro ao carregar o serviço');
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
          parsedCheckoutData.serviceId || 
          parsedCheckoutData.external_id || 
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
          console.log('Iniciando busca de serviço e posts para o usuário:', profileData.username);
          
          // Buscar serviço e posts em paralelo
          Promise.all([
            fetchService(externalId),
            fetchInstagramPosts(profileData.username)
          ]).then(([serviceData, postsData]) => {
            if (serviceData) {
              setService(serviceData);
            }
            if (postsData) {
              setInstagramPosts(postsData);
              setPostsLoaded(true);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar dados de checkout:', error);
    }
  }, []);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        if (profileData?.username && !reelsLoaded) {
          setLoadingReels(true);
          await fetchInstagramReels(profileData.username);
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
      fetchInstagramReels(profileData.username);
    }
  }, [activeTab, reelsLoaded, profileData]);

  const prepareTransactionData = () => {
    if (!service || !profileData || !formData || (selectedPosts.length + selectedReels.length) === 0 || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    // Calcular quantidade de likes por post
    const totalItems = selectedPosts.length + selectedReels.length;
    const totalLikes = service.quantidade;
    const likesPerItem = Math.floor(totalLikes / totalItems);
    const remainingLikes = totalLikes % totalItems;

    // Preparar metadados dos posts
    const postsMetadata = selectedPosts.map((post, index) => ({
      postId: post.id,
      postCode: post.shortcode,
      postLink: `https://www.instagram.com/p/${post.shortcode}/`,
      likes: index === 0 ? likesPerItem + remainingLikes : likesPerItem
    }));

    const reelsMetadata = selectedReels.map((reel, index) => ({
      postId: reel.id,
      postCode: reel.shortcode,
      postLink: `https://www.instagram.com/p/${reel.shortcode}/`,
      likes: likesPerItem
    }));

    return {
      user_id: formData.name || null,
      order_id: paymentData.paymentId,
      type: 'curtidas',
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
      // Criar pagamento via Pix
      const response = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: service.preco,
          description: `${service.quantidade} curtidas para ${selectedPosts.length + selectedReels.length} itens`,
          service: {
            id: service.id,
            name: service.name,
            quantity: service.quantidade,
            fama_id: service.fama_id
          },
          user_id: null,
          profile: {
            username: profileData.username,
            full_name: profileData.full_name,
            link: `https://instagram.com/${profileData.username}`
          },
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone
          },
          posts: [...selectedPosts, ...selectedReels].map(post => ({
            id: post.id,
            shortcode: post.shortcode,
            image_url: post.image_url,
            caption: post.caption 
              ? (typeof post.caption === 'object' 
                ? post.caption.text || 'Sem legenda'
                : String(post.caption)) 
              : (post.text || 'Sem legenda'),
            link: `https://instagram.com/p/${post.shortcode}`
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pagamento');
      }

      const paymentData = await response.json();
      
      console.log('Dados completos do pagamento:', {
        paymentId: paymentData.id,
        paymentIdType: typeof paymentData.id,
        paymentIdLength: paymentData.id?.length,
        paymentData: JSON.stringify(paymentData, null, 2)
      });

      setPaymentData({
        qrCodeText: paymentData.qr_code,
        paymentId: paymentData.id
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
                  totalLikes={service?.quantidade || 100}
                  loading={loadingPosts}
                />
              ) : (
                <ReelSelector 
                  username={profileData.username}
                  onSelectReels={handleReelSelect}
                  selectedReels={selectedReels}
                  selectedPosts={selectedPosts}
                  maxReels={maxTotalItems}
                  totalLikes={service?.quantidade || 100}
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
                      <span>Quantidade de curtidas:</span>
                      <span>{service.quantidade.toLocaleString()}</span>
                    </div>
                    {(selectedPosts.length + selectedReels.length) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Curtidas por item:</span>
                        <span>{likesPerItem.toLocaleString()}</span>
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
                      <span>R$ {service.preco.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !service || (selectedPosts.length + selectedReels.length) === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Pagar com Pix'
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Após o pagamento, as curtidas serão adicionadas em até 24 horas.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {paymentData && (
        <PaymentPixModal
          isOpen={!!paymentData}
          onClose={handleClosePaymentModal}
          qrCode={paymentData.qrCodeText}
          qrCodeText={paymentData.qrCodeText}
          paymentId={paymentData.paymentId}
        />
      )}
    </div>
  );
}
