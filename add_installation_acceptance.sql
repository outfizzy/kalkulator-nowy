-- Add acceptance column to installations table
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS acceptance JSONB;

-- Example structure of acceptance JSONB:
-- {
--   "acceptedAt": "2023-10-27T10:00:00.000Z",
--   "clientName": "Jan Kowalski",
--   "signature": "base64...", // Optional
--   "notes": "Bez uwag"
-- }
