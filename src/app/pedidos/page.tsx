'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  service: {
    name: string;
    category: {
      name: string;
      icon: string;
    };
  };
  quantity: number;
  amount: number;
  status: string;
  target_username: string;
  payment_status: string;
  created_at: string;
  metadata: {
    posts: {
      id: string;
      link: string;
    }[];
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error('Você precisa estar logado para ver seus pedidos');
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            service:services(
              name,
              category:categories(name, icon)
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erro ao carregar pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Meus Pedidos</h1>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{order.service.category.icon}</span>
                  <h3 className="text-lg font-semibold">{order.service.name}</h3>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  <span className="text-sm text-gray-600">
                    Quantidade: {order.quantity}
                  </span>
                  <span className="text-sm text-gray-600">
                    Total: {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(order.amount)}
                  </span>
                  <span className="text-sm text-gray-600">
                    Username: {order.target_username}
                  </span>
                  <span className={`text-sm ${
                    order.status === 'completed' ? 'text-green-600' :
                    order.status === 'pending' ? 'text-yellow-600' :
                    order.status === 'processing' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    Status: {order.status}
                  </span>
                  <span className={`text-sm ${
                    order.payment_status === 'approved' ? 'text-green-600' :
                    order.payment_status === 'pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    Pagamento: {
                      order.payment_status === 'approved' ? 'Aprovado' :
                      order.payment_status === 'pending' ? 'Pendente' :
                      'Rejeitado'
                    }
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Pedido feito em: {new Date(order.created_at).toLocaleString('pt-BR')}
                </div>

                {/* Links dos Posts */}
                {order.payment_status === 'approved' && order.metadata?.posts && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Posts Selecionados</h4>
                    <div className="space-y-2">
                      {order.metadata.posts.map((post: any, index: number) => (
                        <div key={post.id} className="flex items-center gap-2">
                          <span className="text-sm font-medium">Post {index + 1}:</span>
                          <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-500 hover:text-pink-600 text-sm"
                          >
                            Ver Post
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/pedido/${order.id}`}
              >
                Ver Detalhes
              </Button>
            </div>
          </Card>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">Você ainda não tem pedidos</p>
            <Button
              className="mt-4"
              onClick={() => window.location.href = '/servicos'}
            >
              Ver Serviços
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
