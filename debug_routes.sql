-- Sprawdź pomiary i ich trasy dla Mike Ledwin na 12.02.2026

-- 1. Sprawdź pomiary
SELECT 
    id,
    customer_name,
    customer_address,
    scheduled_date,
    location_lat,
    location_lng,
    route_id
FROM measurements
WHERE scheduled_date >= '2026-02-12' 
  AND scheduled_date < '2026-02-13'
  AND sales_rep_name = 'Mike Ledwin'
ORDER BY order_in_route;

-- 2. Sprawdź czy mają trasy
SELECT 
    m.id as measurement_id,
    m.customer_name,
    m.location_lat,
    m.location_lng,
    m.route_id,
    r.id as route_exists,
    r.distance_km,
    r.route_polyline IS NOT NULL as has_polyline
FROM measurements m
LEFT JOIN measurement_routes r ON m.route_id = r.id
WHERE m.scheduled_date >= '2026-02-12' 
  AND m.scheduled_date < '2026-02-13'
  AND m.sales_rep_name = 'Mike Ledwin';

-- 3. Jeśli brakuje tras, trzeba je przeliczyć
-- Dla każdego pomiaru bez trasy uruchom:
-- SELECT * FROM measurements WHERE route_id IS NULL AND scheduled_date >= CURRENT_DATE;
