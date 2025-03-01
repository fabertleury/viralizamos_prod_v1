import { NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, customer, service, user_id, profile, posts } = body;

    console.log('Criando pagamento PIX:', { amount, description, customer });
    console.log('Posts recebidos:', JSON.stringify(posts, null, 2));

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Configurar Mercado Pago
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
    });

    // Criar pagamento no Mercado Pago
    const result = await mercadopago.payment.create({
      transaction_amount: Number(amount),
      description,
      payment_method_id: 'pix',
      payer: {
        email: customer.email,
        first_name: customer.name
      },
      external_reference: crypto.randomUUID()
    });

    // Log detalhado da resposta do Mercado Pago
    console.log('Resposta completa do Mercado Pago:', JSON.stringify(result, null, 2));
    console.log('Dados da transação:', JSON.stringify(result.body.point_of_interaction?.transaction_data, null, 2));

    if (!result.body.point_of_interaction?.transaction_data?.qr_code) {
      throw new Error('Erro ao gerar QR Code do PIX');
    }

    // Tentar gerar QR Code base64 manualmente se não estiver presente
    let qrCodeBase64 = result.body.point_of_interaction.transaction_data.qr_code_base64;
    if (!qrCodeBase64) {
      try {
        const QRCode = require('qrcode');
        qrCodeBase64 = await QRCode.toDataURL(result.body.point_of_interaction.transaction_data.qr_code);
      } catch (qrError) {
        console.error('Erro ao gerar QR Code base64:', qrError);
      }
    }

    // Verificar e processar os posts para garantir que todos os links de imagens estejam definidos
    const processedPosts = posts.map((post: any) => {
      // Garantir que image_url esteja definido
      const imageUrl = post.image_url || post.display_url || post.thumbnail_url || '';
      
      // Garantir que temos um código válido para o link
      const postCode = post.shortcode || post.code || post.id;
      
      console.log(`Processando post ${post.id}:`, {
        original_image_url: post.image_url,
        processed_image_url: imageUrl,
        shortcode: post.shortcode,
        code: post.code,
        postCode: postCode
      });
      
      return {
        id: post.id,
        shortcode: postCode,
        link: post.link || `https://instagram.com/p/${postCode}`,
        caption: post.caption || 'Sem legenda',
        image_url: imageUrl
      };
    });

    const supabase = createClient();

    // Criar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        type: 'payment',
        amount: Number(amount),
        status: 'pending',
        payment_method: 'pix',
        service_id: service.id,
        customer_name: customer.name || 'N/A',
        customer_email: customer.email || 'N/A',
        customer_phone: customer.phone || 'N/A',
        target_username: profile.username || 'N/A',
        target_full_name: profile.full_name || 'N/A',
        target_profile_link: profile.link || `https://instagram.com/${profile.username}`,
        payment_qr_code: result.body.point_of_interaction.transaction_data.qr_code,
        payment_qr_code_base64: qrCodeBase64,
        payment_external_reference: result.body.id.toString(),
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
        amount: Number(amount),
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
      status: 'pending'
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Error creating payment' },
      { status: 500 }
    );
  }
}
