import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { processTransaction } from '@/lib/famaapi';

export async function POST(request: Request) {
  const cookieStore = cookies();

  try {
    const { transactionId } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar se o usuário está autenticado e é admin
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Error getting session' },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('User data error:', userError);
      return NextResponse.json(
        { error: 'Error getting user data' },
        { status: 500 }
      );
    }

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - User is not admin' },
        { status: 403 }
      );
    }

    // Buscar a transação primeiro
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Processar a transação
    const result = await processTransaction(transactionId);

    return NextResponse.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('Process order error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
