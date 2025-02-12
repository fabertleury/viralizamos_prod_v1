-- Create selected_posts table
CREATE TABLE IF NOT EXISTS selected_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    post_id TEXT NOT NULL,
    post_code TEXT NOT NULL,
    post_link TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_selected_posts_transaction_id ON selected_posts(transaction_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_selected_posts_updated_at
    BEFORE UPDATE ON selected_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
