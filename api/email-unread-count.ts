import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';

/**
 * Lightweight endpoint that returns the count of UNSEEN emails in INBOX.
 * Used for the sidebar badge. Minimal overhead — no message bodies fetched.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config } = req.body;

    if (!config || !config.imapHost || !config.imapUser || !config.imapPassword) {
        return res.status(400).json({ error: 'Missing IMAP configuration', count: 0 });
    }

    const imapConfig = {
        imap: {
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: Number(config.imapPort) || 993,
            tls: Number(config.imapPort) === 993,
            authTimeout: 5000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);
        await connection.openBox('INBOX');

        // SEARCH UNSEEN — returns only UIDs, no message bodies
        const messages = await connection.search(['UNSEEN'], { bodies: [], markSeen: false });
        const count = messages.length;

        connection.end();
        return res.status(200).json({ count });

    } catch (error: any) {
        console.error('IMAP unread count error:', error);
        return res.status(200).json({ count: 0, error: error.message });
    }
}
