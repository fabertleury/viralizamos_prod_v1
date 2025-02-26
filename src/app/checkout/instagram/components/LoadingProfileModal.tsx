'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getProxiedImageUrl } from '../utils/proxy-image';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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

  const [canRetry, setCanRetry] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Chave para forçar reinício do timer

  useEffect(() => {
    // Resetar o timer quando o modal for aberto
    if (open && profileData?.is_private) {
      setCanRetry(false);
      setTimerKey(prev => prev + 1);
    }
  }, [open, profileData]);

  console.log('LoadingProfileModal - Dados recebidos:', {
    open,
    loadingStage,
    error,
    profileData,
    serviceId,
    checkoutSlug
  });

  const messages = {
    searching: 'Estamos buscando o seu perfil...',
    checking: 'Estamos verificando se perfil é público...',
    loading: 'Estamos carregando seus dados...',
    done: 'Perfil encontrado!',
    error: error || 'Ocorreu um erro ao buscar o perfil'
  };

  const handleContinue = () => {
    console.log('Tentando continuar com dados:', {
      profileData,
      serviceId,
      checkoutSlug,
      isPrivate: profileData?.is_private
    });

    if (profileData && serviceId && checkoutSlug) {
      // Verificar se o perfil é privado
      if (profileData.is_private === true) {
        toast.error('Seu perfil precisa ser público para continuar. Por favor, altere as configurações do Instagram.');
        onOpenChange(true); // Garantir que o modal permaneça aberto
        return;
      }

      // Salvar dados no localStorage
      localStorage.setItem('checkoutProfileData', JSON.stringify({
        profileData,
        serviceId,
        timestamp: new Date().getTime()
      }));
      
      router.push(`/checkout/instagram/${checkoutSlug}/step2`);
    } else {
      console.error('Dados insuficientes para continuar', {
        profileData,
        serviceId,
        checkoutSlug
      });
      toast.error('Erro ao processar dados do perfil. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-0">
        <DialogTitle className="sr-only">Status do Perfil</DialogTitle>
        
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {console.log('Modal Rendering Details:', {
            open,
            loadingStage,
            profileData,
            isPrivate: profileData?.is_private,
            error
          })}

          {loadingStage !== 'error' && loadingStage !== 'done' && (
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          )}
          
          {profileData?.is_private === true && (
            <div className="flex flex-col items-center space-y-4 text-center">
              {console.log('Renderizando modal de perfil privado', { 
                loadingStage, 
                isPrivate: profileData?.is_private,
                profileData 
              })}
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 w-full">
                <p className="font-bold mb-2">Atenção: Perfil Privado Detectado</p>
                <p className="mb-3">Seu perfil do Instagram precisa estar público para continuar com a compra de curtidas. Siga os passos abaixo:</p>
                <ol className="list-decimal list-inside space-y-2 mb-3">
                  <li>Abra o aplicativo do Instagram</li>
                  <li>Vá para seu perfil</li>
                  <li>Toque em "Configurações"</li>
                  <li>Selecione "Privacidade"</li>
                  <li>Desative a opção "Conta Privada"</li>
                </ol>
                <p className="text-xs text-gray-600">Após alterar, pode levar alguns minutos para o Instagram atualizar suas configurações.</p>
              </div>

              {!canRetry ? (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 text-center text-blue-800">
                  <p className="text-sm mb-2">Você poderá tentar novamente em:</p>
                  <div className="text-lg font-bold">
                    <CountdownTimer 
                      key={timerKey} 
                      initialSeconds={60} 
                      onComplete={() => setCanRetry(true)} 
                    />
                  </div>
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

          {(loadingStage === 'done' && profileData && !profileData.is_private) && (
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

          {(loadingStage === 'error' && profileData?.is_private !== true) && (
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
