import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ou Anon Key não definidos');
}

const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);

export function useSupabase() {
  const [client] = useState(() => {
    return supabaseInstance;
  });

  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  const fetchServiceData = async (serviceId: string) => {
    console.log('Fetching service data for ID:', serviceId);
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      console.error('Error fetching service data:', error);
      throw new Error('Erro ao buscar detalhes do serviço');
    }

    console.log('Service data fetched successfully:', data);
    return data;
  };

  return { client, fetchServiceData };
}
