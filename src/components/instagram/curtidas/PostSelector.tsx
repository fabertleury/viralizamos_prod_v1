'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber'; // Importar função de formatação

interface Service {
  id: string;
  name: string;
  preco: number;
  quantidade: number;
}

interface PostSelectorProps {
  username: string;
  onSelectPosts?: (posts: InstagramPost[]) => void;
  onPostSelect?: (posts: InstagramPost[]) => void;
  maxPosts?: number;
  service?: Service;
  posts?: InstagramPost[];
  selectedReels?: InstagramPost[];
  totalLikes?: number; // Adicionado para distribuir curtidas
  loading?: boolean;
  selectedPosts?: InstagramPost[]; // Adicionado para manter seleções
}

export function PostSelector({ 
  username, 
  onPostSelect, 
  maxPosts = 5, 
  service,
  posts: initialPosts,
  selectedReels = [],
  totalLikes = 100, // Valor padrão se não for fornecido
  loading: initialLoading = false,
  selectedPosts: initialSelectedPosts = [] // Inicializar com valor padrão
}: PostSelectorProps) {
  const [loadingState, setLoading] = useState(initialLoading);
  const [posts, setPosts] = useState<InstagramPost[]>(initialPosts || []);
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<InstagramPost[]>([]);
  
  // Inicializar selectedPosts com os valores recebidos via props
  useEffect(() => {
    if (selectedPosts.length === 0 && posts.length > 0 && initialSelectedPosts.length > 0) {
      // Verificar se algum post já está selecionado nas props iniciais
      const preSelectedPosts = posts.filter(post => 
        initialSelectedPosts.some(selectedPost => selectedPost.id === post.id)
      );
      
      if (preSelectedPosts.length > 0) {
        console.log('Restaurando posts selecionados:', preSelectedPosts.length);
        setSelectedPosts(preSelectedPosts);
      }
    }
  }, [posts, initialSelectedPosts, selectedPosts.length]);

  const getProxiedImageUrl = (originalUrl: string) => {
    if (!originalUrl) return '/images/placeholder-post.svg';
    
    // Se já for uma URL local, retornar diretamente
    if (originalUrl.startsWith('/')) {
      return originalUrl;
    }
    
    // Se for uma URL de placeholder.com, usar o placeholder local
    if (originalUrl.includes('placeholder.com')) {
      return '/images/placeholder-post.svg';
    }
    
    // Caso contrário, usar o proxy
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  };

  const selectBestImageUrl = (post: any): string => {
    console.log('Selecionando imagem para post:', post.id || post.pk);
    
    // Verificar todas as possíveis fontes de imagem
    const possibleSources = [
      post.image_url,
      post.thumbnail_url,
      post.display_url,
      post.image_versions?.items?.[0]?.url,
      post.carousel_media?.[0]?.image_versions?.items?.[0]?.url,
      // Novas fontes de imagem do formato da API
      post.image_versions?.additional_items?.first_frame?.url,
      post.image_versions?.additional_items?.smart_frame?.url,
      post.image_versions?.additional_items?.igtv_first_frame?.url
    ];
    
    // Filtrar fontes válidas
    const validSources = possibleSources.filter(source => source && typeof source === 'string');
    
    if (validSources.length > 0) {
      console.log('Fonte de imagem encontrada:', validSources[0]);
      return validSources[0];
    }
    
    console.warn('Nenhuma fonte de imagem válida encontrada para o post:', post.id || post.pk);
    // Usar um SVG local que não precisa passar pelo proxy
    return '/images/placeholder-post.svg';
  };

  // Função para calcular curtidas por item
  const calculateLikesPerItem = (selectedItems: InstagramPost[]) => {
    if (!selectedItems || selectedItems.length === 0) return 0;
    return Math.floor(totalLikes / selectedItems.length);
  };

  const handleSelectPost = (post: InstagramPost) => {
    const totalSelectedItems = selectedPosts.length + selectedReels.length;
    const isAlreadySelected = selectedPosts.some(selectedPost => selectedPost.id === post.id);

    if (isAlreadySelected) {
      // Se já selecionado, remover
      const updatedSelectedPosts = selectedPosts.filter(selectedPost => selectedPost.id !== post.id);
      setSelectedPosts(updatedSelectedPosts);
      
      // Atualizar callbacks
      if (onPostSelect) onPostSelect(updatedSelectedPosts);
      return;
    }

    if (totalSelectedItems >= 5) {
      toast.warning('Você pode selecionar no máximo 5 itens entre posts e reels');
      return;
    }

    // Adicionar post com emoji de coração
    const selectedPost = {
      ...post,
      selected: true,
      displayName: `❤️ ${post.caption?.text || 'Post sem legenda'}`,
      likesDistribution: calculateLikesPerItem([...selectedPosts, post])
    };

    const updatedSelectedPosts = [...selectedPosts, selectedPost];
    setSelectedPosts(updatedSelectedPosts);
    
    // Atualizar callbacks
    if (onPostSelect) onPostSelect(updatedSelectedPosts);
  };

  useEffect(() => {
    async function loadPosts() {
      if (!username) return;
      
      const MAX_RETRIES = 3;
      let retryCount = 0;

      const fetchWithRetry = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/instagram/posts/${username}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            const status = response.status;
            const errorData = await response.json();

            if (status === 429 && retryCount < MAX_RETRIES) {
              // Exponential backoff
              const delay = Math.pow(2, retryCount) * 1000;
              retryCount++;
              
              console.warn(`Rate limit hit. Retrying in ${delay/1000} seconds. Attempt ${retryCount}`);
              
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry();
            }

            throw new Error(errorData.error || `Erro ao carregar posts (${status})`);
          }
          
          const postsData = await response.json();
          
          console.log('Dados brutos dos posts:', JSON.stringify(postsData, null, 2));
          console.log('Tipo de postsData:', typeof postsData);
          console.log('Chaves de postsData:', Object.keys(postsData || {}));
          // Processar posts
          const allPosts = postsData || [];

          console.log('Detalhes completos dos posts:', allPosts);

          if (allPosts.length > 0) {
            // Filtrar e formatar posts
            const processedPosts = allPosts
              .filter(post => {
                // Log para depuração dos tipos de posts
                console.log('Tipo de post:', {
                  id: post.id,
                  media_type: post.media_type,
                  is_video: post.is_video,
                  is_reel: post.is_reel || false,
                  product_type: post.product_type
                });
                
                // Filtrar apenas posts de imagem (não reels, não vídeos)
                return (
                  // Verificar se não é um reel (prioridade máxima)
                  post.is_reel !== true &&
                  // Verificar se não é um produto do tipo "clips" ou "reels"
                  post.product_type !== 'clips' && 
                  post.product_type !== 'reels' &&
                  // Tipo 1 = imagem, Tipo 8 = carrossel
                  (post.media_type === 1 || post.media_type === 8) && 
                  // Garantir que não é um vídeo
                  !post.is_video &&
                  // Garantir que tem uma imagem válida
                  post.image_versions?.items?.[0]?.url
                );
              })
              .map(post => ({
                ...post,
                likes_count: post.like_count || post.likes_count || 0,
                comments_count: post.comment_count || post.comments_count || 0,
                image_url: post.image_versions?.items?.[0]?.url || ''
              }));

            console.log('Posts filtrados:', {
              totalPosts: allPosts.length,
              imagePosts: processedPosts.length
            });

            setPosts(processedPosts);
          } else {
            console.error('Nenhum post retornado da API:', postsData);
            toast.warning('Nenhum post encontrado para este perfil.');
          }
        } catch (error) {
          console.error('Erro ao carregar posts:', error);
          
          if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000;
            retryCount++;
            
            console.warn(`Erro detectado. Retrying in ${delay/1000} seconds. Attempt ${retryCount}`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry();
          }
          
          toast.error('Erro ao carregar posts. Tente novamente.');
        } finally {
          setLoading(false);
        }
      };

      fetchWithRetry();
    }

    loadPosts();
  }, [username]);

  // Recalcular distribuição de curtidas quando a seleção mudar
  useEffect(() => {
    if (selectedPosts.length > 0) {
      const likesPerItem = calculateLikesPerItem(selectedPosts);
      const updatedPosts = selectedPosts.map(post => ({
        ...post,
        likesDistribution: likesPerItem
      }));
      setSelectedPosts(updatedPosts);
      
      // Atualizar callbacks
      if (onPostSelect) onPostSelect(updatedPosts);
    }
  }, [selectedPosts.length, totalLikes]);

  // Renderização condicional baseada no estado de carregamento
  if (loadingState || initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
        <p className="text-gray-600 font-medium">Carregando posts...</p>
      </div>
    );
  }

  // Se não há posts para mostrar
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-5xl">📷</div>
        <p className="text-gray-600 font-medium">Nenhum post de imagem encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {posts.slice(0, 12).map((post, index) => (
        <div 
          key={post.id || post.pk || `post-${Math.random()}`}
          onClick={() => handleSelectPost(post)}
          className={`
            relative cursor-pointer transition-all duration-300 
            ${selectedPosts.some(selectedPost => selectedPost.id === post.id) 
              ? 'border-4 border-pink-500' 
              : 'hover:opacity-80'}
          `}
        >
          <div className="relative">
            <Image
              src={getProxiedImageUrl(selectBestImageUrl(post))}
              alt={post.caption?.text || 'Sem legenda'}
              width={640}
              height={640}
              className={`w-full h-40 object-cover rounded
                ${selectedPosts.some(selectedPost => selectedPost.id === post.id) 
                  ? 'opacity-40' 
                  : ''}
              `}
              onError={(e) => {
                console.error('Erro ao carregar imagem do post:', e);
                const target = e.target as HTMLImageElement;
                // Verificar se já não estamos usando o placeholder para evitar loop
                if (!target.src.includes('placeholder-post.svg')) {
                  target.src = '/images/placeholder-post.svg';
                }
              }}
              unoptimized={getProxiedImageUrl(post.image_url).includes('placeholder-post.svg')}
            />
            
            {selectedPosts.some(selectedPost => selectedPost.id === post.id) && (
              <>
                {/* Contador no canto superior direito */}
                <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full px-2 py-1 text-xs">
                  {selectedPosts.findIndex(p => p.id === post.id) + 1}/{selectedPosts.length + selectedReels.length}
                </div>
                
                {/* Emoji de coração centralizado */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-4xl text-pink-500">❤️</div>
                </div>
                
                {/* Contador de curtidas distribuídas */}
                <div className="absolute bottom-8 left-0 right-0 text-center text-white font-bold bg-pink-500 bg-opacity-70 py-1">
                  {formatNumber(calculateLikesPerItem(selectedPosts))} curtidas
                </div>
              </>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 
              bg-black bg-opacity-50 text-white p-1 
              flex justify-between text-xs">
              <span className="flex items-center">
                ❤️ {formatNumber(post.likes_count || 0)}
              </span>
              <span className="flex items-center">
                💬 {formatNumber(post.comments_count || 0)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Exportação default para compatibilidade
export default PostSelector;
