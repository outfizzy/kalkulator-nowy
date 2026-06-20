-- Migration: 20260619120000_contract_numbering_brand.sql
-- Description: Numeracja umów per marka. get_next_contract_number(p_prefix) generuje
--   'UM/YYYY/NNN' dla Polendach24 (DE, domyślnie) oraz 'ZAD/YYYY/NNN' dla zadaszto.pl (PL).
--   Linia ZAD jest liczona NIEZALEŻNIE od UM. Numeracja DE zachowuje dotychczasowe
--   zachowanie (liczy wszystkie numery z roku, z wyłączeniem nowej linii ZAD), więc
--   istniejące umowy DE nie zmieniają kolejności.
--   Zgodność wstecz: stary, bezargumentowy odczyt RPC nadal działa (DEFAULT 'UM').

-- Usuń stare warianty, by uniknąć niejednoznaczności przeciążeń w PostgREST
DROP FUNCTION IF EXISTS get_next_contract_number();
DROP FUNCTION IF EXISTS get_next_contract_number(text);

CREATE FUNCTION get_next_contract_number(p_prefix text DEFAULT 'UM')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- uruchamiane jako właściciel: dostęp do app_settings i contracts
AS $$
DECLARE
    year_prefix     text;
    next_seq        integer;
    start_seq       integer;
    current_max_seq integer;
    eff_prefix      text;
BEGIN
    eff_prefix := COALESCE(NULLIF(trim(p_prefix), ''), 'UM');
    year_prefix := to_char(now(), 'YYYY');

    -- Numer startowy z ustawień dotyczy wyłącznie domyślnej numeracji UM (DE).
    IF eff_prefix = 'UM' THEN
        SELECT (value->>'start')::int INTO start_seq
        FROM app_settings
        WHERE key = 'contract_number_start';
    END IF;
    IF start_seq IS NULL THEN
        start_seq := 1;
    END IF;

    -- Maksymalna sekwencja dla bieżącego roku i danej linii numeracji.
    IF eff_prefix = 'UM' THEN
        -- DE: jak dotychczas — wszystkie numery z roku, ale BEZ linii ZAD.
        SELECT MAX(NULLIF(regexp_replace(contract_data->>'contractNumber', '.*\/(\d+)$', '\1'), '')::int)
        INTO current_max_seq
        FROM contracts
        WHERE contract_data->>'contractNumber' LIKE '%/' || year_prefix || '/%'
          AND contract_data->>'contractNumber' NOT LIKE 'ZAD/%';
    ELSE
        -- Pozostałe marki (np. ZAD): osobna, niezależna sekwencja per prefiks.
        SELECT MAX(NULLIF(regexp_replace(contract_data->>'contractNumber', '.*\/(\d+)$', '\1'), '')::int)
        INTO current_max_seq
        FROM contracts
        WHERE contract_data->>'contractNumber' LIKE eff_prefix || '/' || year_prefix || '/%';
    END IF;

    IF current_max_seq IS NULL THEN
        next_seq := start_seq;
    ELSE
        next_seq := GREATEST(current_max_seq + 1, start_seq);
    END IF;

    RETURN eff_prefix || '/' || year_prefix || '/' || lpad(next_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_contract_number(text) TO authenticated;
