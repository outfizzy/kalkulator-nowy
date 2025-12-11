-- Add missing columns to wallet_transactions
DO $$ 
BEGIN
    -- exchange_rate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'exchange_rate'
    ) THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN exchange_rate decimal;
    END IF;

    -- original_currency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'original_currency'
    ) THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN original_currency text;
    END IF;

    -- original_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'original_amount'
    ) THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN original_amount decimal;
    END IF;
END $$;

-- Create deleted_wallet_transactions table
CREATE TABLE IF NOT EXISTS public.deleted_wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_transaction_id uuid, -- Keep track of what it was
    type text NOT NULL,
    amount decimal(10, 2) NOT NULL,
    currency text,
    category text NOT NULL,
    description text,
    date timestamp with time zone,
    
    customer_id text,
    customer_name text,
    contract_number text,
    
    exchange_rate decimal,
    original_currency text,
    original_amount decimal,
    
    deletion_reason text,
    deleted_by uuid REFERENCES auth.users(id),
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    processed_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone -- Original creation date
);

-- Enable RLS for deleted_wallet_transactions
ALTER TABLE public.deleted_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for deleted_wallet_transactions
DROP POLICY IF EXISTS "Admins can view deleted transactions" ON public.deleted_wallet_transactions;
CREATE POLICY "Admins can view deleted transactions"
    ON public.deleted_wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admins can insert deleted transactions" ON public.deleted_wallet_transactions;
CREATE POLICY "Admins can insert deleted transactions"
    ON public.deleted_wallet_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );
