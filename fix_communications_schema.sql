-- Fix Foreign Key for PostgREST joins
-- The frontend joins 'customer_communications' with 'profiles' to show user names.
-- PostgREST requires an explicit FK to 'profiles' to allow embedding 'user:profiles(...)'.

ALTER TABLE public.customer_communications
DROP CONSTRAINT IF EXISTS customer_communications_user_id_fkey;

ALTER TABLE public.customer_communications
ADD CONSTRAINT customer_communications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload config';
