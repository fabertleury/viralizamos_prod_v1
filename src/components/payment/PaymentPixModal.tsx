'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PaymentSuccessModal } from './PaymentSuccessModal';
import { PixPayment } from './PixPayment';

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
  amount?: number;
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
  serviceName,
  amount
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
    
    // Rastrear início do checkout com Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: amount,
        currency: 'BRL',
        content_name: serviceName,
        content_ids: [serviceId]
      });
    }
  }, [qrCode, qrCodeText, paymentId, initialQrCodeBase64, amount, serviceName, serviceId]);

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
    
    // Se recebermos initialQrCodeBase64 mas qrCodeBase64 ainda não estiver definido, atualizá-lo
    if (initialQrCodeBase64 && !qrCodeBase64) {
      setQrCodeBase64(initialQrCodeBase64);
    }
  }, [qrCode, qrCodeBase64, initialQrCodeBase64]);

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    let interval: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      // Evitar verificações muito frequentes
      const now = Date.now();
      if (now - lastVerificationTime < 3000) {
        console.log('Verificação muito frequente no PaymentPixModal, ignorando');
        return null;
      }
      
      setLastVerificationTime(now);
      setIsCheckingStatus(true);
      
      console.log('Verificando status de pagamento (PaymentPixModal)', { 
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
          // Não mostrar erro para o usuário, apenas logar no console
          return null;
        }

        const data = await response.json();
        
        console.log('Resposta da verificação de status (PaymentPixModal):', data);
        
        // Atualizar o status do pagamento
        const paymentStatus = data.status;
        
        switch (paymentStatus) {
          case 'approved':
            setPaymentStatus('success');
            console.log('Pagamento APROVADO');
            
            // Rastrear conversão com Facebook Pixel
            if (typeof window !== 'undefined' && (window as any).fbq) {
              (window as any).fbq('track', 'Purchase', {
                value: amount,
                currency: 'BRL',
                content_name: serviceName,
                content_ids: [serviceId],
                content_type: 'product'
              });
            }
            
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
    // Aumentando o intervalo para reduzir o número de requisições
    const intervalTime = statusCheckAttempts > 3 ? 15000 : 10000; // 15 segundos após 3 falhas, 10 segundos normalmente
    
    console.log(`Configurando verificação a cada ${intervalTime/1000} segundos (PaymentPixModal)`);
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
                      <PixPayment
                        qrCodeBase64={qrCodeBase64 || getQRCodeSrc() || ''}
                        copyPasteCode={qrCodeText}
                        orderId={paymentId}
                        amount={amount || 0}
                        onPaymentSuccess={() => {
                          setPaymentStatus('success');
                          // Aguardar um pouco antes de fechar o modal
                          setTimeout(() => {
                            onClose();
                          }, 2000);
                        }}
                      />
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
