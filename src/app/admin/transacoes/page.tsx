'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { TransactionDetailsModal } from "@/components/admin/TransactionDetailsModal";
import { Eye, Send, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function getStatusClass(status: string | null) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-red-100 text-red-800';
  }
}

function getStatusText(status: string | null) {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'pending':
      return 'Pendente';
    default:
      return 'Rejeitado';
  }
}

export default function TransacoesPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);
  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        services:service_id (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    // Buscar os pedidos separadamente para cada transação
    const transactionsWithOrders = await Promise.all(
      transactions.map(async (transaction) => {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('transaction_id', transaction.id);
        
        if (ordersError) {
          console.error(`Error fetching orders for transaction ${transaction.id}:`, ordersError);
          return { ...transaction, orders: [] };
        }
        
        return { ...transaction, orders: orders || [] };
      })
    );

    setTransactions(transactionsWithOrders);
  }, [supabase]);

  const handleCheckPayment = useCallback(async (transaction: any) => {
    if (loadingPayment) return;
    
    try {
      setLoadingPayment(transaction.id);

      const response = await fetch('/api/payment/check-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: transaction.metadata.payment.id
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar pagamento');
      }

      const data = await response.json();

      // Primeiro atualizar os dados
      await fetchTransactions();

      // Depois mostrar o toast
      setTimeout(() => {
        toast.success('Status do pagamento atualizado');
      }, 100);

    } catch (error) {
      console.error('Error checking payment:', error);
      setTimeout(() => {
        toast.error('Erro ao verificar pagamento');
      }, 100);
    } finally {
      setLoadingPayment(null);
    }
  }, [loadingPayment, fetchTransactions]);

  const handleMarkDelivered = useCallback(async (transaction: any) => {
    if (markingDelivered) return;
    
    try {
      setMarkingDelivered(transaction.id);
      
      const response = await fetch('/api/transactions/check-delivery-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar status de entrega');
      }
      
      await fetchTransactions();
      
      if (data.status === 'success') {
        toast.success('Serviço marcado como entregue com sucesso!', {
          description: 'Todos os pedidos foram verificados e estão completos.'
        });
      } else if (data.status === 'pending') {
        toast.warning('Nem todos os pedidos estão completos', {
          description: 'Verifique o status dos pedidos para mais detalhes.'
        });
      } else if (data.status === 'partial_success') {
        toast.warning('Pedidos verificados, mas houve erro ao marcar transação como entregue', {
          description: data.error || 'Tente novamente mais tarde.'
        });
      } else {
        toast.info('Status dos pedidos verificado', {
          description: data.message || 'Verifique a tabela para mais detalhes.'
        });
      }
    } catch (error: any) {
      console.error('Error checking delivery status:', error);
      toast.error(error.message || 'Erro ao verificar status de entrega');
    } finally {
      setMarkingDelivered(null);
    }
  }, [markingDelivered, fetchTransactions]);

  const checkPendingDeliveryStatus = useCallback(async () => {
    // Filtra apenas transações aprovadas mas não entregues
    const pendingDeliveryTransactions = transactions.filter(transaction => 
      transaction.status === 'approved' && !transaction.delivered
    );
    
    if (pendingDeliveryTransactions.length === 0) return;
    
    // Verificar o status de entrega de cada transação
    for (const transaction of pendingDeliveryTransactions) {
      try {
        // Verificar se a transação tem pedidos associados
        if (!transaction.orders || transaction.orders.length === 0) {
          console.error(`Transação ${transaction.id} não tem pedidos associados`);
          
          // Se não houver pedidos, marcar a transação como entregue para evitar verificações futuras
          try {
            await supabase
              .from('transactions')
              .update({ delivered: true })
              .eq('id', transaction.id);
            
            console.log(`Transação ${transaction.id} marcada como entregue (sem pedidos)`);
          } catch (updateError) {
            console.error(`Erro ao marcar transação ${transaction.id} como entregue:`, updateError);
          }
          
          continue; // Pular para a próxima transação
        }
        
        // Verificar se pelo menos um pedido tem provedor associado
        const hasValidProvider = transaction.orders.some(order => 
          order.provider_id || order.metadata?.provider || order.metadata?.provider_name
        );
        
        if (!hasValidProvider) {
          console.error(`Transação ${transaction.id} não tem pedidos com provedores válidos`);
          
          // Se não houver provedores válidos, marcar a transação como entregue para evitar verificações futuras
          try {
            await supabase
              .from('transactions')
              .update({ delivered: true })
              .eq('id', transaction.id);
            
            console.log(`Transação ${transaction.id} marcada como entregue (sem provedores válidos)`);
          } catch (updateError) {
            console.error(`Erro ao marcar transação ${transaction.id} como entregue:`, updateError);
          }
          
          continue; // Pular para a próxima transação
        }
        
        // Verificar se todos os pedidos estão completos antes de chamar a API
        const allOrdersComplete = transaction.orders.every(order => 
          order.status === 'completed' || order.status === 'success' || order.status === 'partial'
        );
        
        if (allOrdersComplete) {
          // Se todos os pedidos já estiverem completos, marcar a transação como entregue diretamente
          try {
            await supabase
              .from('transactions')
              .update({ 
                delivered: true,
                delivered_at: new Date().toISOString()
              })
              .eq('id', transaction.id);
            
            console.log(`Transação ${transaction.id} marcada como entregue (todos os pedidos já completos)`);
            await fetchTransactions(); // Atualizar a lista após a mudança
          } catch (updateError) {
            console.error(`Erro ao marcar transação ${transaction.id} como entregue:`, updateError);
          }
        } else {
          // Se ainda houver pedidos pendentes, chamar a API para verificar o status
          await handleMarkDelivered(transaction);
        }
        
        // Pequena pausa entre as verificações para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Erro ao verificar status de entrega da transação ${transaction.id}:`, error);
      }
    }
  }, [transactions, handleMarkDelivered, supabase, fetchTransactions]);

  useEffect(() => {
    fetchTransactions();
    
    // Atualizar a cada 4 minutos (240000ms)
    const intervalId = setInterval(fetchTransactions, 240000);
    
    // Verificar status de entrega das transações aprovadas a cada 4 minutos
    const deliveryStatusInterval = setInterval(checkPendingDeliveryStatus, 240000);
    
    // Executar uma verificação inicial ao carregar a página
    setTimeout(() => {
      checkPendingDeliveryStatus();
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
      clearInterval(deliveryStatusInterval);
    };
  }, [fetchTransactions, checkPendingDeliveryStatus]);

  const handleProcessOrder = useCallback(async (transaction: any) => {
    if (processingOrder) return;
    
    try {
      setProcessingOrder(transaction.id);

      const response = await fetch('/api/orders/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Erro ao processar pedido';
        
        if (response.status === 401) {
          errorMessage = 'Você precisa estar autenticado para processar pedidos';
        } else if (response.status === 403) {
          errorMessage = 'Você não tem permissão para processar pedidos. Apenas administradores podem fazer isso.';
        } else if (data.error) {
          errorMessage = data.error;
        }
        
        throw new Error(errorMessage);
      }

      // Atualizar os dados
      await fetchTransactions();
      
      toast.success('Pedido processado com sucesso!');
    } catch (error: any) {
      console.error('Error processing order:', error);
      toast.error(error.message || 'Erro ao processar pedido');
    } finally {
      setProcessingOrder(null);
    }
  }, [processingOrder, fetchTransactions]);

  const handleManualOrderProcessing = useCallback(async (transaction: any) => {
    if (processingOrder) return;
    
    try {
      setProcessingOrder(transaction.id);
      console.log('Iniciando processamento manual para transação:', transaction.id);

      // Primeiro, verificar o status do pagamento
      console.log('Verificando status do pagamento...');
      const checkResponse = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: transaction.payment_id || transaction.metadata?.payment?.id
        }),
      });

      const checkData = await checkResponse.json();
      
      if (!checkResponse.ok) {
        console.error('Erro na verificação de status:', checkData);
        throw new Error(checkData.error || 'Erro ao verificar status do pagamento');
      }

      console.log('Status verificado com sucesso:', checkData);

      // Depois, processar o pedido
      console.log('Processando pedido...');
      const processResponse = await fetch('/api/orders/process-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id
        }),
      });

      const processData = await processResponse.json();
      console.log('Resposta do processamento:', processData);

      if (!processResponse.ok) {
        console.error('Erro no processamento do pedido:', processData);
        throw new Error(processData.error || 'Erro ao processar pedido');
      }

      await fetchTransactions();
      
      toast.success('Pedido processado com sucesso!', {
        description: `ID da transação: ${transaction.id}`
      });

      // Redirecionar para a página de pedidos
      window.location.href = '/admin/pedidos';
    } catch (error: any) {
      console.error('Error processing order manually:', error);
      toast.error('Erro ao processar pedido', {
        description: error.message
      });
    } finally {
      setProcessingOrder(null);
    }
  }, [processingOrder, fetchTransactions]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie todas as transações do sistema
          </p>
          <p className="text-sm text-gray-500">
            O status das transações e pedidos é atualizado automaticamente a cada 4 minutos.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3">ID</th>
                  <th scope="col" className="px-6 py-3">Usuário</th>
                  <th scope="col" className="px-6 py-3">Método</th>
                  <th scope="col" className="px-6 py-3">Valor</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Entregue</th>
                  <th scope="col" className="px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((transaction) => (
                  <tr key={transaction.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.created_at ? format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {transaction.id ? transaction.id.substring(0, 8) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {transaction.metadata?.customer?.name || transaction.metadata?.contact?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {transaction.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {transaction.amount ? formatCurrency(transaction.amount) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {transaction.delivered ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Entregue {transaction.delivered_at && `em ${format(new Date(transaction.delivered_at), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      )}
                      {transaction.delivered && transaction.orders && transaction.orders.length > 0 && (
                        <div className="mt-1 text-xs">
                          {transaction.orders.map((order: any, index: number) => (
                            <div key={index} className="flex items-center gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                order.status === 'completed' || order.status === 'success' ? 'bg-green-100 text-green-800' :
                                order.status === 'processing' || order.status === 'in progress' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'partial' ? 'bg-purple-100 text-purple-800' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'canceled' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {order.status === 'completed' || order.status === 'success' ? 'Concluído' :
                                 order.status === 'processing' || order.status === 'in progress' ? 'Processando' :
                                 order.status === 'partial' ? 'Parcial' :
                                 order.status === 'pending' ? 'Pendente' :
                                 order.status === 'canceled' ? 'Cancelado' :
                                 order.status === 'failed' || order.status === 'rejected' ? 'Falhou' : 
                                 order.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {transaction.metadata?.payment?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCheckPayment(transaction)}
                            disabled={loadingPayment === transaction.id}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <RefreshCw className={`w-4 h-4 ${loadingPayment === transaction.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}

                        {transaction.status === 'approved' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManualOrderProcessing(transaction)}
                              disabled={processingOrder === transaction.id}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Send className={`w-4 h-4 ${processingOrder === transaction.id ? 'animate-pulse' : ''}`} />
                            </Button>
                          </div>
                        )}

                        {transaction.status === 'approved' && !transaction.delivered && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkDelivered(transaction)}
                            disabled={markingDelivered === transaction.id}
                            className="text-green-500 hover:text-green-700"
                            title="Verificar status de entrega"
                          >
                            <CheckCircle className={`w-4 h-4 ${markingDelivered === transaction.id ? 'animate-pulse' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTransaction && (
        <TransactionDetailsModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}
