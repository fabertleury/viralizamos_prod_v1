-- Add preco_custo column to services table
ALTER TABLE services ADD COLUMN preco_custo decimal(10,2) DEFAULT 0;