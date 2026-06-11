import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cron (vercel.json): co 15 min uruchamia edge function scan-emails w trybie auto
// (IMAP UNSEEN → klasyfikacja GPT → lead/ticket/odpowiedź). Wcześniej skan działał
// wyłącznie po ręcznym kliknięciu w MailPage, więc leady z maili czekały na człowieka.
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!serviceKey) {
        return res.status(500).json({ error: 'Missing Service Role Key' });
    }

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/scan-emails`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey,
            },
            // Mały batch — resztę dokończą kolejne przebiegi crona; chroni przed
            // timeoutem edge function przy wolnym IMAP (home.pl)
            body: JSON.stringify({ batchSize: 10, days: 0 }),
        });
        const result = await response.json().catch(() => ({}));
        console.log('[cron/scan-emails]', response.status, JSON.stringify(result).substring(0, 500));
        return res.status(200).json({ ok: response.ok, ...result });
    } catch (e: any) {
        console.error('[cron/scan-emails] error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
