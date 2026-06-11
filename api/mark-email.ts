import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, uid, box = 'INBOX', action } = req.body;

    if (!config || !uid || !action) {
        return res.status(400).json({ error: 'Missing config, UID, or action' });
    }

    if (!['markRead', 'markUnread'].includes(action)) {
        return res.status(400).json({ error: 'Action must be markRead or markUnread' });
    }

    const { imapHost, imapPort, imapUser, imapPassword } = config;

    const imapConfig = {
        imap: {
            user: imapUser.trim(),
            password: imapPassword,
            host: imapHost.trim(),
            port: Number(imapPort),
            tls: Number(imapPort) === 993,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);
        // home.pl zrywa sockety po stronie serwera — bez handlera nieobsłużony
        // event 'error' ubija całą funkcję (HTTP 500)
        connection.on('error', (err: any) => console.warn('IMAP connection error (ignored):', err?.message));
        await connection.openBox(box);

        if (action === 'markRead') {
            await connection.addFlags(uid.toString(), ['\\Seen']);
        } else {
            await connection.delFlags(uid.toString(), ['\\Seen']);
        }

        connection.end();
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('IMAP Mark error:', error);
        return res.status(500).json({
            error: 'Failed to update email flags',
            details: error.message
        });
    }
}
