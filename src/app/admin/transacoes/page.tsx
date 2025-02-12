'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { TransactionDetailsModal } from "@/components/admin/TransactionDetailsModal";
import { Eye, RefreshCw, Send } from "lucide-react";
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
  const supabase = createClient();

  useEffect(() => {
    const fetchTransactions = async () => {
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

      setTransactions(transactions);
    };

    fetchTransactions();
  }, []);

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
      const fetchTransactions = async () => {
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

        setTransactions(transactions);
      };

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
  }, [loadingPayment]);

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
      const fetchTransactions = async () => {
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

        setTransactions(transactions);
      };

      await fetchTransactions();
      
      toast.success('Pedido processado com sucesso!');
    } catch (error: any) {
      console.error('Error processing order:', error);
      toast.error(error.message || 'Erro ao processar pedido');
    } finally {
      setProcessingOrder(null);
    }
  }, [processingOrder]);

  const handleCheckAdmin = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Status: ${data.isAdmin ? 'Admin' : 'Não Admin'}\nEmail: ${data.email}\nRole: ${data.role}`);
      } else {
        toast.error(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Erro ao verificar status de admin');
    }
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie todas as transações do sistema
          </p>
        </div>
        <button
          onClick={handleCheckAdmin}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Verificar Status Admin
        </button>
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

                        {transaction.status === 'approved' && !transaction.processed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProcessOrder(transaction)}
                            disabled={processingOrder === transaction.id}
                            className="text-green-500 hover:text-green-700"
                          >
                            <Send className={`w-4 h-4 ${processingOrder === transaction.id ? 'animate-pulse' : ''}`} />
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
