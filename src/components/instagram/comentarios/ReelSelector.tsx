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
  totalComments?: number; 
  loading?: boolean;
  selectedReels?: InstagramPost[];
}

const reelsCache: { [key: string]: InstagramPost[] } = {};

function ReelSelector({ 
  username, 
  onSelectReels, 
  maxReels = 5,
  selectedPosts = [],  
  totalComments = 100, 
  loading: initialLoading = false,
  selectedReels: initialSelectedReels = []
}: ReelSelectorProps) {
  const [reels, setReels] = useState<InstagramPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedReels, setSelectedReels] = useState<InstagramPost[]>(initialSelectedReels);
  const [loading, setLoading] = useState(initialLoading);

  const processReelData = (reel: any) => {
    if (reel.id && typeof reel.id === 'string') {
      return reel;
    }

    console.log(' Processando reel raw data:', {
      id: reel.id || reel.pk || reel.fbid,
      play_count: reel.play_count,
      view_count: reel.view_count,
      views_count: reel.views_count,
      ig_play_count: reel.ig_play_count
    });

    const id = reel.id || reel.pk || reel.fbid || '';
    
    let viewsCount = 0;
    
    if (typeof reel.ig_play_count === 'number' && reel.ig_play_count > 0) {
      viewsCount = reel.ig_play_count;
      console.log(` Usando ig_play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.play_count === 'number' && reel.play_count > 0) {
      viewsCount = reel.play_count;
      console.log(` Usando play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.fb_play_count === 'number' && reel.fb_play_count > 0) {
      viewsCount = reel.fb_play_count;
      console.log(` Usando fb_play_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.view_count === 'number' && reel.view_count > 0) {
      viewsCount = reel.view_count;
      console.log(` Usando view_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.views_count === 'number' && reel.views_count > 0) {
      viewsCount = reel.views_count;
      console.log(` Usando views_count: ${viewsCount} para reel ${id}`);
    } else if (typeof reel.video_play_count === 'number' && reel.video_play_count > 0) {
      viewsCount = reel.video_play_count;
      console.log(` Usando video_play_count: ${viewsCount} para reel ${id}`);
    } else {
      console.warn(`Nenhuma contagem de visualizações encontrada para reel ${id}`);
    }
    
    const likeCount = 
      reel.like_count || 
      reel.likes_count || 
      reel.fb_like_count || 
      0;
    
    const commentCount = 
      reel.comment_count || 
      reel.comments_count || 
      0;
    
    const caption = reel.caption?.text || 
                   (typeof reel.caption === 'string' ? reel.caption : '') || 
                   '';
    
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
    
    console.log(' Reel processado:', {
      id: processedReel.id,
      code: processedReel.code,
      views: processedReel.views_count,
      likes: processedReel.like_count,
      comments: processedReel.comment_count
    });
    
    return processedReel;
  };

  const calculateCommentsPerItem = () => {
    const totalSelectedItems = selectedPosts.length + selectedReels.length;
    if (!totalSelectedItems) return 0;
    return Math.floor(totalComments / totalSelectedItems);
  };

  const handleSelectReel = (reel: InstagramPost) => {
    const totalSelectedItems = selectedPosts.length + selectedReels.length;
    const isAlreadySelected = selectedReels.some(selectedReel => selectedReel.id === reel.id);
    
    console.log(' Reel selecionado - dados completos:', {
      id: reel.id,
      code: reel.code,
      shortcode: reel.shortcode,
      views: reel.views_count
    });

    if (isAlreadySelected) {
      const updatedSelectedReels = selectedReels.filter(selectedReel => selectedReel.id !== reel.id);
      setSelectedReels(updatedSelectedReels);
      
      if (onSelectReels) onSelectReels(updatedSelectedReels);
      return;
    }

    if (totalSelectedItems >= maxReels) {
      toast.warning(`Você pode selecionar no máximo ${maxReels} itens entre posts e reels`);
      return;
    }

    const selectedReel = {
      ...reel,
      selected: true,
      displayName: ` ${typeof reel.caption === 'string' ? reel.caption : 'Reel sem legenda'}`
    };

    console.log(' Reel adicionado à seleção:', {
      id: selectedReel.id,
      code: selectedReel.code,
      url: `https://instagram.com/reel/${selectedReel.code}`
    });

    const updatedSelectedReels = [...selectedReels, selectedReel];
    setSelectedReels(updatedSelectedReels);
    
    if (onSelectReels) onSelectReels(updatedSelectedReels);
  };

  useEffect(() => {
    async function loadReels() {
      if (!username) return;
      
      if (reelsCache[username]) {
        console.log(` Usando cache para reels de ${username}`);
        setReels(reelsCache[username]);
        return;
      }
      
      const MAX_RETRIES = 3;
      let retryCount = 0;

      const fetchWithRetry = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const response = await fetch(`/api/instagram/reels/${username}`, {
            headers: {
              'Cache-Control': 'no-cache',
            }
          });
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar reels: ${response.status}`);
          }
          
          const data = await response.json();
          console.log(` Recebidos ${data.length} reels para ${username}`);
          
          const processedReels = data.map(processReelData);
          
          reelsCache[username] = processedReels;
          
          setReels(processedReels);
          setLoading(false);
        } catch (error) {
          console.error('Erro ao buscar reels:', error);
          
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(` Tentando novamente (${retryCount}/${MAX_RETRIES})...`);
            setTimeout(fetchWithRetry, 2000); 
          } else {
            setError('Não foi possível carregar os reels. Por favor, tente novamente mais tarde.');
            setLoading(false);
          }
        }
      };
      
      fetchWithRetry();
    }
    
    loadReels();
  }, [username]);

  const getProxiedImageUrl = (url: string | undefined): string => {
    if (!url || url.includes('placeholder')) {
      return '/images/placeholder-post.svg';
    }
    
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
        <p className="font-medium">Erro</p>
        <p>{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Selecione os reels para receber comentários</h3>
        <p className="text-sm text-gray-600 mb-2">
          Você pode selecionar até {maxReels} itens (posts + reels)
        </p>
        {selectedReels.length > 0 && (
          <p className="text-sm font-medium text-green-600">
            Cada item receberá aproximadamente {formatNumber(calculateCommentsPerItem())} comentários
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
                        <span>{formatNumber(reel.views_count || 0)} 👁️</span>
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