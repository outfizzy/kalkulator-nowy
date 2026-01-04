-- Add AI Scoring columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Comment for clarity
COMMENT ON COLUMN leads.ai_score IS 'AI-generated score (0-100) indicating lead quality/hotness';
COMMENT ON COLUMN leads.ai_summary IS 'Short justification for the AI score';
