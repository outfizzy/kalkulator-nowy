import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, box = 'INBOX', uid } = req.body;

    if (!config || !uid) {
        return res.status(400).json({ error: 'Missing configuration or UID' });
    }

    const { imapHost, imapPort, imapUser, imapPassword } = config;

    const imapConfig = {
        imap: {
            user: imapUser,
            password: imapPassword,
            host: imapHost,
            port: Number(imapPort),
            tls: Number(imapPort) === 993,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);
        await connection.openBox(box);

        const searchCriteria = [['UID', uid.toString()]];
        const fetchOptions = {
            bodies: [''], // Empty string fetches the entire raw message for parsing
            markSeen: true // Mark as read when opening details
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (!messages || messages.length === 0) {
            connection.end();
            return res.status(404).json({ error: 'Email not found' });
        }

        const msg = messages[0];
        const rawBody = msg.parts.find((p: any) => p.which === '')?.body;

        if (!rawBody) {
            connection.end();
            return res.status(500).json({ error: 'Failed to retrieve message body' });
        }

        // Parse the raw email
        const parsed = await simpleParser(rawBody);

        connection.end();

        return res.status(200).json({
            id: msg.attributes.uid,
            subject: parsed.subject,
            from: parsed.from?.text,
            to: parsed.to?.text,
            date: parsed.date,
            text: parsed.text,
            html: parsed.html || parsed.textAsHtml // Fallback to textAsHtml if no HTML part
        });

    } catch (error: any) {
        console.error('IMAP Fetch Body error:', error);
        return res.status(500).json({
            error: 'Failed to fetch email body',
            details: error.message
        });
    }
}
