-- Migration to allow Custom Installations (without Offer)
-- Makes offer_id nullable and ensures index exists for performance

DO $$
BEGIN
    -- 1. Make offer_id NULLABLE
    ALTER TABLE public.installations ALTER COLUMN offer_id DROP NOT NULL;

    -- 2. Add index on offer_id if not exists (good practice for optional FKs)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'installations' AND indexname = 'idx_installations_offer_id') THEN
        CREATE INDEX idx_installations_offer_id ON public.installations(offer_id);
    END IF;

END $$;
