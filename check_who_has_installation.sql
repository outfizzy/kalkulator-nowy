-- Sprawdzenie do kogo przypisano montaże
SELECT 
    i.id as installation_id,
    i.scheduled_date,
    u.email as assigned_user_email,
    p.full_name as assigned_user_name
FROM installation_assignments ia
JOIN installations i ON i.id = ia.installation_id
JOIN auth.users u ON u.id = ia.user_id
JOIN profiles p ON p.id = ia.user_id;
