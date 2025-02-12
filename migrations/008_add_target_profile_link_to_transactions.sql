-- Adiciona a coluna target_profile_link na tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS target_profile_link TEXT;

-- Atualiza as políticas RLS para incluir a nova coluna
DROP POLICY IF EXISTS "Usuários autenticados podem ver suas próprias transações" ON transactions;
CREATE POLICY "Usuários autenticados podem ver suas próprias transações"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir transações" ON transactions;
CREATE POLICY "Usuários autenticados podem inserir transações"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Adiciona um índice para melhorar a performance de buscas
CREATE INDEX IF NOT EXISTS idx_transactions_target_profile_link
ON transactions(target_profile_link);
