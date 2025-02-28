import React, { useState, useEffect } from 'react';
import { InstagramPost } from '@/types/instagram';
import Image from 'next/image';

interface ReelSelectorProps {
  username: string;
}

export default function ReelSelector({ username }: ReelSelectorProps) {
  const [reels, setReels] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReels, setSelectedReels] = useState<InstagramPost[]>([]);

  const processReelData = (reel: any) => {
    // Log para verificar a estrutura completa do Reel
    console.log('Processando Reel:', JSON.stringify(reel, null, 2));

    return {
      id: reel.id || reel.code,
      code: reel.code,
      image_versions: reel.image_versions || 
                      reel.display_url || 
                      reel.thumbnail_url || 
                      reel.cover_frame_url || 
                      [],
      like_count: reel.like_count || reel.likes || 0,
      comment_count: reel.comment_count || reel.comments || 0,
      views_count: reel.views_count || 
                   reel.play_count || 
                   reel.view_count || 
                   reel.video_view_count || 
                   reel.ig_play_count || 
                   0,
      caption: { 
        text: reel.caption 
          ? (typeof reel.caption === 'object' 
            ? reel.caption.text || 'Sem legenda'
            : String(reel.caption)) 
          : 'Sem legenda'
      },
      link: reel.link || `https://www.instagram.com/reel/${reel.code}/`,
      media_type: reel.media_type,
      is_video: reel.is_video || true,
      video_url: reel.video_url
    };
  };

  useEffect(() => {
    async function fetchReels() {
      try {
        const response = await fetch(`/api/instagram/reels/${username}`);
        
        if (!response.ok) {
          throw new Error('Erro ao buscar Reels');
        }
        
        const data = await response.json();
        console.log('Reels recebidos:', JSON.stringify(data, null, 2)); // Log detalhado
        
        // Processar e normalizar dados dos Reels
        const processedReels = Array.isArray(data) 
          ? data.map(processReelData)
          : data.data 
            ? data.data.items.map(processReelData)
            : [];
        
        // Verificar se há dados
        if (processedReels && processedReels.length > 0) {
          setReels(processedReels);
        } else {
          console.warn('Nenhum Reel encontrado');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erro ao buscar Reels:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setLoading(false);
      }
    }

    fetchReels();
  }, [username]);

  const getProxiedImageUrl = (originalUrl: string) => {
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  };

  const selectBestImageUrl = (imageVersions: any) => {
    console.log('Selecionando imagem de:', JSON.stringify(imageVersions, null, 2)); // Log detalhado

    // Se for um array de imagens (caso dos Reels)
    if (Array.isArray(imageVersions)) {
      if (imageVersions.length > 0) {
        console.log('Estratégia 1 - Usando primeiro item do array de imagens');
        return imageVersions[0].url;
      }
      return null;
    }

    // Estratégias para encontrar URL da imagem em outros formatos
    const imageStrategies = [
      // Estratégia 2: Itens de imagem
      () => {
        if (imageVersions?.items && imageVersions.items.length > 0) {
          console.log('Estratégia 2 - Usando primeiro item de imagem');
          return imageVersions.items[0].url;
        }
        return null;
      },

      // Estratégia 3: Itens adicionais
      () => {
        if (imageVersions?.additional_items) {
          const additionalImages = [
            imageVersions.additional_items.first_frame,
            imageVersions.additional_items.igtv_first_frame,
            imageVersions.additional_items.smart_frame
          ].filter(Boolean);

          if (additionalImages.length > 0) {
            console.log('Estratégia 3 - Usando primeiro item adicional');
            return additionalImages[0].url;
          }
        }
        return null;
      },

      // Estratégia 4: Display URL
      () => {
        if (imageVersions?.display_url) {
          console.log('Estratégia 4 - Usando display_url');
          return imageVersions.display_url;
        }
        return null;
      },

      // Estratégia 5: URL direta no objeto
      () => {
        if (typeof imageVersions === 'string') {
          console.log('Estratégia 5 - Usando URL direta');
          return imageVersions;
        }
        return null;
      }
    ];

    // Tentar estratégias em ordem
    for (const strategy of imageStrategies) {
      const imageUrl = strategy();
      if (imageUrl) {
        console.log('URL da imagem selecionada:', imageUrl);
        return imageUrl;
      }
    }

    console.warn('Nenhuma imagem encontrada');
    return 'https://via.placeholder.com/150'; // Imagem de placeholder
  };

  const toggleReelSelection = (reel: InstagramPost) => {
    setSelectedReels(prevSelected => 
      prevSelected.some(selectedReel => selectedReel.id === reel.id)
        ? prevSelected.filter(selectedReel => selectedReel.id !== reel.id)
        : [...prevSelected, reel]
    );
  };

  if (loading) return <div>Carregando Reels...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (reels.length === 0) return <div>Nenhum Reel encontrado</div>;

  return (
    <div className="grid grid-cols-3 gap-2">
      {reels.map(reel => {
        // Log para cada Reel individual
        console.log('Renderizando Reel:', JSON.stringify(reel, null, 2));

        // Selecionar URL da imagem
        const imageUrl = selectBestImageUrl(reel.image_versions);
        const proxiedImageUrl = getProxiedImageUrl(imageUrl);

        return (
          <div 
            key={reel.id} 
            onClick={() => toggleReelSelection(reel)}
            className={`cursor-pointer relative overflow-hidden rounded transition-all duration-300 ease-in-out ${
              selectedReels.some(selectedReel => selectedReel.id === reel.id)
                ? 'border-4 border-pink-500 bg-black bg-opacity-50 scale-105 shadow-2xl'
                : ''
            }`}
          >
            {imageUrl && (
              <Image
                src={proxiedImageUrl}
                alt={reel.caption?.text || 'Reel'}
                width={640}
                height={640}
                className={`w-full h-32 object-cover rounded transition-transform duration-300 ease-in-out ${
                  selectedReels.some(selectedReel => selectedReel.id === reel.id)
                    ? 'brightness-50'
                    : ''
                }`}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 flex justify-between text-xs">
              <span className="flex items-center">
                ❤️ {reel.like_count || 0}
              </span>
              <span className="flex items-center">
                💬 {reel.comment_count || 0}
              </span>
              <span className="flex items-center">
                👀 {reel.views_count || 0}
              </span>
            </div>
            {selectedReels.some(selectedReel => selectedReel.id === reel.id) && (
              <div className="absolute top-2 right-2 text-3xl animate-pulse">
                ❤️
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
