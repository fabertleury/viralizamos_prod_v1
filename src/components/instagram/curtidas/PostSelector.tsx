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
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);

  const getProxiedImageUrl = (originalUrl: string) => {
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  };

  useEffect(() => {
    async function loadPosts() {
      if (!username) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/instagram/posts/${username}`);
        if (!response.ok) {
          throw new Error('Erro ao carregar posts do Instagram');
        }
        const postsData = await response.json();
        if (Array.isArray(postsData) && postsData.length > 0) {
          setPosts(postsData);
        } else {
          console.error('Nenhum post retornado da API:', postsData);
          throw new Error('Nenhum post encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
        toast.error('Erro ao carregar os posts. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [username]);

  useEffect(() => {
    const selectedPostsData = selectedPosts.map(post => ({
      id: post.id,
      shortcode: post.code, 
      link: post.link, 
      caption: post.caption?.text || '',
      image_url: post.image_versions?.items?.[0]?.url || null
    }));

    if (selectedPostsData.length > 0) {
      onSelectPosts(selectedPostsData);
    }
  }, [selectedPosts, onSelectPosts]);

  const handlePostSelect = (post: InstagramPost) => {
    setSelectedPosts(prevSelected => {
      const isSelected = prevSelected.some(p => p.id === post.id);
      let newSelected;
      
      if (isSelected) {
        newSelected = prevSelected.filter(p => p.id !== post.id);
      } else {
        if (prevSelected.length >= maxPosts) {
          toast.error(`Você pode selecionar no máximo ${maxPosts} posts`);
          return prevSelected;
        }
        newSelected = [...prevSelected, post];
      }

      return newSelected;
    });
  };

  const likesPerPost = service?.quantidade 
    ? Math.floor(service.quantidade / (selectedPosts.length || 1))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-600 mb-2">
        Você pode selecionar até {maxPosts} posts para distribuir {service.quantidade} curtidas
      </p>
      {selectedPosts.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Cada post selecionado receberá aproximadamente {likesPerPost} curtidas
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.isArray(posts) && posts.length > 0 ? (
          posts.map((post) => {
            const isSelected = selectedPosts.some(p => p.id === post.id);
            return (
              <div
                key={post.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                  isSelected ? 'ring-4 ring-pink-500' : ''
                }`}
                onClick={() => handlePostSelect(post)}
              >
                <div className="relative w-full h-48">
                  <img
                    src={getProxiedImageUrl(post.image_versions.items[0].url)}
                    alt={post.caption?.text || 'Post do Instagram'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 flex justify-between">
                    <span className="flex items-center gap-1">
                      ❤️ {post.like_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      💬 {post.comment_count || 0}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-pink-500 bg-opacity-30 flex items-center justify-center">
                    ❤️
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-3 text-center py-8">
            <p className="text-gray-500">Nenhum post encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
