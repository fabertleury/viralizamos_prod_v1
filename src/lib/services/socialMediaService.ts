import axios from 'axios';

interface OrderParams {
  service: string;
  link?: string;
  quantity?: number;
  username?: string;
}

export class SocialMediaService {
  private apiUrl = 'https://servicosredessociais.com.br/api/v2';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_FAMA_REDES_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('FAMA_REDES_API_KEY não configurada');
    }
  }

  async createOrder(params: OrderParams): Promise<{ order: number }> {
    try {
      const payload = {
        key: this.apiKey,
        action: 'add',
        ...params
      };

      console.log('Enviando pedido para API de serviços:', payload);

      const response = await axios.post(this.apiUrl, new URLSearchParams(payload as any), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Resposta da API:', response.data);

      return response.data;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  async checkOrderStatus(orderId: number) {
    try {
      const payload = {
        key: this.apiKey,
        action: 'status',
        order: orderId
      };

      const response = await axios.post(this.apiUrl, new URLSearchParams(payload as any), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao verificar status do pedido:', error);
      throw error;
    }
  }
}
