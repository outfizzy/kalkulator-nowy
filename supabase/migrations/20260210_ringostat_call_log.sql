-- Ringostat Call Log: Persistent storage for synced call data
-- Enables customer matching, callback tracking, and call history in CRM

CREATE TABLE IF NOT EXISTS call_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ringostat_id TEXT UNIQUE,                          -- unique call identifier (hash of calldate+caller+dst)
    call_date TIMESTAMPTZ NOT NULL,
    caller TEXT,                                        -- raw caller number from Ringostat
    callee TEXT,                                        -- raw destination number
    caller_normalized TEXT,                             -- cleaned number for matching
    callee_normalized TEXT,                             -- cleaned number for matching
    direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
    disposition TEXT,                                    -- ANSWERED, NO ANSWER, BUSY, FAILED, VOICEMAIL
    duration INTEGER DEFAULT 0,                         -- call duration in seconds (billsec)
    recording_url TEXT,                                 -- link to Ringostat recording
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    internal_extension TEXT,                             -- internal PBX extension (e.g. '100', '101')
    matched_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- matched sales rep by extension
    callback_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,      -- who called back
    callback_at TIMESTAMPTZ,                            -- when they called back
    notes TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_call_log_customer ON call_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_log_date ON call_log(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_call_log_caller_norm ON call_log(caller_normalized);
CREATE INDEX IF NOT EXISTS idx_call_log_callee_norm ON call_log(callee_normalized);
CREATE INDEX IF NOT EXISTS idx_call_log_disposition ON call_log(disposition);
CREATE INDEX IF NOT EXISTS idx_call_log_ringostat ON call_log(ringostat_id);

-- RLS
ALTER TABLE call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read call_log"
    ON call_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert call_log"
    ON call_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update call_log"
    ON call_log FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role needs full access for API sync
CREATE POLICY "Service role full access on call_log"
    ON call_log FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
