-- Criar tabela de tipos de checkout
CREATE TABLE checkout_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  social_id UUID REFERENCES socials(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserir tipos básicos de checkout
INSERT INTO checkout_types (name, slug, social_id) 
SELECT 
  'Curtidas', 
  'curtidas',
  s.id
FROM socials s 
WHERE s.name = 'Instagram';

INSERT INTO checkout_types (name, slug, social_id) 
SELECT 
  'Seguidores', 
  'seguidores',
  s.id
FROM socials s 
WHERE s.name = 'Instagram';

INSERT INTO checkout_types (name, slug, social_id) 
SELECT 
  'Visualizações', 
  'visualizacao',
  s.id
FROM socials s 
WHERE s.name = 'Instagram';

-- Adicionar constraint de foreign key na tabela services
ALTER TABLE services 
ADD CONSTRAINT fk_checkout_type 
FOREIGN KEY (checkout_type_id) 
REFERENCES checkout_types(id);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checkout_types_updated_at
    BEFORE UPDATE ON checkout_types
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Criar RLS policies
ALTER TABLE checkout_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON checkout_types
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON checkout_types
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON checkout_types
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON checkout_types
    FOR DELETE USING (auth.role() = 'authenticated');
