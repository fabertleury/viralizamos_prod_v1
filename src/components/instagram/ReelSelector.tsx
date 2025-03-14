'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getProxiedImageUrl } from '@/app/checkout/instagram-v2/utils/proxy-image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';

interface Reel {
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
  view_count?: number;
}

interface ReelSelectorProps {
  reels: Reel[];
  loading: boolean;
  loadingMessage: string;
  maxSelectable: number;
  onSelect: (selectedReels: Reel[]) => void;
  selectedReels: Reel[];
  serviceType?: 'reels' | 'visualizacao' | 'comentarios' | 'curtidas';
}

export default function ReelSelector({
  reels,
  loading,
  loadingMessage,
  maxSelectable,
  onSelect,
  selectedReels,
  serviceType = 'reels'
}: ReelSelectorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [hoveredReel, setHoveredReel] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar o estado selected com base nos reels já selecionados
    const initialSelected: Record<string, boolean> = {};
    selectedReels.forEach(reel => {
      initialSelected[reel.id] = true;
    });
    setSelected(initialSelected);
  }, [selectedReels]);

  const handleReelClick = (reel: Reel) => {
    const newSelected = { ...selected };
    
    // Se já está selecionado, desmarcar
    if (newSelected[reel.id]) {
      delete newSelected[reel.id];
    } 
    // Se não está selecionado, verificar se já atingiu o limite
    else {
      const selectedCount = Object.keys(newSelected).length;
      if (selectedCount >= maxSelectable) {
        toast.warning(`Você só pode selecionar até ${maxSelectable} reels`);
        return;
      }
      newSelected[reel.id] = true;
    }
    
    setSelected(newSelected);
    
    // Atualizar a lista de reels selecionados
    const updatedSelectedReels = reels.filter(reel => newSelected[reel.id]);
    onSelect(updatedSelectedReels);
  };

  const getServiceLabel = () => {
    switch (serviceType) {
      case 'curtidas':
        return 'curtidas';
      case 'visualizacao':
        return 'visualizações';
      case 'comentarios':
        return 'comentários';
      case 'reels':
        return 'visualizações';
      default:
        return 'visualizações';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">{loadingMessage || 'Carregando reels...'}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 font-medium">Nenhum reel encontrado para este perfil.</p>
        <p className="text-yellow-600 mt-2">Verifique se o perfil possui reels públicos ou tente outro perfil.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Selecione até {maxSelectable} reels para receber {getServiceLabel()}
        </h3>
        <span className="text-sm text-gray-600">
          {Object.keys(selected).length} de {maxSelectable} selecionados
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {reels.map((reel) => {
          const isSelected = !!selected[reel.id];
          const isHovered = hoveredReel === reel.id;
          
          return (
            <Card 
              key={reel.id}
              className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-purple-500 scale-[1.02]' : ''
              }`}
              onClick={() => handleReelClick(reel)}
              onMouseEnter={() => setHoveredReel(reel.id)}
              onMouseLeave={() => setHoveredReel(null)}
            >
              <div className="relative aspect-square">
                <img
                  src={getProxiedImageUrl(reel.image_url || reel.thumbnail_url || reel.display_url || '')}
                  alt={reel.caption || 'Instagram reel'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.src = '/placeholder-image.png';
                  }}
                />
                
                {/* Ícone de play para indicar que é um reel */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1">
                  <FontAwesomeIcon icon={faPlay} className="h-3 w-3 text-white" />
                </div>
                
                {/* Overlay para reels selecionados */}
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
                
                {/* Contador de visualizações/curtidas */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 flex justify-between">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {reel.view_count || 0}
                  </span>
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {reel.like_count || 0}
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
