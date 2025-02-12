-- Adiciona o tipo de checkout de visualizações se não existir
INSERT INTO checkout_types (name, slug, description)
SELECT 'Visualizações', 'visualizacao', 'Checkout para compra de visualizações'
WHERE NOT EXISTS (
    SELECT 1 FROM checkout_types WHERE slug = 'visualizacao'
);
