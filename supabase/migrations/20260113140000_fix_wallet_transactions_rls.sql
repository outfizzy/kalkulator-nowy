-- Fix Wallet Transactions RLS and Schema

-- 1. Ensure Table Exists (Idempotent)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT CHECK (currency IN ('EUR', 'PLN')) DEFAULT 'EUR',
    category TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Income specific
    customer_id UUID, -- Optional link to customer/offer 
    customer_name TEXT,
    contract_number TEXT,
    
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Exchange info
    exchange_rate NUMERIC,
    original_currency TEXT CHECK (original_currency IN ('EUR', 'PLN')),
    original_amount NUMERIC
);

-- 2. Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins and Managers can view all wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins and Managers can insert wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins and Managers can update wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins and Managers can delete wallet transactions" ON wallet_transactions;

-- 4. Re-create Policies (Admin & Manager Full Access)
CREATE POLICY "Admins and Managers can view all wallet transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and Managers can insert wallet transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and Managers can update wallet transactions" ON wallet_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and Managers can delete wallet transactions" ON wallet_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 5. Fix `deleted_wallet_transactions` as well if used
CREATE TABLE IF NOT EXISTS deleted_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_transaction_id UUID,
    type TEXT,
    amount NUMERIC,
    currency TEXT,
    category TEXT,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    customer_id UUID,
    customer_name TEXT,
    contract_number TEXT,
    exchange_rate NUMERIC,
    original_currency TEXT,
    original_amount NUMERIC,
    
    deletion_reason TEXT,
    deleted_by UUID, -- No FK constraint to allow hard delete of users if needed, or keep FK
    processed_by UUID, 
    created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE deleted_wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deleted transactions" ON deleted_wallet_transactions;
DROP POLICY IF EXISTS "Admins can insert deleted transactions" ON deleted_wallet_transactions;

CREATE POLICY "Admins can view deleted transactions" ON deleted_wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can insert deleted transactions" ON deleted_wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
