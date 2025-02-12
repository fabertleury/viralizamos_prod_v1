-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create subcategories table
CREATE TABLE subcategories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    icon text,
    slug text NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
    active boolean DEFAULT true,
    order_position integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(slug, category_id)
);

-- Add RLS policies
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Enable read access for all users" ON subcategories
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated admin users only
CREATE POLICY "Enable write access for admin users" ON subcategories
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'admin'
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'admin'
    );

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON subcategories
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
