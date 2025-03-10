-- Adicionar configurações para termos de uso e política de privacidade
INSERT INTO public.configurations (key, value, type, description, group_name, is_public, editable)
VALUES 
  ('terms_of_use', '', 'text', 'Termos de Uso', 'legal', true, true),
  ('privacy_policy', '', 'text', 'Política de Privacidade', 'legal', true, true)
ON CONFLICT (key) 
DO UPDATE SET 
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  group_name = EXCLUDED.group_name,
  is_public = EXCLUDED.is_public,
  editable = EXCLUDED.editable;
