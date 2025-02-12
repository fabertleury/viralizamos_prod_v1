import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function useSupabase() {
  const [client] = useState(() => {
    if (!supabaseInstance) {
      supabaseInstance = createClient();
    }
    return supabaseInstance;
  });

  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  return client;
}
