'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getProxiedImageUrl } from '../utils/proxy-image';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { useState } from 'react';

interface LoadingProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingStage: 'searching' | 'checking' | 'loading' | 'done' | 'error';
  error?: string;
  profileData?: any;
  serviceId?: string;
  checkoutSlug?: string;
}

export function LoadingProfileModal({
  open,
  onOpenChange,
  loadingStage,
  error,
  profileData,
  serviceId,
  checkoutSlug
}: LoadingProfileModalProps) {
  const router = useRouter();

  const messages = {
    searching: 'Estamos buscando o seu perfil...',
    checking: 'Estamos verificando se perfil é público...',
    loading: 'Estamos carregando seus dados...',
    done: 'Perfil encontrado!',
    error: error || 'Ocorreu um erro ao buscar o perfil'
  };

  const [canRetry, setCanRetry] = useState(false);

  const handleContinue = () => {
    if (profileData && serviceId && checkoutSlug) {
      // Salvar dados no localStorage
      localStorage.setItem('checkoutProfileData', JSON.stringify({
        profileData,
        serviceId,
        timestamp: new Date().getTime()
      }));
      
      router.push(`/checkout/instagram/${checkoutSlug}/step2`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-0">
        <DialogTitle className="sr-only">Status do Perfil</DialogTitle>
        
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {loadingStage !== 'error' && loadingStage !== 'done' && (
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          )}
          
          {loadingStage === 'done' && profileData && (
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                <img 
                  src={getProxiedImageUrl(profileData.profile_pic_url)}
                  alt={profileData.username}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="text-center text-gray-900 space-y-2">
                <h3 className="text-lg font-semibold">{profileData.username}</h3>
                <p className="text-sm text-gray-600">{profileData.full_name}</p>
                
                <div className="flex justify-center gap-8 mt-4">
                  <div className="text-center">
                    <div className="font-semibold">{profileData.media_count}</div>
                    <div className="text-sm text-gray-600">publicações</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{profileData.follower_count.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">seguidores</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{profileData.following_count.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">seguindo</div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                Continuar
              </Button>
            </div>
          )}

          {loadingStage === 'error' && profileData?.is_private && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                <img 
                  src={getProxiedImageUrl(profileData.profile_pic_url)}
                  alt={profileData.username}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="text-center text-gray-900 space-y-2">
                <h3 className="text-lg font-semibold">{profileData.username}</h3>
                <div className="flex items-center justify-center text-yellow-600 gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Perfil Privado</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p>Seu perfil está configurado como privado. Para continuar:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Acesse seu perfil no Instagram</li>
                  <li>Vá em Configurações {'>'} Privacidade</li>
                  <li>Desative a opção "Conta Privada"</li>
                </ol>
                <p className="mt-2 text-xs">Após mudar a privacidade do perfil, pode levar alguns minutos para o Instagram atualizar as informações.</p>
              </div>

              {!canRetry ? (
                <div className="text-sm text-gray-600">
                  Você poderá tentar novamente em <CountdownTimer initialSeconds={300} onComplete={() => setCanRetry(true)} />
                </div>
              ) : (
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    setCanRetry(false);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                >
                  Tentar Novamente
                </Button>
              )}
            </div>
          )}

          {loadingStage === 'error' && !profileData?.is_private && (
            <div className="text-center text-red-500">
              <p>{messages[loadingStage]}</p>
            </div>
          )}

          {loadingStage !== 'done' && loadingStage !== 'error' && (
            <p className="text-center text-gray-600">{messages[loadingStage]}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
