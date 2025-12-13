-- Running this command forces Supabase (PostgREST) to refresh its knowledge of your database structure.
-- This fixes "Could not find column... in schema cache" errors (PGRST204).

NOTIFY pgrst, 'reload config';
