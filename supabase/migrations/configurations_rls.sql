-- Políticas de segurança para a tabela configurations

-- Habilitar RLS na tabela configurations
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes, se houverem
DROP POLICY IF EXISTS "Configurações públicas visíveis para todos" ON configurations;
DROP POLICY IF EXISTS "Administradores podem gerenciar todas as configurações" ON configurations;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar configurações" ON configurations;

-- Política para selecionar configurações
CREATE POLICY "Configurações públicas visíveis para todos" 
ON configurations 
FOR SELECT 
USING (is_public = true OR EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Política para administradores poderem gerenciar todas as configurações
CREATE POLICY "Administradores podem gerenciar todas as configurações" 
ON configurations 
FOR ALL 
USING (EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Política para permitir que usuários autenticados atualizem configurações
CREATE POLICY "Usuários autenticados podem atualizar configurações" 
ON configurations 
FOR UPDATE 
USING (
    auth.uid() IS NOT NULL AND (
        is_public = true OR 
        EXISTS (
            SELECT 1 
            FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
)
WITH CHECK (
    is_public = true OR 
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
