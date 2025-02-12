'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PaymentPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  qrCodeText: string;
  paymentId: string;
}

export function PaymentPixModal({ isOpen, onClose, qrCode, qrCodeText, paymentId }: PaymentPixModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const router = useRouter();

  useEffect(() => {
    if (!isOpen || !paymentId) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch('/api/payment/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payment_id: paymentId }),
        });

        if (!response.ok) {
          throw new Error('Erro ao verificar status do pagamento');
        }

        const data = await response.json();
        console.log('Payment status check:', data);
        
        if (data.status === 'approved') {
          setPaymentStatus('approved');
          toast.success('Pagamento aprovado! Redirecionando...');
          
          // Limpar o intervalo antes de redirecionar
          clearInterval(interval);
          
          // Esperar 2 segundos antes de redirecionar
          setTimeout(() => {
            onClose();
            router.push(`/acompanhar-pedido?transaction_id=${data.transaction_id}`);
          }, 2000);
        } else if (['rejected', 'cancelled'].includes(data.status)) {
          setPaymentStatus('failed');
          toast.error('Pagamento não aprovado. Por favor, tente novamente.');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        toast.error('Erro ao verificar status do pagamento');
      }
    };

    // Verificar imediatamente
    checkPaymentStatus();

    // Verificar a cada 5 segundos
    const interval = setInterval(checkPaymentStatus, 5000);

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [isOpen, paymentId, onClose, router]);

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
                    <>
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <Image
                          src={`data:image/png;base64,${qrCode}`}
                          alt="QR Code PIX"
                          width={200}
                          height={200}
                          className="mx-auto"
                        />
                      </div>
                      <Button
                        onClick={copyQRCode}
                        className="w-full bg-[#FF19D3] hover:bg-[#FF00CE] text-white"
                      >
                        Copiar Código PIX
                      </Button>
                      <p className="text-sm text-gray-500 text-center">
                        Após o pagamento, aguarde alguns instantes para a confirmação automática
                      </p>
                    </>
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
