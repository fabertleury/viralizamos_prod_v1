'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PaymentSuccessModal } from './PaymentSuccessModal';

interface PaymentPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode?: string;
  qrCodeText: string;
  paymentId: string;
  qrCodeBase64?: string;
  serviceId?: string;
  targetProfileLink?: string;
  serviceName?: string;
}

export function PaymentPixModal({ 
  isOpen, 
  onClose, 
  qrCode, 
  qrCodeText, 
  paymentId, 
  qrCodeBase64: initialQrCodeBase64,
  serviceId,
  targetProfileLink,
  serviceName
}: PaymentPixModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [qrCodeBase64, setQrCodeBase64] = useState(initialQrCodeBase64);
  const router = useRouter();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckAttempts, setStatusCheckAttempts] = useState(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastVerificationTime, setLastVerificationTime] = useState(0);

  useEffect(() => {
    console.log('Initial props:', { 
      qrCode, 
      qrCodeText, 
      paymentId, 
      initialQrCodeBase64 
    });
  }, [qrCode, qrCodeText, paymentId, initialQrCodeBase64]);

  // Função para garantir que o QR Code seja renderizável
  const getQRCodeSrc = useCallback(() => {
    console.log('Detalhes do QR Code (getQRCodeSrc):', { 
      qrCodeBase64, 
      length: qrCodeBase64?.length, 
      qrCode,
      initialQrCodeBase64
    });

    // Priorizar qrCodeBase64 recebido do backend
    if (qrCodeBase64) {
      console.log('QR Code base64:', qrCodeBase64);
      console.log('QR Code length:', qrCodeBase64.length);
      
      // Remover prefixo de dados se existir
      const base64 = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
      return `data:image/png;base64,${base64}`;
    }

    // Fallback para gerar QR Code via URL externa
    if (qrCodeText) {
      console.log('Gerando QR Code via URL:', 
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeText)}`
      );
      
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeText)}`;
    }

    // Se nenhuma fonte de QR Code estiver disponível
    return undefined;
  }, [qrCodeBase64, qrCodeText, initialQrCodeBase64]);

  useEffect(() => {
    console.log('Initial qrCode:', qrCode);
    console.log('Initial qrCodeBase64:', qrCodeBase64);
  }, [qrCode, qrCodeBase64]);

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    let interval: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      // Evitar verificações muito frequentes
      const now = Date.now();
      if (now - lastVerificationTime < 2000) {
        console.log('Verificação muito frequente, ignorando');
        return null;
      }
      
      setLastVerificationTime(now);
      setIsCheckingStatus(true);
      
      console.log('Verificando status de pagamento', { 
        paymentId, 
        attempt: statusCheckAttempts + 1
      });

      if (!paymentId) {
        console.error('Payment ID is undefined or null');
        setIsCheckingStatus(false);
        return null;
      }

      try {
        // Usar o novo endpoint de verificação rápida
        const response = await fetch('/api/payment/verify-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payment_id: paymentId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro na verificação de status:', {
            status: response.status,
            error: errorText
          });
          setIsCheckingStatus(false);
          return null;
        }

        const data = await response.json();
        
        console.log('Resposta da verificação de status:', data);
        
        // Atualizar o status do pagamento
        const paymentStatus = data.status;
        
        switch (paymentStatus) {
          case 'approved':
            setPaymentStatus('success');
            console.log('Pagamento APROVADO');
            
            // Redirecionar para a página de agradecimento
            if (data.transaction_id) {
              router.push(`/agradecimento?id=${data.transaction_id}`);
              onClose();
            }
            break;
          case 'pending':
            setPaymentStatus('pending');
            console.log('Pagamento PENDENTE');
            break;
          case 'in_process':
            setPaymentStatus('processing');
            console.log('Pagamento EM PROCESSAMENTO');
            break;
          case 'rejected':
            setPaymentStatus('error');
            console.log('Pagamento REJEITADO');
            break;
          default:
            setPaymentStatus('unknown');
            console.log('Status de pagamento DESCONHECIDO:', paymentStatus);
        }

        setStatusCheckAttempts(prev => prev + 1);
        return data;
      } catch (error) {
        console.error('Erro na verificação de status:', error);
        
        // Verificar se é um erro de conexão e tratar adequadamente
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log('Erro de conexão detectado. O servidor pode estar indisponível.');
          
          // Reduzir a frequência de verificação após falhas de conexão
          if (statusCheckAttempts > 3) {
            console.log('Reduzindo frequência de verificação após múltiplas falhas');
            // Não vamos interromper completamente, apenas reduzir a frequência
          }
        }
        
        return null;
      } finally {
        setIsCheckingStatus(false);
      }
    };

    // Verificar imediatamente
    checkPaymentStatus();

    // Definir intervalo adaptativo baseado no número de falhas
    const intervalTime = statusCheckAttempts > 3 ? 10000 : 5000; // 10 segundos após 3 falhas, 5 segundos normalmente
    
    console.log(`Configurando verificação a cada ${intervalTime/1000} segundos`);
    interval = setInterval(checkPaymentStatus, intervalTime);

    // Limpar o intervalo quando o componente for desmontado
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, paymentId, onClose, router, statusCheckAttempts, lastVerificationTime]);

  useEffect(() => {
    console.log('QR Code base64:', qrCodeBase64);
    console.log('QR Code length:', qrCodeBase64?.length);
  }, [qrCodeBase64]);

  const copyQRCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      console.log('Código PIX copiado!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {paymentStatus === 'approved' ? 'Pagamento Aprovado!' : 'Pagamento via PIX'}
                </Dialog.Title>

                <div className="mt-4 flex flex-col items-center space-y-4">
                  {paymentStatus === 'approved' ? (
                    <div className="text-center space-y-2">
                      <p className="text-green-600 font-medium">Pagamento recebido com sucesso!</p>
                      <p className="text-sm text-gray-500">Você será redirecionado em instantes...</p>
                    </div>
                  ) : paymentStatus === 'failed' ? (
                    <div className="text-center space-y-2">
                      <p className="text-red-600 font-medium">Pagamento não aprovado</p>
                      <p className="text-sm text-gray-500">Por favor, tente novamente ou escolha outra forma de pagamento</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Realize o pagamento através do QR code abaixo:
                        </h4>
                        <p className="text-sm text-gray-600">
                          Após o pagamento aguarde, o processamento é automático
                        </p>
                      </div>

                      <div className="bg-gray-100 p-4 rounded-lg">
                        {getQRCodeSrc() ? (
                          <Image
                            src={getQRCodeSrc()!}
                            alt="QR Code PIX"
                            width={200}
                            height={200}
                            className="mx-auto"
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', e);
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <p className="text-yellow-600 font-medium">QR Code não disponível</p>
                            <p className="text-sm text-gray-500 text-center">
                              Por favor, copie o código PIX abaixo para realizar o pagamento
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-center mt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Ou
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Copie o Código Pix abaixo e insira na opção Pix Copia e Cola no aplicativo do seu banco para realizar o pagamento do pix:
                        </p>
                      </div>

                      <div className="mt-2 w-full">
                        <Button 
                          onClick={copyQRCode} 
                          variant="outline" 
                          className="w-full"
                        >
                          Copiar Código PIX
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      <PaymentSuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        serviceDetails={{
          targetProfileLink,
          serviceName
        }}
      />
    </Transition>
  );
}
