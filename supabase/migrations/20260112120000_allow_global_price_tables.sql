-- Allow price_tables to exist without a product definition (for Global Addon Matrices)
ALTER TABLE price_tables ALTER COLUMN product_definition_id DROP NOT NULL;
