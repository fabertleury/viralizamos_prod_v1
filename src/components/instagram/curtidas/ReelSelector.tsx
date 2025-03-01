import React, { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'sonner'; // Importar biblioteca de toast
import { formatNumber } from '@/utils/formatNumber'; // Importar função de formatação

interface ReelSelectorProps {
  username: string;
  onSelectReels?: (reels: InstagramPost[]) => void;
  maxReels?: number;
  selectedPosts?: InstagramPost[];
  totalLikes?: number;
  loading?: boolean;
  selectedReels?: InstagramPost[];
}

const reelsCache: { [key: string]: InstagramPost[] } = {};

function ReelSelector({ 
  username, 
  onSelectReels, 
  maxReels = 5,
  selectedPosts = [],  
  totalLikes = 100, 
  loading: initialLoading = false,
  selectedReels: initialSelectedReels = []
}: ReelSelectorProps) {
  const [reels, setReels] = useState<InstagramPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedReels, setSelectedReels] = useState<InstagramPost[]>(initialSelectedReels);
  const [loading, setLoading] = useState(initialLoading);

  const processReelData = (reel: any) => {
    // Verificar se já é um objeto processado
    if (reel.id && typeof reel.id === 'string') {
      return reel;
    }

    // Log detalhado para depuração
    console.log('Processando reel raw data:', {
      id: reel.id || reel.pk || reel.fbid,
      play_count: reel.play_count,
      view_count: reel.view_count,
      views_count: reel.views_count,
      ig_play_count: reel.ig_play_count
    });

    // Extrair ID do reel
    const id = reel.id || reel.pk || reel.fbid || '';
    
    // Extrair contagem de visualizações - verificar todas as possíveis propriedades
    let viewsCount = 0;
    
    // Verificar campos específicos de visualizações em ordem de prioridade
    if (typeof reel.ig_play_count === 'number' && reel.ig_play_count > 0) {
      viewsCount = reel.ig_play_count;
      console.log(`Usando ig_play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.play_count === 'number' && reel.play_count > 0) {
      viewsCount = reel.play_count;
      console.log(`Usando play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.fb_play_count === 'number' && reel.fb_play_count > 0) {
      viewsCount = reel.fb_play_count;
      console.log(`Usando fb_play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.view_count === 'number' && reel.view_count > 0) {
      viewsCount = reel.view_count;
      console.log(`Usando view_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.views_count === 'number' && reel.views_count > 0) {
      viewsCount = reel.views_count;
      console.log(`Usando views_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.video_play_count === 'number' && reel.video_play_count > 0) {
      viewsCount = reel.video_play_count;
      console.log(`Usando video_play_count: ${viewsCount} para reel ${id}`);
    } else {
      console.warn(`Nenhuma contagem de visualizações encontrada para reel ${id}`);
    }
    
    // Extrair contagem de curtidas
    const likeCount = 
      reel.like_count || 
      reel.likes_count || 
      reel.fb_like_count || 
      0;
    
    // Extrair contagem de comentários
    const commentCount = 
      reel.comment_count || 
      reel.comments_count || 
      0;
    
    // Extrair legenda
    const caption = reel.caption?.text || 
                   (typeof reel.caption === 'string' ? reel.caption : '') || 
                   '';
    
    // Processar o reel para o formato esperado
    const processedReel = {
      id,
      views_count: viewsCount,
      like_count: likeCount,
      comment_count: commentCount,
      caption: { text: caption },
      image_url: '',  // Será preenchido pelo selectBestImageUrl
      thumbnail_url: reel.thumbnail_url || '',
      video_url: reel.video_url || '',
      username: reel.user?.username || username
    };
    
    console.log('Reel processado:', processedReel);
    
    return processedReel;
  };

  useEffect(() => {
    async function loadReels() {
      if (!username) return;
      
      const MAX_RETRIES = 3;
      let retryCount = 0;

      const fetchWithRetry = async () => {
        try {
          setLoading(true);
          
          // Verificar se temos dados em cache
          const cachedData = sessionStorage.getItem(`reels_${username}`);
          if (cachedData) {
            console.log('Usando dados em cache para reels de:', username);
            const parsedData = JSON.parse(cachedData);
            setReels(parsedData);
            return;
          }
          
          console.log('Buscando reels para:', username);
          
          const options = {
            method: 'GET',
            url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/reels',
            params: {
              username_or_id_or_url: username
            },
            headers: {
              'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
            }
          };
          
          const response = await axios.request(options);
          const reelsData = response.data;
          
          console.log('Resposta da API de reels:', reelsData);
          
          if (reelsData && reelsData.data && reelsData.data.items) {
            const allReels = reelsData.data.items;
            console.log('Reels após processamento inicial:', allReels);

            if (allReels.length > 0) {
              // Processar os reels e adicionar as URLs de imagem
              const processedReels = allReels.map(reel => {
                const processedReel = processReelData(reel);
                processedReel.image_url = selectBestImageUrl(reel);
                
                // Garantir que views_count tenha um valor válido
                if (!processedReel.views_count || processedReel.views_count === 0) {
                  // Extrair o valor de visualizações do campo mais confiável
                  const viewsCount = reel.ig_play_count || reel.play_count || reel.view_count || reel.views_count || reel.video_play_count || 0;
                  processedReel.views_count = viewsCount;
                  console.log(`Usando valor de visualizações extraído: ${processedReel.views_count}`);
                }
                
                return processedReel;
              });

              console.log('Reels processados com visualizações:', processedReels.map(r => ({
                id: r.id,
                viewsCount: r.views_count,
                formattedViews: formatNumber(r.views_count || 0),
                likeCount: r.like_count,
                commentCount: r.comment_count
              })));

              // Salvar no cache
              sessionStorage.setItem(`reels_${username}`, JSON.stringify(processedReels));
              
              setReels(processedReels);
            } else {
              console.warn('Nenhum reel encontrado para o usuário:', username);
              setReels([]);
            }
          } else {
            console.error('Formato de resposta inesperado da API de reels:', reelsData);
            toast.warning('Nenhum reel encontrado para este perfil.');
            setReels([]);
          }
        } catch (error) {
          console.error('Erro ao carregar reels:', error);
          
          if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000;
            retryCount++;
            
            console.warn(`Erro detectado. Retrying in ${delay/1000} seconds. Attempt ${retryCount}`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry();
          }
          
          toast.error('Erro ao carregar reels. Tente novamente.');
          setReels([]);
        } finally {
          setLoading(false);
        }
      };

      fetchWithRetry();
    }

    loadReels();
  }, [username]);

  useEffect(() => {
    if (selectedReels.length === 0 && reels.length > 0 && initialSelectedReels.length > 0) {
      // Verificar se algum reel já está selecionado nas props iniciais
      const preSelectedReels = reels.filter(reel => 
        initialSelectedReels.some(selectedReel => selectedReel.id === reel.id)
      );
      
      if (preSelectedReels.length > 0) {
        console.log('Restaurando reels selecionados:', preSelectedReels.length);
        setSelectedReels(preSelectedReels);
      }
    }
  }, [reels, initialSelectedReels, selectedReels.length]);

  // Atualizar selectedReels quando as props mudarem
  useEffect(() => {
    if (initialSelectedReels && JSON.stringify(initialSelectedReels) !== JSON.stringify(selectedReels)) {
      setSelectedReels(initialSelectedReels);
    }
  }, [initialSelectedReels]);

  // Função para obter URL da imagem através do proxy
  const getProxiedImageUrl = (url: string): string => {
    if (!url) return '/images/placeholder-reel.svg';
    
    // Se já for uma URL local, retornar diretamente
    if (url.startsWith('/')) {
      return url;
    }
    
    // Se for uma URL de placeholder.com, usar o placeholder local
    if (url.includes('placeholder.com')) {
      return '/images/placeholder-reel.svg';
    }
    
    // Caso contrário, usar o proxy
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  };

  // Função para selecionar a melhor URL de imagem disponível
  const selectBestImageUrl = (reel: any): string => {
    console.log('Selecionando imagem para reel:', reel.id || reel.code);
    
    // Verificar todas as possíveis fontes de imagem
    const possibleSources = [
      reel.image_versions?.items?.[0]?.url,
      reel.thumbnail_url,
      reel.image_url,
      reel.cover_frame_url,
      reel.display_url,
      reel.carousel_media?.[0]?.image_versions?.items?.[0]?.url,
      // Novas fontes de imagem do formato da API
      reel.image_versions?.additional_items?.first_frame?.url,
      reel.image_versions?.additional_items?.smart_frame?.url,
      reel.image_versions?.additional_items?.igtv_first_frame?.url
    ];
    
    // Filtrar fontes válidas
    const validSources = possibleSources.filter(source => source && typeof source === 'string');
    
    if (validSources.length > 0) {
      console.log('Fonte de imagem encontrada:', validSources[0]);
      return validSources[0];
    }
    
    console.warn('Nenhuma fonte de imagem válida encontrada para o reel:', reel.id || reel.code);
    // Usar um SVG local que não precisa passar pelo proxy
    return '/images/placeholder-reel.svg';
  };

  // Função para calcular curtidas por item
  const calculateLikesPerItem = () => {
    const totalSelectedItems = selectedReels.length + (selectedPosts?.length || 0);
    if (!totalSelectedItems) return 0;
    return Math.floor(totalLikes / totalSelectedItems);
  };

  const handleSelectReel = (reel: InstagramPost) => {
    const totalSelectedItems = selectedReels.length + (selectedPosts?.length || 0);
    const isAlreadySelected = selectedReels.some(r => r.id === reel.id);
    
    if (isAlreadySelected) {
      // Se já selecionado, remover
      const updatedSelectedReels = selectedReels.filter(r => r.id !== reel.id);
      setSelectedReels(updatedSelectedReels);
      
      // Atualizar callbacks
      if (onSelectReels) onSelectReels(updatedSelectedReels);
      return;
    }

    if (totalSelectedItems >= maxReels) {
      toast.warning(`Você pode selecionar no máximo ${maxReels} itens entre posts e reels`);
      return;
    }

    // Adicionar reel com emoji de coração
    const selectedReel = {
      ...reel,
      selected: true,
      displayName: `❤️ ${reel.caption || 'Reel sem legenda'}`
    };

    const updatedSelectedReels = [...selectedReels, selectedReel];
    setSelectedReels(updatedSelectedReels);
    
    // Atualizar callbacks
    if (onSelectReels) onSelectReels(updatedSelectedReels);
  };

  // Recalcular distribuição de curtidas quando a seleção mudar
  useEffect(() => {
    if (selectedReels.length > 0) {
      const likesPerItem = calculateLikesPerItem();
      const updatedReels = selectedReels.map(reel => ({
        ...reel,
        likesDistribution: likesPerItem
      }));
      setSelectedReels(updatedReels);
      if (onSelectReels) onSelectReels(updatedReels);
    }
  }, [selectedReels.length, totalLikes]);

  // Renderização condicional baseada no estado de carregamento
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
        <p className="text-gray-600 font-medium">Carregando reels...</p>
      </div>
    );
  }

  // Se não há reels para mostrar
  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-5xl">🎬</div>
        <p className="text-gray-600 font-medium">Nenhum reel encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {reels.slice(0, 12).map(reel => {
        const proxiedImageUrl = getProxiedImageUrl(reel.image_url);
        const isSelected = selectedReels.some(selectedReel => selectedReel.id === reel.id);

        return (
          <div 
            key={reel.id || `reel-${Math.random()}`}
            onClick={() => handleSelectReel(reel)}
            className={`
              relative cursor-pointer transition-all duration-300 
              ${isSelected ? 'border-4 border-pink-500' : 'hover:opacity-80'}
            `}
          >
            <div className="relative">
              {/* Log para depuração */}
              {console.log('Renderizando reel:', {
                id: reel.id,
                viewsCount: reel.views_count,
                formattedViews: formatNumber(reel.views_count || 0),
                likeCount: reel.like_count,
                commentCount: reel.comment_count
              })}
              <Image
                src={proxiedImageUrl}
                alt={reel.caption?.text || 'Sem legenda'}
                width={640}
                height={640}
                className={`w-full h-40 object-cover rounded
                  ${isSelected ? 'opacity-40' : ''}
                `}
                onError={(e) => {
                  console.error('Erro ao carregar imagem do reel:', e);
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('placeholder-reel.svg')) {
                    target.src = '/images/placeholder-reel.svg';
                  }
                }}
                unoptimized={proxiedImageUrl.includes('placeholder-reel.svg')}
              />
              
              {isSelected && (
                <>
                  {/* Contador no canto superior direito */}
                  <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full px-2 py-1 text-xs">
                    {selectedReels.findIndex(r => r.id === reel.id) + 1}/{selectedReels.length + selectedPosts.length}
                  </div>
                  
                  {/* Emoji de visualização centralizado */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl text-pink-500">❤️</div>
                  </div>
                  
                  {/* Contador de curtidas distribuídas */}
                  <div className="absolute bottom-8 left-0 right-0 text-center text-white font-bold bg-pink-500 bg-opacity-70 py-1">
                    {formatNumber(calculateLikesPerItem())} curtidas
                  </div>
                </>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 flex justify-between text-xs">
                <span className="flex items-center">
                  ❤️ {formatNumber(reel.like_count || 0)}
                </span>
                <span className="flex items-center">
                  👀 {formatNumber(reel.views_count || 0)}
                </span>
                <span className="flex items-center">
                  💬 {formatNumber(reel.comment_count || 0)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ReelSelector;
