/**
 * Tipos e interfaces para o processamento de transações
 */

export interface Transaction {
  id: string;
  user_id?: string;
  customer_id?: string;
  service_id?: string;
  status?: string;
  amount?: number;
  payment_method?: string;
  payment_id?: string;
  external_id?: string;
  target_username?: string;
  target_profile_link?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  metadata?: {
    posts?: Post[];
    profile?: {
      username?: string;
      full_name?: string;
      email?: string;
    };
    username?: string;
    email?: string;
    phone?: string;
    contact?: {
      email?: string;
      phone?: string;
    };
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    service?: {
      id?: string;
      external_id?: string;
      quantity?: number;
      provider_id?: string;
    };
    checkout_type?: string;
    target_username?: string;
  };
  service?: {
    id?: string;
    external_id?: string;
    name?: string;
    quantidade?: number;
    quantity?: number;
    type?: string;
    provider_id?: string;
    metadata?: any;
  };
}

export interface Post {
  url?: string;
  link?: string;
  code?: string;
  shortcode?: string;
  username?: string;
  type?: 'post' | 'reel'; // Tipo do post: post normal ou reel
  image_url?: string;
  caption?: string | { text?: string };
  text?: string;
  id?: string;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  api_url?: string;
  api_key?: string;
}

export interface Order {
  id: string;
  transaction_id: string;
  user_id?: string;
  customer_id?: string;
  service_id?: string;
  provider_id: string;
  external_id?: string;
  external_order_id?: string;
  status: string;
  amount: number;
  quantity: number;
  link?: string;
  target_username?: string;
  payment_status?: string;
  payment_method?: string;
  payment_id?: string;
  metadata?: any;
}

export interface OrderResponse {
  order?: string;
  orderId?: string;
  status?: string;
}

export interface ProviderRequestData {
  service: string;
  link: string;
  quantity: number;
  transaction_id: string;
  target_username?: string;
  key?: string;
  action?: string;
}

export interface CreateOrderParams {
  service: string;
  link: string;
  quantity: number;
  provider_id: string;
}
