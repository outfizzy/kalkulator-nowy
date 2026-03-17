-- Procurement Audit Log
-- Tracks who changed what in procurement (orders, deliveries, status changes)

CREATE TABLE IF NOT EXISTS procurement_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action TEXT NOT NULL, -- 'ordered', 'batch_ordered', 'delivered', 'status_changed', 'doc_uploaded', 'delivery_updated'
    item_id TEXT,
    item_name TEXT,
    contract_id TEXT,
    contract_ref TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_audit_created ON procurement_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procurement_audit_contract ON procurement_audit_log(contract_id);

ALTER TABLE procurement_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "allow_insert_audit_log" ON procurement_audit_log
        FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "allow_read_audit_log" ON procurement_audit_log
        FOR SELECT TO authenticated USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
