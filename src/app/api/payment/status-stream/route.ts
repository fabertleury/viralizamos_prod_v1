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
    await writer.write(encoder.encode(`event: statusPayment\ndata: ${data}\n\n`));
  };

  // Iniciar verificação de status
  const checkPaymentStatus = async () => {
    try {
      const supabase = createClient();

      // Buscar transação pelo external_reference
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .filter('external_reference', 'eq', externalReference)
        .single();

      if (error) {
        console.error('Error fetching transaction:', error);
        await sendEvent('error');
        return false;
      }

      if (!transaction) {
        console.error('Transaction not found');
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
    try {
      let isApproved = false;
      
      while (!isApproved) {
        isApproved = await checkPaymentStatus();
        
        if (!isApproved) {
          // Esperar 5 segundos antes da próxima verificação
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Fechar o stream quando o pagamento for aprovado
      await writer.close();
    } catch (error) {
      console.error('Stream error:', error);
      await writer.close();
    }
  };

  // Iniciar stream em background
  startStream();

  return new NextResponse(readable, { 
    status: 200, 
    headers 
  });
}
