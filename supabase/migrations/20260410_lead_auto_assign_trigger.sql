-- ═══════════════════════════════════════════════════
-- AUTO-ASSIGN TRIGGER: Assigns unassigned leads to reps (round-robin + PLZ)
-- Runs on EVERY INSERT to leads table where assigned_to IS NULL
-- This covers ALL entry points: webhooks, edge functions, UI
-- ═══════════════════════════════════════════════════

-- 1. Create the assignment function
CREATE OR REPLACE FUNCTION auto_assign_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_rep_id UUID;
    v_plz TEXT;
    v_plz_prefix TEXT;
    v_auto_assign_reps UUID[] := ARRAY[
        '4e151d84-8cae-4ec8-90c4-a3bd46365b40'::UUID,  -- Oliwia Duz
        '0375aad6-5e1b-43c1-82c1-640f8cb7feb9'::UUID,  -- Mike Ledwin
        '15fb3c80-269f-42eb-8dcd-be11ed8153b1'::UUID,  -- Hubert Kosciow
        'ef37f787-e9e9-4fbb-9f3f-9ef653e3c91c'::UUID   -- Artur Nagorny
    ];
    v_workloads RECORD;
    v_best_rep UUID;
    v_min_workload INT := 999;
    v_plz_bonus INT;
    v_rep UUID;
BEGIN
    -- Only trigger on leads with no assigned owner
    IF NEW.assigned_to IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Only for early pipeline stages
    IF NEW.status NOT IN ('new', 'formularz', 'contacted') THEN
        RETURN NEW;
    END IF;

    -- Extract PLZ from customer_data
    v_plz := NEW.customer_data->>'postalCode';
    IF v_plz IS NULL THEN
        v_plz := NEW.customer_data->>'plz';
    END IF;
    IF v_plz IS NULL THEN
        -- Try to extract from city field (e.g., "PLZ 12345")
        v_plz := regexp_replace(NEW.customer_data->>'city', '[^0-9]', '', 'g');
    END IF;
    v_plz_prefix := LEFT(v_plz, 2);

    -- Find the best rep: lowest workload + PLZ bonus
    v_best_rep := NULL;

    FOREACH v_rep IN ARRAY v_auto_assign_reps LOOP
        -- Check rep exists and is not blocked
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = v_rep 
            AND (status IS NULL OR status != 'blocked')
        ) THEN
            CONTINUE;
        END IF;

        -- Count active leads for this rep
        SELECT COUNT(*) INTO v_plz_bonus
        FROM leads 
        WHERE assigned_to = v_rep 
        AND status NOT IN ('won', 'lost');

        -- PLZ bonus: if rep already has leads in same PLZ prefix
        IF v_plz_prefix IS NOT NULL AND LENGTH(v_plz_prefix) >= 2 THEN
            SELECT COUNT(*) INTO v_plz_bonus
            FROM leads 
            WHERE assigned_to = v_rep 
            AND status NOT IN ('won', 'lost')
            AND LEFT(customer_data->>'postalCode', 2) = v_plz_prefix;
            
            -- If rep has PLZ matches, give a bonus (reduce effective workload)
            IF v_plz_bonus > 0 THEN
                v_plz_bonus := -3 * v_plz_bonus; -- negative = better
            ELSE
                v_plz_bonus := 0;
            END IF;
        ELSE
            v_plz_bonus := 0;
        END IF;

        -- Get actual workload
        SELECT COUNT(*) INTO v_workloads
        FROM leads 
        WHERE assigned_to = v_rep 
        AND status NOT IN ('won', 'lost');

        -- Calculate effective score (lower = better)
        IF (v_workloads.count + v_plz_bonus) < v_min_workload THEN
            v_min_workload := v_workloads.count + v_plz_bonus;
            v_best_rep := v_rep;
        END IF;
    END LOOP;

    -- Assign the best rep
    IF v_best_rep IS NOT NULL THEN
        NEW.assigned_to := v_best_rep;
        
        -- Also notify the assigned rep
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
            v_best_rep,
            'info',
            '📋 Nowy lead przypisany automatycznie',
            COALESCE(
                CONCAT(
                    COALESCE(NEW.customer_data->>'firstName', ''),
                    ' ',
                    COALESCE(NEW.customer_data->>'lastName', NEW.customer_data->>'name', 'Nowy klient')
                ),
                'Nowy klient'
            ) || CASE WHEN v_plz IS NOT NULL THEN ' • PLZ ' || v_plz ELSE '' END,
            '/leads'
        );
        
        RAISE LOG '[AutoAssign] Lead % assigned to % (workload score: %)', NEW.id, v_best_rep, v_min_workload;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old trigger if exists, create new
DROP TRIGGER IF EXISTS trigger_auto_assign_lead ON leads;

CREATE TRIGGER trigger_auto_assign_lead
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_lead();

-- 3. Verify
SELECT 'Auto-assign trigger created successfully' AS status;
