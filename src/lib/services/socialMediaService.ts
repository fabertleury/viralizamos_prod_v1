import axios from 'axios';
import { createClient } from '@/lib/supabase/server';

interface OrderParams {
  service: string;
  link?: string;
  quantity?: number;
  username?: string;
  transaction_id?: string;
  provider_id?: string; // ID do provedor no banco de dados
}

interface Provider {
  id: string;
  name: string;
  api_key: string;
  api_url: string;
  status: boolean;
}

export class SocialMediaService {
  private supabase = createClient();

  constructor() {}

  // Buscar provedor no Supabase
  private async getProvider(providerId: string): Promise<Provider | null> {
    try {
      console.log(`🔍 Buscando provedor com ID: ${providerId}`);
      
      const { data: provider, error } = await this.supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar provedor:', error);
        return null;
      }
      
      if (!provider) {
        console.error(`❌ Provedor com ID ${providerId} não encontrado`);
        return null;
      }
      
      if (!provider.api_key || !provider.api_url) {
        console.error(`❌ Provedor ${provider.name} não tem API key ou URL configurada`);
        return null;
      }
      
      console.log(`✅ Provedor encontrado: ${provider.name}`);
      return provider;
    } catch (error) {
      console.error('❌ Erro ao buscar provedor:', error);
      return null;
    }
  }

  async createOrder(params: OrderParams): Promise<{ order: number }> {
    try {
      // Garantir que o link do Instagram esteja no formato correto
      let finalLink = params.link || '';
      if (finalLink.includes('instagram.com/p/')) {
        // Extrair o código do post da URL
        let postCode = finalLink.split('/p/')[1]?.split('/')[0];
        if (postCode) {
          // Garantir que estamos usando o código correto do post
          console.log('Código do post extraído:', postCode);
          finalLink = `https://instagram.com/p/${postCode}`;
        }
      }
      
      // Buscar o serviço para obter o provider_id
      const { data: serviceData, error: serviceError } = await this.supabase
        .from('services')
        .select('*, provider:providers(*)')
        .eq('id', params.service)
        .single();
      
      if (serviceError || !serviceData) {
        console.error('❌ Serviço não encontrado:', {
          serviceId: params.service,
          error: serviceError
        });
        throw new Error(`Serviço com ID ${params.service} não encontrado`);
      }
      
      // Obter o provider_id do serviço ou usar o fornecido nos parâmetros
      const providerId = params.provider_id || serviceData.provider_id;
      
      if (!providerId) {
        console.error('❌ Provider ID não encontrado para o serviço:', serviceData);
        throw new Error(`Provider ID não encontrado para o serviço ${params.service}`);
      }
      
      // Buscar o provedor
      const provider = await this.getProvider(providerId);
      
      if (!provider) {
        throw new Error(`Provedor com ID ${providerId} não encontrado ou não configurado`);
      }
      
      console.log(`📡 Enviando pedido para provedor: ${provider.name}`);
      
      // Montar payload para a API do provedor
      const payload = {
        key: provider.api_key,
        action: 'add',
        service: serviceData.external_id || params.service, // ID do serviço no provedor
        link: finalLink,
        quantity: params.quantity
      };

      console.log('Enviando pedido para API de serviços:', {
        ...payload,
        key: '***', // Ocultar a chave API nos logs
        providerName: provider.name,
        providerUrl: provider.api_url
      });

      try {
        // Fazer a requisição para a API do provedor
        const response = await axios.post(provider.api_url, payload);
        
        console.log('Resposta da API:', response.data);
        
        if (!response.data || !response.data.order) {
          console.error('❌ Resposta inválida da API:', response.data);
          throw new Error('Resposta inválida da API: ' + JSON.stringify(response.data));
        }
        
        return response.data;
      } catch (apiError: any) {
        console.error('❌ Erro na chamada da API:', {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status,
          providerName: provider.name
        });
        throw apiError;
      }
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  async checkOrderStatus(orderId: number, providerId: string) {
    try {
      // Buscar o provedor
      const provider = await this.getProvider(providerId);
      
      if (!provider) {
        throw new Error(`Provedor com ID ${providerId} não encontrado ou não configurado`);
      }
      
      const payload = {
        key: provider.api_key,
        action: 'status',
        order: orderId
      };

      console.log(`🔍 Verificando status do pedido ${orderId} no provedor ${provider.name}`);
      
      const response = await axios.post(provider.api_url, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar status do pedido:', error);
      throw error;
    }
  }
}
