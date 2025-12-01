-- Sprawdzenie czy są jakieś montaże i przypisania (Poprawiony)
SELECT 
    i.id as installation_id,
    i.scheduled_date,
    i.status,
    ia.user_id as assigned_installer_id,
    p.full_name as installer_name
FROM installations i
LEFT JOIN installation_assignments ia ON ia.installation_id = i.id
LEFT JOIN profiles p ON p.id = ia.user_id;

-- Sprawdzenie czy w ogóle są jakieś montaże
SELECT count(*) as total_installations FROM installations;
