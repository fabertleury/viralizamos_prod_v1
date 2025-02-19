-- Habilitar RLS na tabela configurations
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes, se houverem
DROP POLICY IF EXISTS "Configurações públicas visíveis para todos" ON configurations;
DROP POLICY IF EXISTS "Administradores podem gerenciar todas as configurações" ON configurations;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar configurações públicas" ON configurations;

-- Política para selecionar apenas configurações públicas
CREATE POLICY "Configurações públicas visíveis para todos" 
ON configurations 
FOR SELECT 
USING (is_public = true);

-- Política para administradores poderem gerenciar todas as configurações
CREATE POLICY "Administradores podem gerenciar todas as configurações" 
ON configurations 
FOR ALL 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Política para permitir que usuários autenticados atualizem configurações públicas
CREATE POLICY "Usuários autenticados podem atualizar configurações públicas" 
ON configurations 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND is_public = true)
WITH CHECK (is_public = true);
