-- Migration: Sync Calculator Models to Product Definitions
-- Timestamp: 20260105234500

-- Create a temporary table or use VALUES to upsert
DO $$
DECLARE
    model_record RECORD;
BEGIN
    -- 1. Aluxe Models
    FOR model_record IN SELECT * FROM (VALUES
        ('orangestyle', 'Orangestyle', 'Aluxe'),
        ('trendstyle', 'Trendstyle', 'Aluxe'),
        ('trendstyle_plus', 'Trendstyle+', 'Aluxe'),
        ('topstyle', 'Topstyle', 'Aluxe'),
        ('topstyle_xl', 'Topstyle XL', 'Aluxe'),
        ('skystyle', 'Skystyle', 'Aluxe'),
        ('ultrastyle', 'Ultrastyle', 'Aluxe'),
        ('carport', 'Carport', 'Aluxe')
    ) AS t(code, name, provider)
    LOOP
        -- Update if exists (by code)
        UPDATE product_definitions 
        SET name = model_record.name,
            provider = model_record.provider
        WHERE code = model_record.code;

        -- Insert if not exists
        IF NOT FOUND THEN
            INSERT INTO product_definitions (name, code, category, provider)
            VALUES (model_record.name, model_record.code, 'roof', model_record.provider);
        END IF;
    END LOOP;

    -- 2. Deponti Models
    FOR model_record IN SELECT * FROM (VALUES
        ('nebbiolo', 'Nebbiolo', 'Deponti'),
        ('bosco', 'Bosco', 'Deponti'),
        ('ribolla', 'Ribolla', 'Deponti'),
        ('pigato', 'Pigato', 'Deponti'),
        ('pigato_plus', 'Pigato Plus', 'Deponti'),
        ('giallo', 'Giallo', 'Deponti'),
        ('giallo_plus', 'Giallo Plus', 'Deponti'),
        ('trebbiano', 'Trebbiano', 'Deponti'),
        ('verdeca', 'Verdeca', 'Deponti'),
        ('pinela', 'Pinela', 'Deponti'),
        ('pinela_deluxe', 'Pinela Deluxe', 'Deponti'),
        ('pinela_glass', 'Pinela Glass', 'Deponti'),
        ('pinela_deluxe_plus', 'Pinela Deluxe+', 'Deponti')
    ) AS t(code, name, provider)
    LOOP
        -- Update if exists
        UPDATE product_definitions 
        SET name = model_record.name,
            provider = model_record.provider
        WHERE code = model_record.code;

        -- Insert if not exists
        IF NOT FOUND THEN
            INSERT INTO product_definitions (name, code, category, provider)
            VALUES (model_record.name, model_record.code, 'roof', model_record.provider);
        END IF;
    END LOOP;

END $$;
