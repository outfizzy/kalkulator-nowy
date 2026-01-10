-- CLEANUP: Delete duplicate product definitions, prioritizing configured ones.
-- This removes the "Ghost" records causing the calculator to load empty data randomly.

WITH RankedProducts AS (
    SELECT 
        id,
        code,
        name,
        configuration,
        standard_colors,
        ROW_NUMBER() OVER (
            PARTITION BY code 
            ORDER BY 
                -- Priority 1: Has Configuration (Freestanding, Rules)
                (configuration IS NOT NULL AND configuration::text != '{}'::text AND configuration::text != 'null'::text) DESC,
                -- Priority 2: Has Standard Colors
                (standard_colors IS NOT NULL AND array_length(standard_colors, 1) > 0) DESC,
                -- Priority 3: Newest First
                created_at DESC
        ) as rank
    FROM product_definitions
    WHERE code IS NOT NULL AND code != ''
)
DELETE FROM product_definitions
WHERE id IN (
    SELECT id FROM RankedProducts WHERE rank > 1
);

-- Also clean up by NAME just in case code is inconsistent
WITH RankedProductsByName AS (
    SELECT 
        id,
        name,
        code,
        configuration,
        ROW_NUMBER() OVER (
            PARTITION BY name 
            ORDER BY 
                (configuration IS NOT NULL AND configuration::text != '{}'::text) DESC,
                created_at DESC
        ) as rank
    FROM product_definitions
    WHERE (code IS NULL OR code = '') AND name IS NOT NULL
)
DELETE FROM product_definitions
WHERE id IN (
    SELECT id FROM RankedProductsByName WHERE rank > 1
);
