-- Publiczny formularz /reklamation działa jako anon. Tabele contracts/customers/
-- installations mają RLS, które anonom nie zwraca nic — więc weryfikacja kontraktu
-- z przeglądarki była niemożliwa (do tego stary kod pytał o nieistniejącą kolumnę
-- contracts.contract_number). Ta funkcja SECURITY DEFINER robi dopasowanie
-- server-side (numer kontraktu z contract_data JSONB + e-mail klienta) i zwraca
-- TYLKO minimum potrzebne do założenia zgłoszenia — bez wystawiania całej tabeli.
CREATE OR REPLACE FUNCTION public.verify_service_contract(p_contract_number text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_offer_id uuid;
  v_data jsonb;
  v_contract_email text;
  v_customer_id uuid;
  v_installation_id uuid;
BEGIN
  IF coalesce(btrim(p_contract_number), '') = '' OR coalesce(btrim(p_email), '') = '' THEN
    RETURN jsonb_build_object('verified', false, 'error', 'Missing data');
  END IF;

  SELECT id, offer_id, contract_data
    INTO v_id, v_offer_id, v_data
  FROM contracts
  WHERE contract_data->>'contractNumber' = btrim(p_contract_number)
     OR contract_data->>'contract_number' = btrim(p_contract_number)
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('verified', false, 'error', 'Contract not found');
  END IF;

  v_contract_email := lower(btrim(coalesce(
    v_data->'client'->>'email',
    v_data->>'clientEmail',
    v_data->>'email', '')));

  -- E-mail musi należeć do TEGO kontraktu (ochrona przed zgłoszeniem na cudzy kontrakt)
  IF v_contract_email = '' OR v_contract_email <> lower(btrim(p_email)) THEN
    RETURN jsonb_build_object('verified', false, 'error', 'Email does not match contract');
  END IF;

  SELECT id INTO v_customer_id FROM customers WHERE lower(email) = lower(btrim(p_email)) LIMIT 1;

  IF v_offer_id IS NOT NULL THEN
    SELECT id INTO v_installation_id FROM installations WHERE offer_id = v_offer_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'verified', true,
    'contractId', v_id,
    'clientId', v_customer_id,
    'installationId', v_installation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_service_contract(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_service_contract(text, text) TO anon, authenticated;
