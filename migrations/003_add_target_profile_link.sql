-- Add target_profile_link column to transactions table
ALTER TABLE transactions
ADD COLUMN target_profile_link text;
