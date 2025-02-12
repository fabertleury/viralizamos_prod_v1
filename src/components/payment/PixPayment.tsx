import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FaCopy } from 'react-icons/fa';
import { formatCurrency } from '@/lib/utils';

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

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/check/${orderId}`);
        const data = await response.json();

        if (data.status === 'approved') {
          clearInterval(interval);
          onPaymentSuccess();
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    }, 5000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(interval);
  }, [orderId, onPaymentSuccess]);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(copyPasteCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Erro ao copiar código PIX:', error);
      toast.error('Erro ao copiar código PIX');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h2 className="text-xl font-semibold">Pagamento via PIX</h2>
      <p className="text-lg">Valor: {formatCurrency(amount)}</p>
      
      {qrCodeBase64 && (
        <div className="relative w-64 h-64">
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code PIX"
            className="w-full h-full object-contain"
            width={256}
            height={256}
          />
        </div>
      )}

      <div className="flex flex-col items-center space-y-2">
        <p className="text-sm text-gray-600">Copie o código PIX abaixo:</p>
        <div className="flex items-center space-x-2">
          <code className="bg-gray-100 p-2 rounded">{copyPasteCode}</code>
          <button
            onClick={handleCopyPix}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Copiar código PIX"
          >
            <FaCopy className={copied ? "text-green-500" : "text-gray-500"} />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center mt-4">
        Após o pagamento, aguarde alguns instantes para a confirmação automática
      </p>
    </div>
  );
}
