-- Drop existing policies
DROP POLICY IF EXISTS "Enable write access for admin users" ON subcategories;
DROP POLICY IF EXISTS "Enable read access for all users" ON subcategories;

-- Recreate policies with correct permissions
-- Allow read access to all users
CREATE POLICY "Enable read access for all users" ON subcategories
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated admin users only
CREATE POLICY "Enable write access for admin users" ON subcategories
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    );
