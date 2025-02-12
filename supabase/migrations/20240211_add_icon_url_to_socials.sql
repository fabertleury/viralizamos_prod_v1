-- Adiciona a coluna icon_url à tabela socials
ALTER TABLE socials 
ADD COLUMN icon_url text;

-- Atualiza as permissões para a nova coluna
ALTER TABLE socials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON socials
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON socials
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON socials
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
