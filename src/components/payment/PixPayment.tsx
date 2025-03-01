import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FaCopy } from 'react-icons/fa';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PixPaymentProps {
  qrCodeBase64: string;
  copyPasteCode: string;
  orderId: string;
  amount: number;
  onPaymentSuccess: () => void;
}

export function PixPayment({ 
  qrCodeBase64, 
  copyPasteCode, 
  orderId,
  amount,
  onPaymentSuccess 
}: PixPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [isManualCheckInProgress, setIsManualCheckInProgress] = useState(false);
  const router = useRouter();

  // Função para verificar o status do pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (isLoading || paymentApproved) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/payment/verify-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_id: orderId })
      });
      const data = await response.json();
      setIsLoading(false);

      console.log('Status do pagamento:', data);

      if (data.status === 'approved') {
        setPaymentApproved(true);
        onPaymentSuccess();
        
        // Mostrar mensagem de sucesso
        toast.success('Pagamento aprovado! Redirecionando...');
        
        // Obter email dos metadados da transação
        const email = data.transaction?.metadata?.email || 
                     data.transaction?.metadata?.contact?.email || 
                     data.transaction?.metadata?.profile?.email || '';
        
        // Redirecionar para a página de agradecimento após 2 segundos
        setTimeout(() => {
          router.push(`/agradecimento?id=${orderId}&email=${encodeURIComponent(email)}`);
        }, 2000);
      } else if (isManualCheckInProgress) {
        setIsManualCheckInProgress(false);
        toast.info('Pagamento ainda não confirmado. Aguarde ou tente novamente em alguns instantes.');
      }
    } catch (error) {
      setIsLoading(false);
      setIsManualCheckInProgress(false);
      console.error('Erro ao verificar status do pagamento:', error);
    }
  }, [orderId, onPaymentSuccess, router, isLoading, paymentApproved, isManualCheckInProgress]);

  // Verificação automática a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(checkPaymentStatus, 5000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(interval);
  }, [checkPaymentStatus]);

  // Função para verificação manual do pagamento
  const handleManualCheck = () => {
    setIsManualCheckInProgress(true);
    toast.info('Verificando seu pagamento...');
    checkPaymentStatus();
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(copyPasteCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Erro ao copiar código PIX:', error);
      toast.error('Não foi possível copiar o código PIX');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Pagamento via PIX</h2>
        <p className="text-gray-600 mb-4">
          Escaneie o QR Code ou copie o código PIX abaixo
        </p>
        
        {paymentApproved ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 mb-4 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h3>
            <p className="text-gray-600">Redirecionando...</p>
            <div className="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-gray-100 p-4 rounded-lg mb-4 flex justify-center">
              {qrCodeBase64 && (
                <img 
                  src={`data:image/png;base64,${qrCodeBase64}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                />
              )}
            </div>
            
            <div className="mb-4">
              <p className="font-semibold mb-2">Valor a pagar:</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(amount)}</p>
            </div>
            
            <div className="relative">
              <p className="font-semibold mb-2">Código PIX:</p>
              <div className="flex">
                <input
                  type="text"
                  value={copyPasteCode}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={handleCopyPix}
                  className={`px-4 py-2 rounded-r-md flex items-center justify-center ${
                    copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  <FaCopy className="mr-2" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-600">
              <p className="mb-1">• Abra o app do seu banco</p>
              <p className="mb-1">• Escolha pagar via PIX</p>
              <p className="mb-1">• Escaneie o QR code ou cole o código</p>
              <p>• Confirme o pagamento</p>
            </div>
            
            <div className="mt-6">
              <button 
                onClick={handleManualCheck}
                disabled={isLoading || paymentApproved}
                className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-md hover:bg-green-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verificando pagamento...
                  </span>
                ) : (
                  "Já efetuei o pagamento"
                )}
              </button>
              
              <p className="text-sm text-gray-600 text-center">
                {isLoading ? 
                  "Verificando status do pagamento..." : 
                  "O sistema verifica automaticamente a cada 5 segundos"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
