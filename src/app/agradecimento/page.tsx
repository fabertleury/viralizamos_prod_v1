'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AgradecimentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Obter ID da transação da URL
        let transactionId = searchParams.get('id');
        let email = searchParams.get('email');
        
        if (!transactionId) {
          setError('ID da transação não encontrado');
          setLoading(false);
          return;
        }
        
        // Buscar detalhes da transação
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single();
        
        if (error) {
          console.error('Erro ao buscar transação:', error);
          setError('Erro ao buscar detalhes da transação');
          setLoading(false);
          return;
        }
        
        if (!data) {
          setError('Transação não encontrada');
          setLoading(false);
          return;
        }
        
        setTransaction(data);
        
        // Se o email não estiver na URL, mas estiver na transação, atualizar a URL
        if (!email && (data.customer_email || data.metadata?.customer?.email || data.metadata?.email)) {
          const transactionEmail = data.customer_email || data.metadata?.customer?.email || data.metadata?.email;
          if (transactionEmail) {
            // Atualizar a URL sem recarregar a página
            const newUrl = `${window.location.pathname}?id=${transactionId}&email=${encodeURIComponent(transactionEmail)}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            email = transactionEmail;
          }
        }
        
        // Se temos um email, criar ou atualizar o perfil
        if (email) {
          // Verificar se o usuário já existe
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
          
          if (!existingUser) {
            // Extrair nome do usuário
            const userName = data.customer_name || 
                            data.metadata?.customer?.name || 
                            data.metadata?.profile?.full_name || 
                            data.metadata?.profile?.username || 
                            email.split('@')[0];
            
            // Usuário não existe, criar novo
            await supabase
              .from('profiles')
              .insert({
                email: email,
                name: userName,
                role: 'customer',
                active: true
              });
            
            console.log('Perfil do usuário criado com sucesso');
          }
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Ocorreu um erro ao processar sua solicitação');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Carregando informações do seu pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Oops!</h1>
          <p className="text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <Link href="/" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <Image 
            src="/images/check-circle.svg" 
            alt="Sucesso" 
            width={80} 
            height={80} 
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Obrigado!</h1>
        <p className="text-center mb-6">
          Seu pedido foi recebido e está sendo processado.
        </p>
        
        {transaction && (
          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h2 className="font-semibold mb-2">Detalhes do Pedido:</h2>
              <p><span className="font-medium">Serviço:</span> {transaction.metadata?.service?.name || 'Serviço'}</p>
              <p><span className="font-medium">Perfil:</span> @{transaction.target_username}</p>
              <p><span className="font-medium">Status:</span> {
                transaction.status === 'pending' ? 'Aguardando pagamento' :
                transaction.status === 'processing' ? 'Em processamento' :
                transaction.status === 'completed' ? 'Concluído' :
                transaction.status === 'failed' ? 'Falhou' :
                transaction.status
              }</p>
            </div>
            
            {transaction.status === 'pending' && transaction.payment_method === 'pix' && (
              <div className="bg-gray-50 p-4 rounded-md mb-4 text-center">
                <h2 className="font-semibold mb-2">Finalize seu pagamento:</h2>
                <p className="mb-4">Escaneie o QR Code abaixo com seu aplicativo bancário</p>
                
                {transaction.metadata?.payment?.qr_code_base64 && (
                  <div className="flex justify-center mb-4">
                    <Image 
                      src={transaction.metadata.payment.qr_code_base64} 
                      alt="QR Code PIX" 
                      width={200} 
                      height={200} 
                    />
                  </div>
                )}
                
                {transaction.metadata?.payment?.qr_code && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm">Ou copie o código PIX:</p>
                    <div className="bg-white p-2 rounded border text-xs overflow-auto max-h-24">
                      {transaction.metadata.payment.qr_code}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-center">
          <Link href="/" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
