-- Script para criar um perfil de cliente a partir do email usado na compra
-- Este script deve ser executado manualmente no Supabase

-- Função para criar um perfil de cliente quando uma transação é criada
CREATE OR REPLACE FUNCTION public.create_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o email do cliente existe e não está vazio
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
    -- Verificar se já existe um perfil com este email
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.customer_email) THEN
      -- Inserir novo perfil com role 'customer'
      INSERT INTO public.profiles (
        email,
        name,
        role,
        active,
        created_at,
        updated_at
      ) VALUES (
        NEW.customer_email,
        NEW.customer_name,
        'customer',
        TRUE,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger para executar a função quando uma nova transação é inserida
DROP TRIGGER IF EXISTS create_customer_profile_trigger ON public.transactions;
CREATE TRIGGER create_customer_profile_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.create_customer_profile();

-- Script para atualizar a página de agradecimento para incluir o email na URL
-- Este script deve ser executado manualmente para transações existentes

-- Atualizar perfis para transações existentes
INSERT INTO public.profiles (email, name, role, active, created_at, updated_at)
SELECT DISTINCT 
  t.customer_email, 
  COALESCE(t.customer_name, 'Cliente') as name, 
  'customer' as role, 
  TRUE as active, 
  NOW() as created_at, 
  NOW() as updated_at
FROM public.transactions t
WHERE 
  t.customer_email IS NOT NULL 
  AND t.customer_email != '' 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.email = t.customer_email
  );
