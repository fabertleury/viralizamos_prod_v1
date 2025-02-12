-- Drop existing policies
DROP POLICY IF EXISTS "Enable write access for admin users" ON subcategories;

-- Create new policy with jwt check
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
