import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    // Garantir que params.username seja tratado como assíncrono
    const username = await Promise.resolve(params.username);

    const response = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${username}`,
      {
        headers: {
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        }
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Erro ao buscar perfil no Instagram' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json(
      { message: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
