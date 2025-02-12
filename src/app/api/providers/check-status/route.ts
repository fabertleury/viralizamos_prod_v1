import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { api_url, api_key } = await request.json();

    // Verifica a URL base
    const baseResponse = await fetch(api_url.replace(/\/$/, ''), {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Accept': 'application/json'
      }
    });

    if (!baseResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `API não acessível: ${baseResponse.status} ${baseResponse.statusText}`
      });
    }

    // Verifica o saldo
    const balanceUrl = `${api_url.replace(/\/$/, '')}/balance`;
    const balanceResponse = await fetch(balanceUrl, {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Accept': 'application/json'
      }
    });

    let balance = 0;
    let error = null;

    if (balanceResponse.ok) {
      try {
        const balanceData = await balanceResponse.json();
        balance = balanceData.balance || balanceData.saldo || 0;
      } catch (err) {
        error = 'Erro ao obter saldo da API';
      }
    } else {
      error = 'Não foi possível obter o saldo';
    }

    return NextResponse.json({
      success: true,
      balance,
      error
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao verificar API'
    }, { status: 500 });
  }
}
