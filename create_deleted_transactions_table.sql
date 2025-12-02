-- Create table for deleted wallet transactions with deletion history
CREATE TABLE IF NOT EXISTS public.deleted_wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Original transaction data
    original_transaction_id uuid NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount decimal(10, 2) NOT NULL,
    currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'PLN')),
    category text NOT NULL,
    description text,
    date date NOT NULL,
    
    -- Income specific
    customer_id text,
    customer_name text,
    contract_number text,
    
    -- Exchange rate tracking
    exchange_rate decimal(10, 4),
    original_currency text CHECK (original_currency IN ('EUR', 'PLN')),
    original_amount decimal(10, 2),
    
    -- Deletion metadata
    deletion_reason text NOT NULL,
    deleted_by uuid REFERENCES public.profiles(id) NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Original creation info
    processed_by uuid REFERENCES public.profiles(id) NOT NULL,
    created_at timestamp with time zone NOT NULL
);

-- Enable RLS
ALTER TABLE public.deleted_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all deleted transactions
CREATE POLICY "Admins can view deleted transactions"
    ON public.deleted_wallet_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can insert deleted transactions (when deleting)
CREATE POLICY "Admins can insert deleted transactions"
    ON public.deleted_wallet_transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deleted_transactions_deleted_at 
    ON public.deleted_wallet_transactions(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_transactions_deleted_by 
    ON public.deleted_wallet_transactions(deleted_by);
