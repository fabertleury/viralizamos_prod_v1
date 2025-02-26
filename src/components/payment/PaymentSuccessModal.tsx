import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceDetails?: {
    targetProfileLink?: string;
    serviceName?: string;
  };
}

export function PaymentSuccessModal({ 
  isOpen, 
  onClose, 
  serviceDetails 
}: PaymentSuccessModalProps) {
  const router = useRouter();

  const handleAcompanharPedido = () => {
    router.push('/acompanhar-pedido');
    onClose();
  };

  const handleVerPerfil = () => {
    if (serviceDetails?.targetProfileLink) {
      window.open(serviceDetails.targetProfileLink, '_blank');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <div className="flex justify-center mb-6">
          <Image 
            src="/icons/success-payment.svg" 
            alt="Pagamento Aprovado" 
            width={120} 
            height={120} 
          />
        </div>

        <h2 className="text-2xl font-bold text-green-600 mb-4">
          Pagamento Aprovado!
        </h2>

        <p className="text-gray-600 mb-6">
          Seu pagamento foi processado com sucesso. 
          {serviceDetails?.serviceName && (
            ` Serviço contratado: ${serviceDetails.serviceName}`
          )}
        </p>

        <div className="flex flex-col space-y-4">
          <button 
            onClick={handleAcompanharPedido}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Acompanhar Pedido
          </button>

          {serviceDetails?.targetProfileLink && (
            <button 
              onClick={handleVerPerfil}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              Ver Perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
