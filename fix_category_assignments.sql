DO $$
DECLARE
  v_lighting_product_id uuid;
  v_flooring_product_id uuid;
  v_count integer;
BEGIN
  RAISE NOTICE 'Rozpoczynam naprawę przypisań kategorii...';

  -- 1. OŚWIETLENIE (Kategoria: accessory)
  SELECT id INTO v_lighting_product_id FROM product_definitions WHERE code = 'oswietlenie_ogrzewanie' LIMIT 1;
  
  IF v_lighting_product_id IS NULL THEN
      INSERT INTO product_definitions (name, code, category, provider, description)
      VALUES ('Oświetlenie i Ogrzewanie', 'oswietlenie_ogrzewanie', 'accessory', 'Inny', 'Kategoria grupująca opcje oświetlenia i ogrzewania')
      RETURNING id INTO v_lighting_product_id;
      RAISE NOTICE 'Utworzono produkt: Oświetlenie i Ogrzewanie';
  END IF;

  UPDATE price_tables
  SET product_definition_id = v_lighting_product_id
  WHERE name ILIKE '%Oświetlenie%'
  AND product_definition_id IS DISTINCT FROM v_lighting_product_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Zaktualizowano % tabel oświetlenia', v_count;


  -- 2. PODŁOGI (Kategoria: other)
  SELECT id INTO v_flooring_product_id FROM product_definitions WHERE code = 'systemy_podlogowe' LIMIT 1;
  
  IF v_flooring_product_id IS NULL THEN
      INSERT INTO product_definitions (name, code, category, provider, description)
      VALUES ('Systemy Podłogowe', 'systemy_podlogowe', 'other', 'Inny', 'Kategoria grupująca systemy podłogowe WPC')
      RETURNING id INTO v_flooring_product_id;
      RAISE NOTICE 'Utworzono produkt: Systemy Podłogowe';
  END IF;

  UPDATE price_tables
  SET product_definition_id = v_flooring_product_id
  WHERE name ILIKE '%Podłoga WPC%'
  AND product_definition_id IS DISTINCT FROM v_flooring_product_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Zaktualizowano % tabel podłogowych', v_count;
END $$;
