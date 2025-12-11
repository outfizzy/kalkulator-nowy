-- CHECK SUBSTITUTION STATUS
-- Run this to see who is delegating access to whom.

-- 1. Check if columns exist
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('substitute_user_id', 'substitute_until');

-- 2. View Active Delegations
SELECT 
    p.id as "Owner ID",
    p.full_name as "Owner Name",
    p.email as "Owner Email",
    s.full_name as "Substitute Name",
    s.email as "Substitute Email",
    p.substitute_until as "Valid Until"
FROM public.profiles p
LEFT JOIN public.profiles s ON p.substitute_user_id = s.id
WHERE p.substitute_user_id IS NOT NULL;
