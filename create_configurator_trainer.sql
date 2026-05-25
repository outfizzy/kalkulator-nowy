-- ============================================================================
-- CONFIGURATOR TRAINER SYSTEM
-- SQL Migration for Supabase
-- 
-- Purpose: AI-powered system for learning and automating supplier configurators.
-- Records user sessions, builds a graph of configuration nodes & edges,
-- runs automated tests, and discovers pricing rules.
--
-- Tables created:
--   1. job_queue                  - Universal async job queue
--   2. supplier_configurators     - Supplier configurator definitions
--   3. configurator_recordings    - Recorded browser sessions
--   4. configuration_nodes        - Discovered fields/steps in configurators
--   5. configuration_edges        - Dependencies between nodes
--   6. configurator_test_results  - Automated test run results
--   7. learned_pricing_rules      - AI-discovered pricing rules
--
-- Run this in: Supabase SQL Editor
-- Date: 2026-05-25
-- ============================================================================


-- ============================================================================
-- 1. JOB QUEUE - Universal async job queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job classification
    type TEXT NOT NULL CHECK (type IN ('supplier_quote', 'config_test', 'price_monitor', 'recording_analysis')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
    priority INTEGER NOT NULL DEFAULT 5,
    
    -- Job data
    payload JSONB NOT NULL,
    result JSONB,
    error TEXT,
    
    -- Retry logic
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    -- Locking (for worker concurrency)
    locked_by TEXT,
    locked_at TIMESTAMPTZ,
    
    -- Scheduling & timing
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Ownership
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.job_queue IS 'Universal async job queue for supplier quotes, config tests, price monitoring, and recording analysis.';
COMMENT ON COLUMN public.job_queue.locked_by IS 'Worker ID that currently holds the lock on this job.';
COMMENT ON COLUMN public.job_queue.payload IS 'Input data for the job - structure depends on job type.';
COMMENT ON COLUMN public.job_queue.result IS 'Output data after job completion - structure depends on job type.';

-- Partial index for efficient job polling: only pending jobs matter for the worker
CREATE INDEX IF NOT EXISTS idx_job_queue_pending
    ON public.job_queue (type, priority DESC, scheduled_for ASC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_queue_status
    ON public.job_queue (status);

CREATE INDEX IF NOT EXISTS idx_job_queue_created_by
    ON public.job_queue (created_by);

CREATE INDEX IF NOT EXISTS idx_job_queue_created_at
    ON public.job_queue (created_at DESC);


-- ============================================================================
-- 2. SUPPLIER CONFIGURATORS - Meta definitions for each supplier
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_configurators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Supplier identity
    supplier TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    
    -- Authentication
    login_url TEXT,
    login_required BOOLEAN NOT NULL DEFAULT true,
    credentials JSONB,  -- Encrypted reference: username_field, password_field, submit_button, etc.
    
    -- Learning status
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'recording', 'learning', 'testing', 'ready', 'broken')),
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Technical metadata
    tech_stack JSONB,       -- { framework, version, cms, rendering, css_prefix }
    page_structure JSONB,   -- Discovered page layout & navigation flow
    
    -- Health monitoring
    last_health_check TIMESTAMPTZ,
    last_health_result JSONB,
    health_check_interval_hours INTEGER NOT NULL DEFAULT 24,
    
    -- General metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.supplier_configurators IS 'Meta definitions for each supplier configurator (Aluxe, Teranda, Deponti, etc.).';
COMMENT ON COLUMN public.supplier_configurators.credentials IS 'Encrypted reference to login selectors. DO NOT store plaintext passwords here.';
COMMENT ON COLUMN public.supplier_configurators.confidence_score IS 'How well the system has learned this configurator (0.00-1.00).';

CREATE INDEX IF NOT EXISTS idx_supplier_configurators_supplier
    ON public.supplier_configurators (supplier);

CREATE INDEX IF NOT EXISTS idx_supplier_configurators_status
    ON public.supplier_configurators (status);


-- ============================================================================
-- 3. CONFIGURATOR RECORDINGS - Recorded browser sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configurator_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    configurator_id UUID NOT NULL REFERENCES public.supplier_configurators(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES public.profiles(id),
    
    -- Recording status
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'analyzing', 'analyzed', 'verified', 'failed')),
    
    -- Recorded data
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Final outcome
    final_price DECIMAL(12,2),
    final_currency TEXT NOT NULL DEFAULT 'EUR',
    final_configuration JSONB,
    final_pdf_path TEXT,
    
    -- Session metrics
    duration_ms INTEGER,
    steps_count INTEGER NOT NULL DEFAULT 0,
    pages_visited INTEGER NOT NULL DEFAULT 0,
    
    -- AI analysis results
    ai_analysis JSONB,
    ai_analysis_model TEXT,
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
    
    -- Classification
    product_model TEXT,
    tags TEXT[],
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.configurator_recordings IS 'Recorded browser sessions capturing user interactions with supplier configurators.';
COMMENT ON COLUMN public.configurator_recordings.steps IS 'Array of recorded interaction steps [{action, selector, value, timestamp, screenshot_path, ...}].';
COMMENT ON COLUMN public.configurator_recordings.ai_analysis IS 'AI-generated analysis of the recording: discovered nodes, edges, pricing patterns.';

CREATE INDEX IF NOT EXISTS idx_recordings_configurator_id
    ON public.configurator_recordings (configurator_id);

CREATE INDEX IF NOT EXISTS idx_recordings_recorded_by
    ON public.configurator_recordings (recorded_by);

CREATE INDEX IF NOT EXISTS idx_recordings_status
    ON public.configurator_recordings (status);

CREATE INDEX IF NOT EXISTS idx_recordings_created_at
    ON public.configurator_recordings (created_at DESC);


-- ============================================================================
-- 4. CONFIGURATION NODES - Discovered fields/steps in configurators
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configuration_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent configurator
    configurator_id UUID NOT NULL REFERENCES public.supplier_configurators(id) ON DELETE CASCADE,
    
    -- Node identity
    node_key TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('page', 'section', 'field', 'button', 'price_display', 'conditional_block')),
    name TEXT NOT NULL,
    
    -- DOM interaction
    selectors JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Array of CSS/XPath selectors (fallback chain)
    field_type TEXT CHECK (field_type IN ('select', 'input_number', 'input_text', 'checkbox', 'radio', 'button', 'display')),
    options JSONB,          -- Available options for selects, radios, etc.
    validation JSONB,       -- Validation rules: { min, max, pattern, required_if, ... }
    default_value TEXT,
    
    -- Layout position
    page_index INTEGER,
    section TEXT,
    order_in_section INTEGER,
    
    -- Behavioral flags
    is_required BOOLEAN NOT NULL DEFAULT true,
    is_conditional BOOLEAN NOT NULL DEFAULT false,
    
    -- Semantic meaning
    business_meaning TEXT,  -- Human-readable explanation of what this field represents
    
    -- Discovery tracking
    first_seen_in UUID REFERENCES public.configurator_recordings(id),
    seen_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Each node_key must be unique per configurator
    CONSTRAINT uq_configurator_node_key UNIQUE (configurator_id, node_key)
);

COMMENT ON TABLE public.configuration_nodes IS 'Discovered fields, buttons, pages, and sections within supplier configurators.';
COMMENT ON COLUMN public.configuration_nodes.node_key IS 'Stable identifier for this node within its configurator (e.g. "page1.section_dimensions.width").';
COMMENT ON COLUMN public.configuration_nodes.selectors IS 'Array of CSS/XPath selectors to locate this element, in fallback priority order.';
COMMENT ON COLUMN public.configuration_nodes.business_meaning IS 'AI-generated explanation: "Width of the pergola frame in mm".';

CREATE INDEX IF NOT EXISTS idx_nodes_configurator_id
    ON public.configuration_nodes (configurator_id);

CREATE INDEX IF NOT EXISTS idx_nodes_node_type
    ON public.configuration_nodes (node_type);

CREATE INDEX IF NOT EXISTS idx_nodes_configurator_page
    ON public.configuration_nodes (configurator_id, page_index, order_in_section);


-- ============================================================================
-- 5. CONFIGURATION EDGES - Dependencies between nodes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configuration_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent configurator
    configurator_id UUID NOT NULL REFERENCES public.supplier_configurators(id) ON DELETE CASCADE,
    
    -- Edge endpoints
    from_node_id UUID NOT NULL REFERENCES public.configuration_nodes(id) ON DELETE CASCADE,
    to_node_id UUID NOT NULL REFERENCES public.configuration_nodes(id) ON DELETE CASCADE,
    
    -- Edge classification
    edge_type TEXT NOT NULL CHECK (edge_type IN (
        'requires', 'activates', 'disables', 'changes_options',
        'modifies_price', 'forces_value', 'triggers_step', 'validation'
    )),
    
    -- Edge logic
    condition JSONB NOT NULL,   -- When does this edge fire? { field: "color", operator: "eq", value: "RAL" }
    effect JSONB,               -- What happens? { action: "set_options", data: [...] }
    
    -- Confidence & verification
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    
    -- Discovery metadata
    source TEXT NOT NULL DEFAULT 'recording' CHECK (source IN ('recording', 'ai_inference', 'manual', 'test_result')),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,    -- Array of recording IDs / test IDs that support this edge
    observation_count INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.configuration_edges IS 'Dependency graph edges between configuration nodes: requires, activates, disables, price effects, etc.';
COMMENT ON COLUMN public.configuration_edges.condition IS 'JSON condition that triggers this edge, e.g. {"field": "color_type", "operator": "eq", "value": "RAL"}.';
COMMENT ON COLUMN public.configuration_edges.evidence IS 'Array of recording/test IDs that provide evidence for this edge relationship.';

CREATE INDEX IF NOT EXISTS idx_edges_configurator_id
    ON public.configuration_edges (configurator_id);

CREATE INDEX IF NOT EXISTS idx_edges_from_node
    ON public.configuration_edges (from_node_id, edge_type);

CREATE INDEX IF NOT EXISTS idx_edges_to_node
    ON public.configuration_edges (to_node_id);

CREATE INDEX IF NOT EXISTS idx_edges_configurator_type
    ON public.configuration_edges (configurator_id, from_node_id, edge_type);


-- ============================================================================
-- 6. CONFIGURATOR TEST RESULTS - Automated test run results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configurator_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    configurator_id UUID NOT NULL REFERENCES public.supplier_configurators(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.job_queue(id),
    
    -- Test input
    input_config JSONB NOT NULL,
    
    -- Test status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
    
    -- Price comparison
    our_price DECIMAL(12,2),
    supplier_price DECIMAL(12,2),
    price_difference DECIMAL(12,2),
    price_difference_pct DECIMAL(5,2),
    
    -- Evidence
    screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_screenshot_path TEXT,
    pdf_path TEXT,
    
    -- Execution details
    execution_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    execution_time_ms INTEGER,
    steps_executed INTEGER,
    
    -- Error handling
    error_type TEXT,
    error_details JSONB,
    
    -- Self-healing
    self_healed BOOLEAN NOT NULL DEFAULT false,
    healing_details JSONB,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.configurator_test_results IS 'Results from automated test runs against supplier configurators, comparing our calculated prices vs actual.';
COMMENT ON COLUMN public.configurator_test_results.self_healed IS 'Whether the system auto-corrected selectors or flow during this test run.';

CREATE INDEX IF NOT EXISTS idx_test_results_configurator_id
    ON public.configurator_test_results (configurator_id);

CREATE INDEX IF NOT EXISTS idx_test_results_job_id
    ON public.configurator_test_results (job_id);

CREATE INDEX IF NOT EXISTS idx_test_results_status
    ON public.configurator_test_results (status);

CREATE INDEX IF NOT EXISTS idx_test_results_created_at
    ON public.configurator_test_results (created_at DESC);


-- ============================================================================
-- 7. LEARNED PRICING RULES - AI-discovered pricing rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.learned_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    configurator_id UUID NOT NULL REFERENCES public.supplier_configurators(id) ON DELETE CASCADE,
    supplier TEXT NOT NULL,
    
    -- Rule definition
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'base_price', 'surcharge', 'discount', 'multiplier',
        'option_price', 'size_factor', 'color_surcharge', 'accessory',
        'quantity_discount', 'minimum_price', 'custom'
    )),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Rule logic
    conditions JSONB NOT NULL,      -- When does this rule apply?
    price_effect JSONB NOT NULL,    -- What price change? { type: "add", amount: 150.00, currency: "EUR" }
    
    -- Confidence & verification
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
    verified BOOLEAN NOT NULL DEFAULT false,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    
    -- Active flag
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.learned_pricing_rules IS 'Pricing rules discovered by AI from analyzing configurator recordings and test results.';
COMMENT ON COLUMN public.learned_pricing_rules.conditions IS 'JSON conditions: {"width_mm": {"gte": 3000}, "color_type": "RAL"}.';
COMMENT ON COLUMN public.learned_pricing_rules.price_effect IS 'Price effect: {"type": "add", "amount": 150.00} or {"type": "multiply", "factor": 1.15}.';

CREATE INDEX IF NOT EXISTS idx_pricing_rules_configurator_id
    ON public.learned_pricing_rules (configurator_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_supplier
    ON public.learned_pricing_rules (supplier);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_active
    ON public.learned_pricing_rules (configurator_id, active)
    WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_rule_type
    ON public.learned_pricing_rules (rule_type);


-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_configurators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_pricing_rules ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper: Check if current user is admin or manager
-- Used in all policies below via EXISTS subquery pattern (consistent with codebase)

-- ---------------------------------------------------------------------------
-- job_queue policies
-- ---------------------------------------------------------------------------

-- Admins & managers: full access
CREATE POLICY "Admins/managers full access to job_queue"
    ON public.job_queue FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Authenticated users can view their own jobs
CREATE POLICY "Users can view own jobs"
    ON public.job_queue FOR SELECT
    USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- supplier_configurators policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to supplier_configurators"
    ON public.supplier_configurators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- ---------------------------------------------------------------------------
-- configurator_recordings policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to configurator_recordings"
    ON public.configurator_recordings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- ---------------------------------------------------------------------------
-- configuration_nodes policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to configuration_nodes"
    ON public.configuration_nodes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- ---------------------------------------------------------------------------
-- configuration_edges policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to configuration_edges"
    ON public.configuration_edges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- ---------------------------------------------------------------------------
-- configurator_test_results policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to configurator_test_results"
    ON public.configurator_test_results FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- ---------------------------------------------------------------------------
-- learned_pricing_rules policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins/managers full access to learned_pricing_rules"
    ON public.learned_pricing_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager')
        )
    );


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
-- Reuses the existing handle_updated_at() function from supabase_migration.sql

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.supplier_configurators
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.configurator_recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.configuration_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.configuration_edges
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.learned_pricing_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- SEED DATA: First supplier - Aluxe
-- ============================================================================
-- NOTE: Password is NOT included. Add it separately via the UI or a secure method.
INSERT INTO public.supplier_configurators (supplier, name, url, login_url, login_required, credentials, tech_stack)
VALUES (
    'aluxe',
    'Aluxe Bestelsysteem',
    'https://bestellen.aluxe.nl',
    'https://bestellen.aluxe.nl',
    true,
    '{"username_field": "#systemUsername", "password_field": "#systemPassword", "submit_button": "input[type=submit]", "username": "Polendach24"}'::jsonb,
    '{"framework": "jquery", "version": "1.4.1", "cms": "emcore", "rendering": "server-side", "css_prefix": "em-"}'::jsonb
)
ON CONFLICT (supplier) DO NOTHING;


-- ============================================================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload config';
