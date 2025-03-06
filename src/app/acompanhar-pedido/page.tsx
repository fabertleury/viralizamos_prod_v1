'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';
import { RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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
    email?: string;
  };
  created_at: string;
  service?: {
    name: string;
    type: string;
  };
  provider?: {
    name: string;
    id: string;
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
  const [checkingStatus, setCheckingStatus] = useState<{ [key: string]: boolean }>({});
  const [userProfile, setUserProfile] = useState<{ email: string; name: string } | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      handleSearchOrders(emailFromQuery);
    }
  }, [searchParams]);

  // Verificar se o usuário está logado ao carregar a página
  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const supabase = createClientComponentClient();
        
        // Verificar se há uma sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Buscar perfil do usuário
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          if (!error && profile) {
            setUserProfile(profile);
            setEmail(profile.email);
            // Buscar pedidos automaticamente se o usuário estiver logado
            handleSearchOrders(profile.email);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar perfil do usuário:', error);
      }
    };
    
    checkUserProfile();
  }, []);

  // Função para buscar pedidos sem o evento de formulário
  const handleSearchOrders = async (emailToSearch: string) => {
    if (!emailToSearch) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const supabase = createClientComponentClient();

      // Primeiro buscar na tabela customers pelo email
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', emailToSearch)
        .single();
        
      if (!customerError && customer) {
        console.log('Cliente encontrado na tabela customers:', customer);
        
        // Buscar pedidos pelo customer_id
        const { data: customerOrders, error: customerOrdersError } = await supabase
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
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
          
        if (customerOrdersError) {
          console.error('Erro ao buscar pedidos do cliente:', customerOrdersError);
          throw customerOrdersError;
        }
        
        setOrders(customerOrders || []);
        
        if (customerOrders?.length === 0) {
          toast.info('Nenhum pedido encontrado para este email');
        }
        
        setLoading(false);
        return;
      }
      
      console.log('Cliente não encontrado na tabela customers, buscando em outras tabelas...');
      
      // Buscar usuário pelo email em profiles (fallback)
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToSearch)
        .single();

      if (userError) {
        console.log('Email não encontrado em profiles, buscando em transactions...');
        
        // Se não encontrar o usuário, buscar nas transações pelo email nos metadados
        const { data: transactionsByEmail, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, user_id')
          .eq('metadata->>email', emailToSearch)
          .order('created_at', { ascending: false });
          
        if (transactionsError || !transactionsByEmail || transactionsByEmail.length === 0) {
          // Buscar em orders pelo email nos metadados
          const { data: ordersByEmail, error: ordersError } = await supabase
            .from('orders')
            .select('id, user_id, customer_id')
            .eq('metadata->customer->email', emailToSearch)
            .order('created_at', { ascending: false });
            
          if (ordersError || !ordersByEmail || ordersByEmail.length === 0) {
            toast.error('Email não encontrado');
            setOrders([]);
            setLoading(false);
            return;
          }
          
          // Buscar pedidos pelo email nos metadados
          const { data: userOrders, error: ordersError2 } = await supabase
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
            .eq('metadata->customer->email', emailToSearch)
            .order('created_at', { ascending: false });
            
          if (ordersError2) throw ordersError2;
          setOrders(userOrders || []);
          
          if (userOrders?.length === 0) {
            toast.info('Nenhum pedido encontrado para este email');
          }
        } else {
          // Buscar pedidos pelo user_id da transação
          const userId = transactionsByEmail[0].user_id;
          
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
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
          if (ordersError) throw ordersError;
          setOrders(userOrders || []);
          
          if (userOrders?.length === 0) {
            toast.info('Nenhum pedido encontrado para este email');
          }
        }
      } else {
        // Buscar pedidos pelo user_id
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
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast.error('Erro ao buscar pedidos');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'pending':
      case 'processing':
      case 'in progress':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'failed':
      case 'rejected':
      case 'canceled':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'partial':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  const getDaysRemaining = (date: string) => {
    const orderDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(orderDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return 30 - diffDays;
  };

  const isWithin30Days = (date: string) => {
    return getDaysRemaining(date) > 0;
  };

  const checkOrderStatus = async (orderId: string) => {
    if (!orderId || !email) return;
    
    try {
      setCheckingStatus(prev => ({ ...prev, [orderId]: true }));
      
      const response = await fetch('/api/orders/check-status-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, email }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao verificar status do pedido');
      }
      
      toast.success('Status do pedido atualizado com sucesso');
      
      // Atualizar o pedido na lista
      setOrders(orders.map(order => 
        order.external_order_id === orderId ? result.data : order
      ));
    } catch (error) {
      console.error('Erro ao verificar status do pedido:', error);
      toast.error('Erro ao verificar status do pedido');
    } finally {
      setCheckingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRefill = async (orderId: string) => {
    setProcessingRefill(orderId);
    try {
      const response = await fetch('/api/orders/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          orderId,
          email: email // Incluir o email para usuários não autenticados
        })
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
    handleSearchOrders(email);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Acompanhar Pedido</h1>
            
            {userProfile ? (
              <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
                <p className="text-gray-700">Bem-vindo, <span className="font-semibold">{userProfile.name || userProfile.email}</span></p>
                <p className="text-sm text-gray-500">Seus pedidos são mostrados automaticamente abaixo.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="flex">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Digite seu email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1"
                      />
                      <Button type="submit" className="ml-2 bg-pink-600 hover:bg-pink-700" disabled={loading}>
                        {loading ? (
                          <div className="flex items-center">
                            <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                            <span>Buscando...</span>
                          </div>
                        ) : (
                          'Buscar'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
            
            {searched && orders.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Pedidos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{order.service?.name}</h3>
                            <p className="text-sm text-gray-500">{formatDateToBrasilia(order.created_at)}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tipo de Serviço</p>
                            <p className="text-sm font-medium">{order.service?.type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Quantidade</p>
                            <p className="text-sm font-medium">{order.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Provedor</p>
                            <p className="text-sm font-medium">{order.provider?.name || 'Fama nas Redes'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Link</p>
                            <a 
                              href={order.metadata.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              {order.metadata.post ? 'Ver Post' : 'Ver Perfil'}
                            </a>
                          </div>
                        </div>
                        
                        {order.metadata.provider_status && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-md">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-500">Progresso:</span>
                              <span className="text-xs font-medium">{order.metadata.provider_status.remains} restantes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.max(0, Math.min(100, 100 - (parseInt(order.metadata.provider_status.remains) / order.quantity * 100)))}%` 
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Atualizado: {new Date(order.metadata.provider_status.updated_at).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        )}
                        
                        {order.refills && order.refills.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Reposições:</p>
                            <div className="space-y-2">
                              {order.refills.map((refill) => (
                                <div key={refill.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusColor(refill.status)}`}>
                                    {refill.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDateToBrasilia(refill.created_at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col space-y-2">
                          <Button
                            onClick={() => checkOrderStatus(order.external_order_id)}
                            disabled={checkingStatus[order.external_order_id]}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            {checkingStatus[order.external_order_id] ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Verificando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Atualizar Status
                              </>
                            )}
                          </Button>
                          
                          {isWithin30Days(order.created_at) && (!order.refills || order.refills.length === 0) && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1 text-center">
                                Reposição disponível: {getDaysRemaining(order.created_at)} dias restantes
                              </div>
                              <Button
                                onClick={() => handleRefill(order.id)}
                                disabled={processingRefill === order.id}
                                variant="default"
                                size="sm"
                                className="w-full bg-pink-600 hover:bg-pink-700"
                              >
                                {processingRefill === order.id ? 'Processando...' : 'Solicitar Reposição'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
              <br />
              Você pode solicitar reposições gratuitas quantas vezes quiser durante os primeiros 30 dias após a compra.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
