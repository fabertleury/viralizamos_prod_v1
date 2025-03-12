import React, { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/formatNumber';

interface ReelSelectorProps {
  username: string;
  onSelectReels?: (reels: InstagramPost[]) => void;
  maxReels?: number;
  selectedPosts?: InstagramPost[];
  totalViews?: number;
  loading?: boolean;
  selectedReels?: InstagramPost[];
}

const reelsCache: { [key: string]: InstagramPost[] } = {};

function ReelSelector({ 
  username, 
  onSelectReels, 
  maxReels = 5,
  selectedPosts = [],  
  totalViews = 100, 
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
    
    // Determinar a contagem de visualizações
    let viewsCount = 0;
    
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
    
    // Extrair outras métricas
    const likeCount = 
      reel.like_count || 
      reel.likes_count || 
      reel.fb_like_count || 
      0;
    
    const commentCount = 
      reel.comment_count || 
      reel.comments_count || 
      0;
    
    // Lidar com caption que pode ser objeto ou string
    const caption = reel.caption?.text || 
                   (typeof reel.caption === 'string' ? reel.caption : '') || 
                   '';
    
    // Criar objeto processado
    const processedReel = {
      id,
      views_count: viewsCount,
      like_count: likeCount,
      comment_count: commentCount,
      caption,
      is_reel: true,
      media_type: 'VIDEO',
      code: reel.code || reel.shortcode || `reel_${id}`,
      shortcode: reel.code || reel.shortcode || `reel_${id}`,
      thumbnail_url: reel.thumbnail_url || reel.thumbnail_src || reel.display_url || '',
      image_url: reel.thumbnail_url || reel.thumbnail_src || reel.display_url || '',
      display_url: reel.thumbnail_url || reel.thumbnail_src || reel.display_url || '',
      video_url: reel.video_url || '',
      permalink: reel.permalink || '',
      instagram_url: `https://instagram.com/reel/${reel.code || reel.shortcode || id}`
    };
    
    // Log do reel processado
    console.log('Reel processado:', {
      id: processedReel.id,
      code: processedReel.code,
      views: processedReel.views_count,
      likes: processedReel.like_count,
      comments: processedReel.comment_count
    });
    
    return processedReel;
  };

  // Função para selecionar a melhor URL de imagem disponível
  const selectBestImageUrl = (reel: any): string => {
    // Verificar todas as possíveis fontes de imagem
    if (reel.thumbnail_url) return reel.thumbnail_url;
    if (reel.thumbnail_src) return reel.thumbnail_src;
    if (reel.display_url) return reel.display_url;
    
    // Tentar extrair de image_versions
    if (reel.image_versions && reel.image_versions.items && reel.image_versions.items.length > 0) {
      return reel.image_versions.items[0].url;
    }
    
    // Tentar extrair de carousel_media
    if (reel.carousel_media && reel.carousel_media.length > 0) {
      const firstMedia = reel.carousel_media[0];
      if (firstMedia.image_versions && firstMedia.image_versions.items && firstMedia.image_versions.items.length > 0) {
        return firstMedia.image_versions.items[0].url;
      }
    }
    
    // Fallback para imagem padrão
    return '/images/placeholder-post.svg';
  };

  // Função para obter URL da imagem através do proxy
  const getProxiedImageUrl = (url: string | undefined): string => {
    if (!url) {
      return '/images/placeholder-post.svg';
    }
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Função para extrair o código correto de um post do Instagram
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

  // Função para calcular visualizações por item
  const calculateViewsPerItem = () => {
    const totalSelectedItems = selectedReels.length + (selectedPosts?.length || 0);
    if (!totalSelectedItems) return 0;
    return Math.floor(totalViews / totalSelectedItems);
  };

  const handleSelectReel = (reel: InstagramPost) => {
    const totalSelectedItems = selectedReels.length + (selectedPosts?.length || 0);
    const isAlreadySelected = selectedReels.some(r => r.id === reel.id);
    
    // Log detalhado do reel selecionado
    console.log('🔍 Reel selecionado - dados completos:', {
      id: reel.id,
      code: reel.code,
      shortcode: reel.shortcode,
      image_url: reel.image_url,
      caption: reel.caption
    });
    
    // Extrair o código correto
    const reelCode = extractPostCode(reel);
    console.log('🔍 Código extraído para o reel:', reelCode);
    
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

    // Adicionar reel com emoji de olhos e código correto
    const selectedReel = {
      ...reel,
      code: reelCode, // Usar o código extraído
      shortcode: reelCode,
      selected: true,
      displayName: `👀 ${reel.caption || 'Reel sem legenda'}`
    };

    console.log('✅ Reel adicionado à seleção:', {
      id: selectedReel.id,
      code: selectedReel.code,
      url: `https://instagram.com/reel/${selectedReel.code}`
    });

    const updatedSelectedReels = [...selectedReels, selectedReel];
    setSelectedReels(updatedSelectedReels);
    
    // Atualizar callbacks
    if (onSelectReels) onSelectReels(updatedSelectedReels);
  };

  useEffect(() => {
    async function loadReels() {
      if (!username) return;
      
      // Verificar cache na sessão
      const cachedReels = sessionStorage.getItem(`reels_${username}`);
      if (cachedReels) {
        try {
          const parsedReels = JSON.parse(cachedReels);
          console.log(`Usando cache da sessão para reels de ${username}`);
          setReels(parsedReels);
          return;
        } catch (e) {
          console.error('Erro ao parsear reels do cache:', e);
          // Continuar com a busca normal
        }
      }
      
      // Verificar cache em memória
      if (reelsCache[username]) {
        console.log(`Usando cache em memória para reels de ${username}`);
        setReels(reelsCache[username]);
        return;
      }
      
      const MAX_RETRIES = 3;
      let retryCount = 0;

      const fetchWithRetry = async () => {
        try {
          setLoading(true);
          setError(null);
          
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
              const processedReels = allReels.map((reel: any) => {
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

              console.log('Reels processados com visualizações:', processedReels.map((r: any) => ({
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
            setError('Formato de resposta inesperado da API');
            setReels([]);
          }
        } catch (error) {
          console.error('Erro ao buscar reels:', error);
          
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Tentando novamente (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry();
          }
          
          setError('Falha ao buscar reels. Por favor, tente novamente.');
          setReels([]);
        } finally {
          setLoading(false);
        }
      };

      fetchWithRetry();
    }

    loadReels();
  }, [username]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h3 className="text-lg font-medium">Selecione os Reels</h3>
        <p className="text-sm text-gray-500">
          {selectedReels.length} de {maxReels} reels selecionados
        </p>
        {selectedReels.length > 0 && (
          <p className="text-sm font-medium text-green-600">
            Cada item receberá aproximadamente {formatNumber(calculateViewsPerItem())} visualizações
          </p>
        )}
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-gray-500">Carregando reels...</p>
        </div>
      ) : (
        <>
          {reels.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-gray-500">Nenhum reel encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {reels.map((reel) => {
                const isSelected = selectedReels.some(selectedReel => selectedReel.id === reel.id);
                const imageUrl = getProxiedImageUrl(reel.thumbnail_url || reel.image_url || reel.display_url);
                
                return (
                  <div 
                    key={reel.id} 
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-pink-500 shadow-md scale-95' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectReel(reel)}
                  >
                    <div className="aspect-square relative">
                      <Image
                        src={imageUrl}
                        alt={typeof reel.caption === 'string' ? reel.caption : 'Instagram reel'}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder-post.svg';
                        }}
                      />
                      
                      <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                          <div className="bg-pink-500 text-white rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 bg-white">
                      <p className="text-xs truncate">
                        {typeof reel.caption === 'object' 
                          ? (reel.caption.text || 'Sem legenda') 
                          : (typeof reel.caption === 'string' 
                              ? reel.caption 
                              : 'Sem legenda')}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                        <span>{formatNumber(reel.views_count || 0)} 👀</span>
                        <span>{formatNumber(reel.comment_count || 0)} 💬</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReelSelector;
