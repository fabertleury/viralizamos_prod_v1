'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { InstagramPost } from '@/types/instagram';

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
  const [reels, setReels] = useState<InstagramPost[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');

  const getProxiedImageUrl = (originalUrl: string) => {
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
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
          
          // Processar posts
          const allPosts = postsData || [];

          if (allPosts.length > 0) {
            const processedPosts = allPosts.map(post => ({
              ...post,
              media_type: post.media_type || 1,
              is_video: post.is_video || false,
              image_versions: {
                items: [{
                  url: post.image_versions?.items?.[0]?.url || 
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
              }
            }));

            console.log('Posts processados:', processedPosts.map(p => ({
              id: p.id,
              mediaType: p.media_type,
              isVideo: p.is_video,
              imageUrl: p.image_versions.items[0].url
            })));

            // Separar posts e reels
            const postsOnly = processedPosts.filter(post => !post.is_video);
            const reelsOnly = processedPosts.filter(post => post.is_video);

            console.log('Resultado da separação:', {
              totalPosts: processedPosts.length,
              postsOnly: postsOnly.length,
              reelsOnly: reelsOnly.length
            });

            setPosts(postsOnly);
            setReels(reelsOnly);
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

  const currentPosts = activeTab === 'posts' ? posts : reels;

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
          Reels ({reels.length})
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : currentPosts.length === 0 ? (
        <div>Nenhum {activeTab === 'posts' ? 'post' : 'reel'} encontrado</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {currentPosts.map(post => (
            <div 
              key={post.id} 
              onClick={() => togglePostSelection(post)}
              className={`relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300 
                ${
                  selectedPosts.some(p => p.id === post.id) 
                    ? 'border-4 border-pink-500 scale-105' 
                    : 'border border-gray-300 hover:scale-105'
                }`}
            >
              <img 
                src={getProxiedImageUrl(post.image_versions.items[0].url)} 
                alt={`Post ${post.id}`} 
                className="w-full h-48 object-cover"
              />
              {selectedPosts.some(p => p.id === post.id) && (
                <div className="absolute top-2 right-2 text-2xl">❤️</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 flex justify-between">
                <span className="flex items-center">
                  ❤️ {post.like_count || 0}
                </span>
                <span className="flex items-center">
                  💬 {post.comment_count || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
