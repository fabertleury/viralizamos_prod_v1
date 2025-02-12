import { NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, customer, service, user_id, profile, posts } = body;

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Configurar Mercado Pago
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
    });

    // Criar pagamento no Mercado Pago
    const result = await mercadopago.payment.create({
      transaction_amount: Number(amount),
      description,
      payment_method_id: 'pix',
      payer: {
        email: customer.email,
        first_name: customer.name
      }
    });

    if (!result.body.point_of_interaction?.transaction_data?.qr_code) {
      throw new Error('Erro ao gerar QR Code do PIX');
    }

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
        payment_qr_code_base64: result.body.point_of_interaction.transaction_data.qr_code_base64,
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
          posts: posts.map((post: any) => ({
            id: post.id,
            link: post.link || `https://instagram.com/p/${post.shortcode}`,
            caption: post.caption || 'Sem legenda',
            image_url: post.image_url || post.display_url
          })),
          payment: {
            id: result.body.id,
            qr_code: result.body.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: result.body.point_of_interaction.transaction_data.qr_code_base64
          }
        }
      })
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }

    return NextResponse.json({
      id: result.body.id,
      qr_code: result.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: result.body.point_of_interaction.transaction_data.qr_code_base64,
      transaction_id: transaction.id
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Error creating payment' },
      { status: 500 }
    );
  }
}
