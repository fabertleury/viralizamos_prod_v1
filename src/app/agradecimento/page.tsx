'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CustomerData } from '@/types/customer';

export default function AgradecimentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionAndCustomer = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Obter ID da transação da URL
        let transactionId = searchParams.get('id');
        let emailParam = searchParams.get('email');
        
        // Armazenar o email para uso posterior
        setEmail(emailParam);
        
        if (!transactionId) {
          setError('ID da transação não encontrado');
          setLoading(false);
          return;
        }
        
        // Verificar se o ID é um UUID ou um número
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
        
        let query;
        if (isUuid) {
          // Se for UUID, buscar diretamente pelo ID
          query = supabase
            .from('transactions')
            .select('*, customers(*)')
            .eq('id', transactionId);
        } else {
          // Se for um número (como o ID do gateway de pagamento), tentar várias estratégias de busca
          const searchStrategies = [
            () => supabase
              .from('transactions')
              .select('*, customers(*)')
              .eq('payment_id', transactionId)
              .single(),
            
            () => supabase
              .from('transactions')
              .select('*, customers(*)')
              .eq('payment_external_reference', transactionId)
              .single(),
            
            () => supabase
              .from('transactions')
              .select('*, customers(*)')
              .eq('external_id', transactionId)
              .single()
          ];
          
          // Tentar cada estratégia de busca
          for (const strategy of searchStrategies) {
            try {
              const { data: foundData, error: strategyError } = await strategy();
              
              if (foundData) {
                setTransaction(foundData);
                
                // Se a transação tem um cliente associado, definir o cliente
                if (foundData.customers) {
                  setCustomer(foundData.customers);
                }
                
                // Rastrear evento de conclusão de compra com Facebook Pixel
                if (typeof window !== 'undefined' && (window as any).fbq) {
                  (window as any).fbq('track', 'CompleteRegistration', {
                    content_name: 'Compra finalizada',
                    status: 'success',
                    transaction_id: transactionId,
                    value: foundData.amount,
                    currency: 'BRL'
                  });
                }
                
                // Se o email não estiver na URL, mas estiver na transação ou no cliente, atualizar a URL
                if (!emailParam) {
                  let transactionEmail = null;
                  
                  // Verificar em todas as possíveis localizações do email
                  if (foundData.customers && foundData.customers.email) {
                    transactionEmail = foundData.customers.email;
                  } else if (foundData.customer_email) {
                    transactionEmail = foundData.customer_email;
                  } else if (foundData.metadata) {
                    // Verificar em diferentes estruturas do metadata
                    if (typeof foundData.metadata === 'string') {
                      try {
                        const parsedMetadata = JSON.parse(foundData.metadata);
                        transactionEmail = parsedMetadata.customer?.email || 
                                          parsedMetadata.email || 
                                          parsedMetadata.customer_email;
                      } catch (e) {
                        console.warn('Erro ao fazer parse do metadata:', e);
                      }
                    } else if (typeof foundData.metadata === 'object') {
                      transactionEmail = foundData.metadata.customer?.email || 
                                        foundData.metadata.email || 
                                        foundData.metadata.customer_email;
                    }
                  }
                  
                  console.log('Email encontrado na transação:', transactionEmail);
                  
                  if (transactionEmail) {
                    // Atualizar a URL sem recarregar a página
                    const newUrl = `${window.location.pathname}?id=${transactionId}&email=${encodeURIComponent(transactionEmail)}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                    emailParam = transactionEmail;
                  }
                }
                
                setLoading(false);
                return;
              }
            } catch (strategyError) {
              console.warn('Erro em estratégia de busca:', strategyError);
              // Continuar tentando outras estratégias
            }
          }
          
          // Se chegou aqui, nenhuma estratégia funcionou
          setError('Transação não encontrada');
          setLoading(false);
          return;
        }
        
        // Executar a consulta principal (apenas para o caso UUID)
        if (isUuid) {
          const { data: transactionData, error: fetchError } = await query.single();
          
          if (fetchError) {
            console.error('Erro ao buscar transação:', fetchError);
            setError('Erro ao buscar detalhes da transação');
            setLoading(false);
            return;
          }
          
          if (!transactionData) {
            setError('Transação não encontrada');
            setLoading(false);
            return;
          }
          
          setTransaction(transactionData);
          
          // Se a transação tem um cliente associado, definir o cliente
          if (transactionData.customers) {
            setCustomer(transactionData.customers);
          }
          
          // Rastrear evento de conclusão de compra com Facebook Pixel
          if (typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('track', 'CompleteRegistration', {
              content_name: 'Compra finalizada',
              status: 'success',
              transaction_id: transactionId,
              value: transactionData.amount,
              currency: 'BRL'
            });
          }
          
          // Se o email não estiver na URL, mas estiver na transação ou no cliente, atualizar a URL
          if (!emailParam) {
            let transactionEmail = null;
            
            if (transactionData.customers && transactionData.customers.email) {
              transactionEmail = transactionData.customers.email;
            } else if (transactionData.customer_email || transactionData.metadata?.customer?.email || transactionData.metadata?.email) {
              transactionEmail = transactionData.customer_email || transactionData.metadata?.customer?.email || transactionData.metadata?.email;
            }
            
            if (transactionEmail) {
              // Atualizar a URL sem recarregar a página
              const newUrl = `${window.location.pathname}?id=${transactionId}&email=${encodeURIComponent(transactionEmail)}`;
              window.history.pushState({ path: newUrl }, '', newUrl);
              emailParam = transactionEmail;
            }
          }
        }
        
        // Se temos um email, criar ou atualizar o perfil e o customer
        if (emailParam) {
          // Verificar se temos dados da transação
          if (!transaction) {
            console.error('Dados da transação não disponíveis para criar perfil');
            setLoading(false);
            return;
          }
          
          // Extrair nome do usuário
          const userName = transaction.customer_name || 
                          transaction.metadata?.customer?.name || 
                          transaction.metadata?.profile?.full_name || 
                          transaction.metadata?.profile?.username || 
                          (transaction.customers ? transaction.customers.name : null) || 
                          emailParam.split('@')[0];
          
          // Verificar se o usuário já existe na tabela profiles
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', emailParam)
            .single();
          
          if (!existingUser) {
            // Usuário não existe, criar novo
            await supabase
              .from('profiles')
              .insert({
                email: emailParam,
                name: userName,
                role: 'customer',
                active: true
              });
            
            console.log('Perfil do usuário criado com sucesso');
          }
          
          // Se a transação não tem cliente associado, verificar se o cliente existe e associar
          if (!transaction.customers) {
            // Verificar se o cliente já existe na tabela customers
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('email', emailParam)
              .single();
            
            // Preparar dados do cliente
            const customerData: CustomerData = {
              email: emailParam,
              name: userName,
              metadata: {
                ...transaction.metadata,
                last_transaction_id: transaction.id,
                last_transaction_date: transaction.created_at
              }
            };
            
            // Adicionar telefone se disponível
            if (transaction.customer_phone || transaction.metadata?.customer?.phone || transaction.metadata?.phone) {
              customerData.phone = transaction.customer_phone || transaction.metadata?.customer?.phone || transaction.metadata?.phone;
            }
            
            // Adicionar username do Instagram se disponível
            if (transaction.metadata?.instagram_username || transaction.metadata?.customer?.instagram_username) {
              customerData.instagram_username = transaction.metadata?.instagram_username || transaction.metadata?.customer?.instagram_username;
            }
            
            let customerId;
            
            if (!existingCustomer) {
              // Cliente não existe, criar novo
              const { data: newCustomer } = await supabase
                .from('customers')
                .insert(customerData)
                .select('id')
                .single();
              
              if (newCustomer) {
                customerId = newCustomer.id;
                console.log('Cliente criado com sucesso');
              }
            } else {
              // Cliente existe, atualizar
              await supabase
                .from('customers')
                .update(customerData)
                .eq('id', existingCustomer.id);
              
              customerId = existingCustomer.id;
              console.log('Cliente atualizado com sucesso');
            }
            
            // Atualizar a transação com o customer_id
            if (customerId) {
              await supabase
                .from('transactions')
                .update({ customer_id: customerId })
                .eq('id', transaction.id);
              
              console.log('Transação atualizada com customer_id');
            }
          }
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Ocorreu um erro ao processar sua solicitação');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionAndCustomer();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold text-center">Carregando...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Link href="/" className="text-primary hover:underline">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-white to-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Pagamento Aprovado!
          </h1>
          
          <p className="text-center text-gray-600 mb-6">
            Seu pedido foi confirmado e está sendo processado.
          </p>
          
          {transaction && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Detalhes do Pedido</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID da Transação:</span>
                  <span className="font-medium">{transaction.external_id || transaction.id.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(transaction.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data:</span>
                  <span className="font-medium">
                    {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-green-600">Aprovado</span>
                </div>
                {customer && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-medium">{customer.name || customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Você receberá atualizações sobre seu pedido por email.
            </p>
            
            <div className="pt-4 space-y-3">
              <Link 
                href={`/acompanhar-pedido?email=${encodeURIComponent(email || (customer?.email || ''))}`}
                className="inline-block w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Acompanhar meu pedido
              </Link>
              
              <Link 
                href="/" 
                className="inline-block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Voltar para a página inicial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
