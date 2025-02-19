import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Cria uma única instância do cliente Supabase com chave anônima
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hook personalizado para usar o cliente Supabase com verificação de autenticação
export async function useSupabaseWithAuth() {
  try {
    // Verificar se o usuário está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error('Você precisa estar autenticado para realizar esta ação.');
      return null;
    }

    // Verificar se o usuário tem permissão de administrador
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profileData) {
      toast.error('Não foi possível verificar seu perfil.');
      return null;
    }

    return {
      supabase,
      isAdmin: profileData.role === 'admin'
    };
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    toast.error('Ocorreu um erro ao verificar sua autenticação.');
    return null;
  }
}
