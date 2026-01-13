-- Seed the Default Offer Template
-- Check if template exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Domyślna Oferta') THEN
        INSERT INTO email_templates (name, subject, body, category, is_active, variables)
        VALUES (
            'Domyślna Oferta',
            'Exklusiv für Sie vorbereitet: Angebot od Polendach',
            '<p>Exklusiv für Sie vorbereitet:</p><p>📄 <strong>Angebot {{offer_number}}</strong>: <a href="{{offer_link}}" target="_blank">Link zum Angebot</a></p><p>Bitte öffnen Sie die beigefügte PDF-Datei.<br>Das detaillierte Angebot finden Sie im Anhang dieser E-Mail.</p>',
            'Ofertowanie',
            true,
            '["offer_number", "offer_link"]'::jsonb
        );
    END IF;
END $$;
