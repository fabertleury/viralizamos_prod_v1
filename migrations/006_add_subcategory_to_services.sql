-- Add subcategory_id to services table
ALTER TABLE services
ADD COLUMN subcategory_id uuid REFERENCES subcategories(id);

-- Add index for better performance
CREATE INDEX idx_services_subcategory ON services(subcategory_id);
