-- Create checkout_types table
CREATE TABLE IF NOT EXISTS checkout_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    requires_profile_check BOOLEAN DEFAULT false,
    requires_public_profile BOOLEAN DEFAULT false,
    validation_fields JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add checkout_type_id to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS checkout_type_id UUID REFERENCES checkout_types(id);

-- Insert default checkout types
INSERT INTO checkout_types (name, slug, description, requires_profile_check, requires_public_profile, validation_fields) 
VALUES 
(
    'Checkout de Seguidores',
    'followers-checkout',
    'Checkout para compra de seguidores com verificação de perfil',
    true,
    true,
    '[
        {
            "name": "instagram_username",
            "label": "Nome de usuário do Instagram",
            "type": "text",
            "required": true,
            "placeholder": "@username",
            "validation": "^@?[a-zA-Z0-9._]+$"
        }
    ]'::jsonb
),
(
    'Checkout de Curtidas',
    'likes-checkout',
    'Checkout para compra de curtidas com verificação de post',
    true,
    true,
    '[
        {
            "name": "post_url",
            "label": "URL do Post",
            "type": "text",
            "required": true,
            "placeholder": "https://www.instagram.com/p/...",
            "validation": "^https?://(?:www\\.)?instagram\\.com/p/[\\w-]+/?.*$"
        }
    ]'::jsonb
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for checkout_types
CREATE TRIGGER update_checkout_types_updated_at
    BEFORE UPDATE ON checkout_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();