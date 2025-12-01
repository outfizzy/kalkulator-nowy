-- Umożliwia adminom i managerom wstawianie ofert mimo RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'offers'
          AND policyname = 'Admins and managers can insert offers'
    ) THEN
        CREATE POLICY "Admins and managers can insert offers"
        ON public.offers
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'manager')
            )
        );
    END IF;
END $$;
