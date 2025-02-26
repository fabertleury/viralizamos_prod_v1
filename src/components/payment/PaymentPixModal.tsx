'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PaymentPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode?: string;
  qrCodeText: string;
  paymentId: string;
  qrCodeBase64?: string;
}

export function PaymentPixModal({ 
  isOpen, 
  onClose, 
  qrCode, 
  qrCodeText, 
  paymentId, 
  qrCodeBase64: initialQrCodeBase64 
}: PaymentPixModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [qrCodeBase64, setQrCodeBase64] = useState(initialQrCodeBase64);
  const router = useRouter();

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
      try {
        console.log('Iniciando verificação de status de pagamento', { 
          paymentId, 
          isOpen,
          fullUrl: `/api/payment/check-status`,
          paymentIdType: typeof paymentId,
          paymentIdLength: paymentId?.length,
          paymentIdSource: paymentId ? 'transaction.payment_external_reference' : 'undefined',
          nodeEnv: process.env.NODE_ENV,
          nextPublicVercel: process.env.NEXT_PUBLIC_VERCEL_ENV
        });

        if (!paymentId) {
          console.error('Payment ID is undefined or null');
          return null;
        }

        const headers = {
          'Content-Type': 'application/json',
        };

        const fullUrl = new URL('/api/payment/check-status', window.location.origin).toString();
        console.log('URL completa da requisição:', fullUrl);

        const response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ payment_id: paymentId }),
        });

        console.log('Resposta da verificação de status:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro detalhado na resposta:', {
            status: response.status,
            errorText,
            contentType: response.headers.get('content-type')
          });
          
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Erro em formato JSON:', errorJson);
            
            // Verificação adicional com Supabase
            if (errorJson.details && errorJson.details.includes('No payment found')) {
              console.warn('Possível problema: Pagamento não encontrado. Verificando detalhes...');
              
              const supabaseResponse = await fetch('/api/supabase/find-transaction', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  payment_external_reference: paymentId 
                })
              });

              const supabaseData = await supabaseResponse.json();
              console.log('Resultado da busca no Supabase:', supabaseData);
            }
          } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
          }

          // Tratamento de erro mais detalhado
          const errorDetails = JSON.parse(errorText);
          throw new Error(errorDetails.details || 'Erro ao verificar status do pagamento');
        }

        const data = await response.json();
        console.log('Dados completos do status de pagamento:', data);

        // Processamento dos diferentes status
        const paymentStatus = data.status || 'unknown';
        const supabaseTransaction = data.supabaseTransaction;

        // Log detalhado do status
        console.log('Status do pagamento processado:', {
          status: paymentStatus,
          supabaseTransaction
        });

        // Atualização do estado baseado no status
        switch(paymentStatus) {
          case 'approved':
            setPaymentStatus('success');
            break;
          case 'pending':
            setPaymentStatus('pending');
            break;
          case 'in_process':
            setPaymentStatus('processing');
            break;
          case 'rejected':
            setPaymentStatus('error');
            break;
          default:
            setPaymentStatus('unknown');
        }

        return data;
      } catch (error) {
        console.error('Erro completo na verificação de status:', error);
        setPaymentStatus('error');
        throw error;
      }
    };

    // Verificar imediatamente
    checkPaymentStatus();

    // Verificar a cada 5 segundos
    interval = setInterval(checkPaymentStatus, 5000);

    // Limpar o intervalo quando o componente for desmontado
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, paymentId, onClose, router]);

  useEffect(() => {
    if (!paymentId) return;

    let eventSource: EventSource | null = null;

    const startPaymentStatusStream = () => {
      // Usar external_reference como parâmetro
      const streamUrl = `/api/payment/status-stream?external_reference=${paymentId}`;
      
      console.log('Iniciando stream de status de pagamento:', streamUrl);

      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('statusPayment', (event) => {
        const status = event.data;
        
        console.log('Status de pagamento recebido:', status);

        if (status === 'true') {
          // Pagamento aprovado
          setPaymentStatus('approved');
          toast.success('Pagamento aprovado! Redirecionando...');
          
          // Fechar o modal e redirecionar
          setTimeout(() => {
            onClose();
            router.push(`/acompanhar-pedido?transaction_id=${paymentId}`);
          }, 2000);

          // Fechar event source
          if (eventSource) {
            eventSource.close();
          }
        } else if (status === 'false') {
          // Pagamento ainda não aprovado, continuar monitorando
          console.log('Pagamento ainda não aprovado');
        } else if (status === 'error' || status === 'not_found') {
          // Erro na verificação
          toast.error('Erro ao verificar status do pagamento');
          
          if (eventSource) {
            eventSource.close();
          }
        }
      });

      eventSource.onerror = (error) => {
        console.error('Erro no stream de status:', error);
        toast.error('Erro na conexão de status de pagamento');
        
        if (eventSource) {
          eventSource.close();
        }
      };
    };

    startPaymentStatusStream();

    // Limpar event source ao desmontar
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [paymentId, onClose, router]);

  // Log para verificar o QR Code
  useEffect(() => {
    console.log('QR Code base64:', qrCodeBase64);
    console.log('QR Code length:', qrCodeBase64?.length);
  }, [qrCodeBase64]);

  const copyQRCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      toast.success('Código PIX copiado!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erro ao copiar código PIX');
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
                              toast.error('Erro ao carregar QR Code');
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
    </Transition>
  );
}
