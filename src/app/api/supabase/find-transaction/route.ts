import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      payment_external_reference, 
      external_reference, 
      payment_id 
    } = body;

    console.log('Buscando transação com referências:', { 
      payment_external_reference, 
      external_reference, 
      payment_id 
    });

    const supabase = createClient();

    // Estratégias de busca múltiplas
    const searchStrategies = [
      () => supabase
        .from('transactions')
        .select('*')
        .or(
          `payment_external_reference.eq.${payment_external_reference || external_reference || payment_id},` +
          `external_reference.eq.${payment_external_reference || external_reference || payment_id},` +
          `metadata->payment->id.eq.${payment_external_reference || external_reference || payment_id}`
        )
        .single(),
      
      // Fallback para busca mais flexível
      () => supabase
        .from('transactions')
        .select('*')
        .or(
          `payment_external_reference.ilike.%${payment_external_reference || external_reference || payment_id}%,` +
          `external_reference.ilike.%${payment_external_reference || external_reference || payment_id}%`
        )
        .single()
    ];

    let transaction = null;
    let error = null;

    // Tentar estratégias de busca
    for (const strategy of searchStrategies) {
      const result = await strategy();
      
      if (result.data) {
        transaction = result.data;
        break;
      }
      
      error = result.error;
    }

    // Se nenhuma estratégia funcionar
    if (!transaction) {
      console.error('Erro na busca da transação:', error);
      return NextResponse.json({ 
        error: 'Transação não encontrada',
        details: error?.message || 'Nenhuma estratégia de busca funcionou',
        searchParams: { 
          payment_external_reference, 
          external_reference, 
          payment_id 
        }
      }, { status: 404 });
    }

    console.log('Transação encontrada:', transaction);

    return NextResponse.json({
      transaction,
      status: 'found'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: String(error)
    }, { status: 500 });
  }
}
