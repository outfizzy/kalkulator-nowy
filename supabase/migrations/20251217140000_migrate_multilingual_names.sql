
-- Migration to split multilingual names in price_matrix_entries
-- Logic: If name matches format "Polish Name (German Name)", split it.
-- Otherwise, set both name_pl and name_de to the original name.

DO $$
DECLARE
    r RECORD;
    v_name TEXT;
    v_name_pl TEXT;
    v_name_de TEXT;
    v_new_props JSONB;
BEGIN
    FOR r IN SELECT id, properties FROM price_matrix_entries WHERE properties ? 'name' LOOP
        v_name := r.properties->>'name';
        
        -- Check if name looks like "Something (Etwas)"
        -- Regex: Any chars, space, open paren, any chars, close paren at end
        IF v_name ~ '.+\s\(.+\)$' THEN
            -- Extract PL (before " (")
            v_name_pl := trim(substring(v_name from '^(.*)\s\('));
            -- Extract DE (inside parens)
            v_name_de := trim(substring(v_name from '\((.*)\)$'));
        ELSE
            -- Fallback
            v_name_pl := v_name;
            v_name_de := v_name;
        END IF;

        -- Update properties
        v_new_props := r.properties || 
                       jsonb_build_object('name_pl', v_name_pl, 'name_de', v_name_de);

        UPDATE price_matrix_entries 
        SET properties = v_new_props 
        WHERE id = r.id;
        
    END LOOP;
END $$;
