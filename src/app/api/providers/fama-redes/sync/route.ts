import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { FamaRedesService } from '@/services/famaRedes';

interface Service {
  id: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number;
  max: number;
  description: string;
}

export async function POST() {
  try {
    const famaRedes = new FamaRedesService();
    
    // Buscar serviços da API
    const services = await famaRedes.getServices();
    
    // Filtrar apenas serviços do Instagram
    const instagramServices = services.filter(service => 
      service.data.category.toLowerCase().includes('instagram')
    );

    // Mapear serviços para o formato do nosso banco
    const formattedServices = instagramServices.map(service => ({
      provider_id: 'fama-redes',
      external_id: service.data.id,
      name: service.data.name,
      type: service.data.type.toLowerCase(),
      quantidade: service.data.max,
      preco: parseFloat(service.data.rate),
      descricao: service.data.description,
      min_order: service.data.min,
      max_order: service.data.max,
      categoria: service.data.category,
      status: 'active',
      provider_name: 'Fama nas Redes',
      success_rate: 98, // Taxa padrão
      delivery_time: 24, // Tempo padrão em horas
      metadata: {
        requires_login: false,
        requires_public_profile: true,
      },
      updated_at: new Date().toISOString(),
    }));

    // Atualizar serviços no Supabase
    for (const service of formattedServices) {
      const { error } = await supabase
        .from('services')
        .upsert(
          {
            ...service,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'external_id',
          }
        );

      if (error) {
        console.error('Erro ao sincronizar serviço:', error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Serviços sincronizados com sucesso',
      count: formattedServices.length,
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno no servidor',
      },
      { status: 500 }
    );
  }
}
