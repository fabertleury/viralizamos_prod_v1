import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processTransaction } from '@/lib/famaapi';

export async function POST(request: NextRequest) {
  try {
    const { transactionId } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    console.log('[ProcessManual] Processando transação:', transactionId);
    
    const supabase = createClient();

    // Buscar a transação primeiro
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      console.error('[ProcessManual] Erro ao buscar transação:', transactionError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Processar a transação
    console.log('[ProcessManual] Iniciando processamento...');
    const result = await processTransaction(transactionId);
    console.log('[ProcessManual] Processamento concluído:', result);

    return NextResponse.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('[ProcessManual] Erro no processamento:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
