-- Add missing RLS policy for admins to update contracts
-- This allows admins/managers to change contract status (draft -> signed)

CREATE POLICY "Admins can update all contracts" ON public.contracts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Also add delete policy for completeness
CREATE POLICY "Admins can delete all contracts" ON public.contracts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
