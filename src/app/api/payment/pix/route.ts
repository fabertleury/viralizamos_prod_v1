import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import mercadopago from 'mercadopago';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    // Validar os dados necessários
    if (!body.service || !body.profile || !body.customer) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const { service, profile, customer, posts = [], amount } = body;
    
    // Usar o amount do body ou calcular a partir do service.price
    const paymentAmount = amount || service.price || service.preco || 0;

    // Não forçar mais um valor mínimo, usar o valor real do serviço
    const finalAmount = paymentAmount;

    console.log('Valor do pagamento:', finalAmount);

    // Verificar se o token do Mercado Pago está configurado
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Configuração incompleta' },
        { status: 500 }
      );
    }

    // Configurar o cliente do Mercado Pago
    mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN || '');

    // Processar os posts (se houver)
    const processedPosts = posts.map((post: any) => {
      return {
        id: post.id || post.shortcode || post.code,
        code: post.shortcode || post.code || post.id,
        username: post.username || profile.username,
        caption: post.caption || '',
        url: post.url || `https://instagram.com/p/${post.shortcode || post.code || post.id}`
      };
    });

    // Criar o pagamento no Mercado Pago
    console.log('Criando pagamento PIX no Mercado Pago...');
    const result = await mercadopago.payment.create({
      transaction_amount: Number(finalAmount),
      description: `${service.name} para @${profile.username}`,
      payment_method_id: 'pix',
      payer: {
        email: customer.email,
        first_name: customer.name?.split(' ')[0] || 'Cliente',
        last_name: customer.name?.split(' ').slice(1).join(' ') || 'Anônimo'
      },
      metadata: {
        service_id: service.id,
        service_name: service.name,
        profile_username: profile.username,
        customer_email: customer.email,
        customer_name: customer.name,
        customer_phone: customer.phone
      }
    });

    console.log('Resposta do Mercado Pago:', JSON.stringify(result, null, 2));

    // Gerar QR Code em base64
    const qrCodeText = result.body.point_of_interaction.transaction_data.qr_code;
    let qrCodeBase64 = '';
    
    try {
      // Gerar QR Code em base64 sem o prefixo data:image/png;base64,
      qrCodeBase64 = await QRCode.toDataURL(qrCodeText);
      // Remover o prefixo para armazenar apenas os dados base64
      qrCodeBase64 = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
      console.log('QR Code gerado com sucesso');
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
      // Continuar mesmo se houver erro na geração do QR Code
    }

    // Obter o usuário atual (se autenticado)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const user_id = user?.id || null;

    // Salvar a transação no banco de dados
    console.log('Salvando transação no banco de dados...');
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        type: 'payment',
        amount: Number(finalAmount),
        status: 'pending',
        payment_method: 'pix',
        payment_id: result.body.id.toString(),
        service_id: service.id,
        customer_name: customer.name || 'N/A',
        customer_email: customer.email || 'N/A',
        customer_phone: customer.phone || 'N/A',
        target_username: profile.username || 'N/A',
        target_full_name: profile.full_name || 'N/A',
        target_profile_link: profile.link || `https://instagram.com/${profile.username}`,
        metadata: {
          service: {
            id: service.id,
            fama_id: service.fama_id,
            name: service.name,
            quantity: service.quantity
          },
          profile: {
            username: profile.username,
            full_name: profile.full_name,
            link: profile.link || `https://instagram.com/${profile.username}`
          },
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          },
          posts: processedPosts,
          payment: {
            id: result.body.id,
            qr_code: result.body.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: qrCodeBase64
          }
        }
      })
      .select();

    // Log detalhado dos dados salvos
    console.log('Dados da transação salvos:', JSON.stringify({
      columnData: {
        user_id,
        type: 'payment',
        amount: Number(finalAmount),
        status: 'pending',
        payment_method: 'pix',
        service_id: service.id,
        customer_name: customer.name || 'N/A',
        customer_email: customer.email || 'N/A',
        customer_phone: customer.phone || 'N/A',
        target_username: profile.username || 'N/A',
        target_full_name: profile.full_name || 'N/A',
        target_profile_link: profile.link || `https://instagram.com/${profile.username}`,
      },
      metadataData: {
        service: {
          id: service.id,
          fama_id: service.fama_id,
          name: service.name,
          quantity: service.quantity
        },
        posts: processedPosts
      }
    }, null, 2));

    if (transactionError) {
      throw transactionError;
    }

    return NextResponse.json({
      id: result.body.id,
      qr_code: result.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: qrCodeBase64,
      status: 'pending',
      amount: Number(finalAmount),
      transaction_id: transaction?.[0]?.id || null
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Error creating payment' },
      { status: 500 }
    );
  }
}
