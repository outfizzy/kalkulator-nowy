-- Add exchange rate tracking to wallet_transactions table
-- Run this in Supabase SQL Editor

-- Add columns for tracking currency exchange
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS exchange_rate decimal(10, 4),
ADD COLUMN IF NOT EXISTS original_currency text CHECK (original_currency IN ('EUR', 'PLN')),
ADD COLUMN IF NOT EXISTS original_amount decimal(10, 2);

-- Add comment explaining the fields
COMMENT ON COLUMN public.wallet_transactions.exchange_rate IS 'Exchange rate used when converting from original currency to current currency';
COMMENT ON COLUMN public.wallet_transactions.original_currency IS 'Original currency before any exchange (if exchanged)';
COMMENT ON COLUMN public.wallet_transactions.original_amount IS 'Original amount before any exchange (if exchanged)';
