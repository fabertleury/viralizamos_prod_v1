'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getProxiedImageUrl } from '@/app/checkout/instagram-v2/utils/proxy-image';

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
}

interface PostSelectorProps {
  posts?: Post[];
  loading: boolean;
  loadingMessage?: string;
  maxSelectable?: number;
  onSelect?: (selectedPosts: Post[]) => void;
  selectedPosts?: Post[];
  serviceType?: 'curtidas' | 'visualizacao' | 'comentarios';
  username?: string;
  onPostSelect?: (selectedPosts: Post[]) => void;
  selectedReels?: Post[];
  maxPosts?: number;
  service?: any;
  totalComments?: number;
}

export default function PostSelector({
  posts = [],
  loading,
  loadingMessage = 'Carregando posts...',
  maxSelectable,
  onSelect,
  selectedPosts = [],
  serviceType = 'curtidas',
  onPostSelect,
  maxPosts,
  totalComments,
  selectedReels = []
}: PostSelectorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  const effectiveMaxSelectable = maxPosts || maxSelectable || 1;

  const handleSelect = (posts: Post[]) => {
    if (onPostSelect) {
      onPostSelect(posts);
    } else if (onSelect) {
      onSelect(posts);
    }
  };

  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    selectedPosts.forEach(post => {
      initialSelected[post.id] = true;
    });
    setSelected(initialSelected);
  }, [selectedPosts]);

  const handlePostClick = (post: Post) => {
    const newSelected = { ...selected };

    if (newSelected[post.id]) {
      delete newSelected[post.id];
    } else {
      // Verificar o limite total (posts + reels)
      const totalSelectedItems = Object.keys(newSelected).length + (selectedReels?.length || 0);
      if (totalSelectedItems >= 5) {
        toast.warning(`Você só pode selecionar até 5 itens no total (posts + reels)`);
        return;
      }
      newSelected[post.id] = true;
    }

    setSelected(newSelected);

    const updatedSelectedPosts = posts.filter(post => newSelected[post.id]);
    handleSelect(updatedSelectedPosts);
  };

  const getServiceLabel = () => {
    switch (serviceType) {
      case 'curtidas':
        return 'curtidas';
      case 'visualizacao':
        return 'visualizações';
      case 'comentarios':
        return 'comentários';
      default:
        return 'curtidas';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">{loadingMessage}</p>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 font-medium">Nenhum post encontrado para este perfil.</p>
        <p className="text-yellow-600 mt-2">Verifique se o perfil possui posts públicos ou tente outro perfil.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Selecione até {effectiveMaxSelectable} posts para receber {getServiceLabel()}
        </h3>
        <span className="text-sm text-gray-600">
          {Object.keys(selected).length} de {effectiveMaxSelectable} selecionados
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {posts.slice(0, 12).map((post) => {
          const isSelected = !!selected[post.id];
          const isHovered = hoveredPost === post.id;

          return (
            <Card
              key={post.id}
              className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-purple-500 scale-[1.02]' : ''
              }`}
              onClick={() => handlePostClick(post)}
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              <div className="relative aspect-square">
                <img
                  src={getProxiedImageUrl(post.image_url || post.thumbnail_url || post.display_url || '')}
                  alt={post.caption || 'Instagram post'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.src = '/images/placeholder-post.svg';
                  }}
                />

                {/* Overlay para posts selecionados */}
                {isSelected && (
                  <div className="absolute inset-0 bg-purple-600 bg-opacity-30 flex items-center justify-center">
                    <div className="bg-white rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Overlay para hover */}
                {isHovered && !isSelected && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="text-white text-center">
                      <p className="font-semibold">Clique para selecionar</p>
                    </div>
                  </div>
                )}

                {/* Contador de curtidas */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 flex justify-between">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.like_count || 0}
                  </span>
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.comment_count || 0}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
