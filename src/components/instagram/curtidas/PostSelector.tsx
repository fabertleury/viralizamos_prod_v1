'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { InstagramPost } from '@/types/instagram';
import ReelSelector from './ReelSelector';
import Image from 'next/image';

interface Service {
  id: string;
  name: string;
  preco: number;
  quantidade: number;
}

interface PostSelectorProps {
  username: string;
  onSelectPosts: (posts: InstagramPost[]) => void;
  maxPosts: number;
  service: Service;
}

export function PostSelector({ username, onSelectPosts, maxPosts, service }: PostSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');

  const getProxiedImageUrl = (originalUrl: string) => {
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  };

  const selectBestImageUrl = (imageVersions: any) => {
    // Handle different image version structures
    if (imageVersions.items && imageVersions.items.length > 0) {
      // Prefer highest resolution image
      const highResImage = imageVersions.items.reduce((prev, current) => 
        (prev.height > current.height) ? prev : current
      );
      return highResImage.url;
    }

    // Check for additional items like first_frame or igtv_first_frame
    if (imageVersions.additional_items) {
      const additionalImages = [
        imageVersions.additional_items.first_frame,
        imageVersions.additional_items.igtv_first_frame
      ].filter(Boolean);

      if (additionalImages.length > 0) {
        return additionalImages[0].url;
      }
    }

    // Fallback to empty string if no image found
    return '';
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
            const processedPosts = allPosts.map(post => {
              // Log detalhado do post individual
              console.log('Post individual:', JSON.stringify(post, null, 2));

              return {
                ...post,
                media_type: post.media_type || 1,
                is_video: post.is_video || false,
                image_versions: {
                  items: [{
                    url: selectBestImageUrl(post.image_versions) || 
                         post.display_url || 
                         'https://via.placeholder.com/150'
                  }]
                },
                caption: { 
                  text: post.caption 
                    ? (typeof post.caption === 'object' 
                      ? post.caption.text || 'Sem legenda'
                      : String(post.caption)) 
                    : 'Sem legenda'
                },
                formatted_date: post.taken_at 
                  ? new Date(post.taken_at * 1000).toLocaleDateString('pt-BR') 
                  : 'Data não disponível',
                // Tenta capturar visualizações de múltiplas formas
                views_count: 
                  post.view_count || 
                  post.views_count || 
                  post.view_count_formatted || 
                  post.video_view_count || 
                  (post.video_versions && post.video_versions.view_count) || 
                  0
              }
            });

            console.log('Posts processados:', processedPosts.map(p => ({
              id: p.id,
              mediaType: p.media_type,
              isVideo: p.is_video,
              imageUrl: p.image_versions.items[0].url,
              formattedDate: p.formatted_date
            })));

            // Separar posts e reels
            const postsOnly = processedPosts.filter(post => !post.is_video);

            console.log('Resultado da separação:', {
              totalPosts: processedPosts.length,
              postsOnly: postsOnly.length
            });

            setPosts(postsOnly);
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

  const togglePostSelection = (post: InstagramPost) => {
    const isSelected = selectedPosts.some(p => p.id === post.id);
    
    if (isSelected) {
      // Remover post se já estiver selecionado
      const updatedPosts = selectedPosts.filter(p => p.id !== post.id);
      setSelectedPosts(updatedPosts);
      onSelectPosts(updatedPosts);
    } else {
      // Adicionar post se não estiver no limite máximo
      if (selectedPosts.length < maxPosts) {
        const updatedPosts = [...selectedPosts, post];
        setSelectedPosts(updatedPosts);
        onSelectPosts(updatedPosts);
      } else {
        toast.warning(`Você pode selecionar no máximo ${maxPosts} posts`);
      }
    }
  };

  return (
    <div>
      <div className="flex mb-4">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 mr-2 rounded-lg font-bold transition-colors ${
            activeTab === 'posts' 
              ? 'bg-pink-500 text-white' 
              : 'bg-pink-100 text-pink-500 hover:bg-pink-200'
          }`}
        >
          Posts ({posts.length})
        </button>
        <button 
          onClick={() => setActiveTab('reels')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'reels' 
              ? 'bg-pink-500 text-white' 
              : 'bg-pink-100 text-pink-500 hover:bg-pink-200'
          }`}
        >
          Reels
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : activeTab === 'posts' ? (
        <div className="grid grid-cols-3 gap-2">
          {posts.map(post => (
            <div 
              key={post.id} 
              onClick={() => togglePostSelection(post)}
              className={`cursor-pointer relative overflow-hidden rounded transition-all duration-300 ease-in-out ${
                selectedPosts.some(selectedPost => selectedPost.id === post.id)
                  ? 'border-4 border-pink-500 bg-black bg-opacity-50 scale-105 shadow-2xl'
                  : ''
              }`}
            >
              {selectBestImageUrl(post.image_versions) && (
                <Image
                  src={getProxiedImageUrl(selectBestImageUrl(post.image_versions))}
                  alt={post.caption?.text || 'Post'}
                  width={640}
                  height={640}
                  className={`w-full h-32 object-cover rounded transition-transform duration-300 ease-in-out ${
                    selectedPosts.some(selectedPost => selectedPost.id === post.id)
                      ? 'brightness-50'
                      : ''
                  }`}
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 flex justify-between text-xs">
                <span className="flex items-center">
                  ❤️ {post.like_count || 0}
                </span>
                <span className="flex items-center">
                  💬 {post.comment_count || 0}
                </span>
              </div>
              {selectedPosts.some(selectedPost => selectedPost.id === post.id) && (
                <div className="absolute top-2 right-2 text-3xl animate-pulse">
                  ❤️
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ReelSelector username={username} />
      )}
    </div>
  );
}
