'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Transaction {
  id: string;
  status: string;
  amount: number;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  target_username: string;
  created_at: string;
  metadata: {
    service: {
      name: string;
      quantity: number;
    };
    posts?: Array<{
      postId: string;
      postCode: string;
      postLink: string;
      likes: number;
    }>;
  };
}

export default function ObrigadoPage() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) {
        setError('ID da transação não fornecido');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClientComponentClient();
        
        // Buscar transação pelo ID externo
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('payment_external_reference', transactionId)
          .single();

        if (error) {
          console.error('Erro ao buscar transação:', error);
          setError('Não foi possível encontrar os detalhes da transação');
          setLoading(false);
          return;
        }

        setTransaction(data);
      } catch (err) {
        console.error('Erro ao processar transação:', err);
        setError('Ocorreu um erro ao processar sua solicitação');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  const getStatusInfo = () => {
    if (!transaction) return { icon: null, text: '', color: '' };

    switch (transaction.status.toLowerCase()) {
      case 'approved':
      case 'success':
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-500" />,
          text: 'Pagamento aprovado!',
          color: 'text-green-600'
        };
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          text: 'Pagamento pendente',
          color: 'text-yellow-600'
        };
      case 'processing':
      case 'in_process':
        return {
          icon: <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />,
          text: 'Processando pagamento',
          color: 'text-blue-600'
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          text: 'Status desconhecido',
          color: 'text-gray-600'
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 shadow-md">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Obrigado pela sua compra!
                </h1>
                <p className="text-gray-600">
                  Abaixo estão os detalhes do seu pedido.
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-pink-500 animate-spin mb-4" />
                  <p className="text-gray-600">Carregando detalhes do pedido...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-red-600 mb-2">Erro</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      Voltar para a página inicial
                    </Button>
                  </Link>
                </div>
              ) : transaction ? (
                <div className="space-y-8">
                  <div className="flex flex-col items-center justify-center">
                    {statusInfo.icon}
                    <h2 className={`text-xl font-semibold mt-2 ${statusInfo.color}`}>
                      {statusInfo.text}
                    </h2>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Detalhes do Pedido
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">ID da Transação</p>
                        <p className="font-medium">{transaction.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Data</p>
                        <p className="font-medium">{formatDate(transaction.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Valor</p>
                        <p className="font-medium">R$ {transaction.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Método de Pagamento</p>
                        <p className="font-medium">{transaction.payment_method.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Serviço</p>
                        <p className="font-medium">{transaction.metadata?.service?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantidade</p>
                        <p className="font-medium">{transaction.metadata?.service?.quantity?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Perfil</p>
                        <p className="font-medium">@{transaction.target_username}</p>
                      </div>
                    </div>
                  </div>

                  {transaction.metadata?.posts && transaction.metadata.posts.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Posts Selecionados
                      </h3>
                      <div className="space-y-3">
                        {transaction.metadata.posts.map((post, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <a 
                              href={post.postLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Post {index + 1}
                            </a>
                            <span className="font-medium">{post.likes} curtidas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                    <Link href="/acompanhar-pedido">
                      <Button variant="outline" className="w-full sm:w-auto">
                        Acompanhar Pedido
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        Voltar para a página inicial
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-yellow-600 mb-2">Transação não encontrada</h2>
                  <p className="text-gray-600 mb-6">Não foi possível encontrar os detalhes da transação.</p>
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      Voltar para a página inicial
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
