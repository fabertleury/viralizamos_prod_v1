import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Configurar cabeçalhos para Server-Sent Events
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-open'
  };

  // Extrair external_reference dos parâmetros da URL
  const searchParams = request.nextUrl.searchParams;
  const externalReference = searchParams.get('external_reference');

  if (!externalReference) {
    return new NextResponse(null, { 
      status: 400, 
      headers 
    });
  }

  // Criar um stream de resposta
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Função para enviar evento de status
  const sendEvent = async (data: string) => {
    try {
      await writer.write(encoder.encode(`event: statusPayment\ndata: ${data}\n\n`));
    } catch (error) {
      console.error('Erro ao enviar evento:', error);
    }
  };

  // Iniciar verificação de status
  const checkPaymentStatus = async () => {
    try {
      const supabase = createClient();

      // Log inicial com todos os parâmetros
      console.log('Buscando transação com referências:', { 
        externalReference 
      });

      // Estratégias de busca múltiplas
      const searchStrategies = [
        async () => {
          console.log('Estratégia 1: Busca por payment_external_reference');
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('payment_external_reference', externalReference)
            .limit(2);
          
          console.log('Resultado Estratégia 1:', { 
            dataCount: data?.length, 
            data,
            error 
          });

          return { data, error };
        },
        
        async () => {
          console.log('Estratégia 2: Busca por payment_id');
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('payment_id', externalReference)
            .limit(2);
          
          console.log('Resultado Estratégia 2:', { 
            dataCount: data?.length, 
            data,
            error 
          });

          return { data, error };
        },
        
        async () => {
          console.log('Estratégia 3: Busca por id');
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', externalReference)
            .limit(2);
          
          console.log('Resultado Estratégia 3:', { 
            dataCount: data?.length, 
            data,
            error 
          });

          return { data, error };
        },

        async () => {
          console.log('Estratégia 4: Busca flexível no metadata');
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .containedBy('metadata', {
              payment: {
                id: externalReference
              }
            })
            .limit(2);
          
          console.log('Resultado Estratégia 4:', { 
            dataCount: data?.length, 
            data,
            error 
          });

          return { data, error };
        }
      ];

      let transaction = null;
      let error = null;

      // Tentar estratégias de busca
      for (const strategy of searchStrategies) {
        const result = await strategy();
        
        if (result.data && result.data.length === 1) {
          transaction = result.data[0];
          break;
        } else if (result.data && result.data.length > 1) {
          console.warn('Múltiplas transações encontradas:', result.data);
          // Escolher a transação mais recente
          transaction = result.data.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          break;
        }
        
        error = result.error;
      }

      console.log('Resultado final da busca:', { 
        transaction, 
        error 
      });

      // Se nenhuma estratégia funcionar
      if (!transaction) {
        console.error('Transação não encontrada:', error);
        await sendEvent('not_found');
        return false;
      }

      // Verificar se o status é aprovado
      const isPaymentApproved = transaction.status === 'approved';
      
      console.log('Payment Status Check:', {
        externalReference,
        status: transaction.status,
        isApproved: isPaymentApproved
      });

      await sendEvent(isPaymentApproved ? 'true' : 'false');

      return isPaymentApproved;
    } catch (error) {
      console.error('Unexpected error:', error);
      await sendEvent('error');
      return false;
    }
  };

  // Iniciar stream e verificação periódica
  const startStream = async () => {
    let isStreamClosed = false;
    try {
      let isApproved = false;
      
      while (!isApproved && !isStreamClosed) {
        isApproved = await checkPaymentStatus();
        
        if (!isApproved) {
          // Esperar 5 segundos antes da próxima verificação
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Fechar o stream quando o pagamento for aprovado ou houver erro
      if (!isStreamClosed) {
        await writer.close();
        isStreamClosed = true;
      }
    } catch (error) {
      console.error('Stream error:', error);
      if (!isStreamClosed) {
        try {
          await writer.close();
          isStreamClosed = true;
        } catch (closeError) {
          console.error('Erro ao fechar stream:', closeError);
        }
      }
    }
  };

  // Iniciar stream em background
  startStream();

  return new NextResponse(readable, { 
    status: 200, 
    headers 
  });
}
