'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';

interface Order {
  id: string;
  external_order_id: string;
  status: string;
  amount: number;
  quantity: number;
  metadata: {
    link: string;
    username?: string;
    post?: {
      shortcode: string;
      display_url: string;
    };
    provider_status?: {
      status: string;
      start_count: string;
      remains: string;
      updated_at: string;
    };
  };
  created_at: string;
  service?: {
    name: string;
    type: string;
  };
  refills?: {
    id: string;
    status: string;
    created_at: string;
  }[];
}

export default function AcompanharPedidoPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [processingRefill, setProcessingRefill] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'pending':
      case 'processing':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'failed':
      case 'rejected':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  const isWithin30Days = (date: string) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const handleRefill = async (orderId: string) => {
    setProcessingRefill(orderId);
    try {
      const response = await fetch('/api/orders/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao solicitar reposição');
      }

      const refill = await response.json();
      
      // Atualizar a lista de pedidos com a nova reposição
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            refills: [...(order.refills || []), refill]
          };
        }
        return order;
      }));

      toast.success('Reposição solicitada com sucesso!');
    } catch (error) {
      console.error('Erro ao solicitar reposição:', error);
      toast.error(error.message || 'Erro ao solicitar reposição');
    } finally {
      setProcessingRefill(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const supabase = createClientComponentClient();

      // Buscar usuário pelo email
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        toast.error('Email não encontrado');
        setOrders([]);
        return;
      }

      // Buscar pedidos do usuário com reposições
      const { data: userOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          service:service_id (
            name,
            type
          ),
          refills (
            id,
            status,
            created_at
          )
        `)
        .eq('user_id', users.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(userOrders || []);

      if (userOrders?.length === 0) {
        toast.info('Nenhum pedido encontrado para este email');
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast.error('Erro ao buscar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Acompanhar Pedido
              </h1>
              
              <form onSubmit={handleSubmit} className="space-y-4 mb-8">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email utilizado na compra
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                  disabled={loading}
                >
                  {loading ? 'Buscando...' : 'Buscar Pedido'}
                </Button>
              </form>

              {searched && orders.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Pedidos</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Serviço
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Link
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Quantidade
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Data
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {orders.map((order) => (
                          <tr key={order.id}>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {order.service?.name}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <a 
                                href={order.metadata.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {order.metadata.post ? 'Ver Post' : 'Ver Perfil'}
                              </a>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {order.quantity}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                              {order.metadata.provider_status && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Progresso: {order.metadata.provider_status.remains} restantes
                                </div>
                              )}
                              {order.refills && order.refills.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {order.refills.map((refill) => (
                                    <div key={refill.id} className="text-xs">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusColor(refill.status)}`}>
                                        Reposição: {refill.status}
                                      </span>
                                      <span className="ml-1 text-gray-500">
                                        {formatDateToBrasilia(refill.created_at)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {formatDateToBrasilia(order.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {isWithin30Days(order.created_at) && (!order.refills || order.refills.length === 0) && (
                                <Button
                                  onClick={() => handleRefill(order.id)}
                                  disabled={processingRefill === order.id}
                                  variant="outline"
                                  size="sm"
                                >
                                  {processingRefill === order.id ? 'Processando...' : 'Solicitar Reposição'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {searched && orders.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  Nenhum pedido encontrado para este email.
                </div>
              )}

              <p className="mt-4 text-sm text-gray-500 text-center">
                Digite o email que você utilizou durante a compra para visualizar o status dos seus pedidos.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
