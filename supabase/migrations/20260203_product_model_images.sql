-- Create table for storing product model images
-- One image per model name (Trendline, Topline, Designline, etc.)

CREATE TABLE IF NOT EXISTS product_model_images (
    model_name TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_model_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Anyone can read model images"
    ON product_model_images FOR SELECT
    USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Admins can manage model images"
    ON product_model_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_model_images_model ON product_model_images(model_name);

COMMENT ON TABLE product_model_images IS 'Stores main images for product models (Trendline, Topline, etc.)';
