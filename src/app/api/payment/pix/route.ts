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

    // Função para extrair o código correto de um post do Instagram
    const extractPostCode = (post: any): string => {
      // Se o post já tem um código que não é numérico, usar esse código
      if (post.code && !/^\d+$/.test(post.code)) {
        console.log('✅ Usando código existente:', post.code);
        return post.code;
      }
      
      // Se tem shortcode, usar o shortcode
      if (post.shortcode) {
        console.log('✅ Usando shortcode:', post.shortcode);
        return post.shortcode;
      }
      
      // Se tem permalink ou link, extrair o código da URL
      if (post.permalink || post.link || post.url) {
        const url = post.permalink || post.link || post.url;
        const match = url.match(/instagram\.com\/p\/([^\/]+)/);
        if (match && match[1]) {
          console.log('✅ Código extraído da URL:', match[1]);
          return match[1];
        }
      }
      
      // Se nada funcionar, usar o ID (não ideal, mas é o que temos)
      console.warn('⚠️ Não foi possível extrair um código curto válido, usando ID:', post.id);
      return post.id;
    };

    // Processar os posts (se houver)
    const processedPosts = posts.map((post: any) => {
      // Garantir que estamos usando o campo 'code' correto para o link do Instagram
      // Priorizar o campo 'code' sobre 'shortcode' ou 'id', conforme as boas práticas
      const postCode = extractPostCode(post);
      
      console.log('🔍 Processando post/reel na API de pagamento:', {
        id: post.id,
        code: post.code,
        shortcode: post.shortcode,
        postCode: postCode,
        finalUrl: `https://instagram.com/p/${postCode}`
      });
      
      return {
        id: post.id,
        code: postCode, // Armazenar o código correto
        username: post.username || profile.username,
        caption: post.caption || '',
        url: `https://instagram.com/p/${postCode}` // Garantir o formato correto do link
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
        payment_external_reference: result.body.id.toString(),
        external_id: result.body.id.toString(),
        payment_qr_code: result.body.point_of_interaction.transaction_data.qr_code,
        payment_qr_code_base64: qrCodeBase64,
        service_id: service.id,
        order_created: false,
        customer_name: customer.name || 'N/A',
        customer_email: customer.email || 'N/A',
        customer_phone: customer.phone || 'N/A',
        target_username: profile.username || 'N/A',
        target_full_name: profile.full_name || 'N/A',
        target_profile_link: profile.link || `https://instagram.com/${profile.username}`,
        metadata: {
          service: {
            id: service.id,
            provider_id: service.fama_id || service.provider_id, // Usar provider_id em vez de fama_id
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
          provider_id: service.fama_id || service.provider_id, // Usar provider_id em vez de fama_id
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
