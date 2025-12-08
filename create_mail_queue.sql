-- Create a table for queuing scheduled emails
CREATE TABLE IF NOT EXISTS public.mail_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_to TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB, -- Array of { filename, content, contentType }
    config JSONB NOT NULL, -- Snapshot of SMTP config at time of queuing
    scheduled_for TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.mail_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see and manage their own queue
-- Policy: Users can see and manage their own queue
DROP POLICY IF EXISTS "Users can manage their own mail queue" ON public.mail_queue;

CREATE POLICY "Users can manage their own mail queue"
ON public.mail_queue
FOR ALL
USING (auth.uid() = user_id);

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
