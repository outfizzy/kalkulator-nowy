import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';
import { SimpleParser } from 'mailparser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') { // Using POST to securely pass credentials in body
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, box = 'INBOX', limit = 50 } = req.body;

    if (!config) {
        return res.status(400).json({ error: 'Missing configuration' });
    }

    const { imapHost, imapPort, imapUser, imapPassword } = config;

    if (!imapHost || !imapPort || !imapUser || !imapPassword) {
        return res.status(400).json({ error: 'Incomplete IMAP configuration' });
    }

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

        const searchCriteria = ['ALL'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false,
            struct: true // Need struct to parse parts if needed, but simple-parser does job mostly
        };

        // Fetch latest 'limit' messages
        // Since IMAP search returns IDs via search, we want the LAST ones (most recent)
        // imap-simple doesn't support 'limit' easily in search, so we search all and slice.
        // Optimization: search only recent? For MVP search ALL and slice last N is okay for small inboxes.
        // Better: searchCriteria = [['uid', '1:*']] or similar. 
        // Let's stick to default ALL and manually slice the array of messages.

        const messages = await connection.search(searchCriteria, fetchOptions);

        // Sort by date descending (newest first) and take limit
        const sortedMessages = messages.sort((a, b) => {
            const dateA = new Date(a.parts.find((p: any) => p.which === 'HEADER')?.body.date?.[0] || 0);
            const dateB = new Date(b.parts.find((p: any) => p.which === 'HEADER')?.body.date?.[0] || 0);
            return dateB.getTime() - dateA.getTime();
        }).slice(0, limit);

        const parsedMessages = sortedMessages.map(msg => {
            const headerPart = msg.parts.find((p: any) => p.which === 'HEADER');
            const bodyPart = msg.parts.find((p: any) => p.which === 'TEXT');

            return {
                id: msg.attributes.uid,
                seq: msg.seq,
                from: headerPart?.body.from?.[0] || 'Unknown',
                subject: headerPart?.body.subject?.[0] || '(No Subject)',
                date: headerPart?.body.date?.[0] || new Date().toISOString(),
                // Body needs parsing if MIME, currently just raw text for MVP check
                // For real HTML body we need 'mailparser' but that's heavy.
                // Let's return a snippet.
                flags: msg.attributes.flags
            };
        });

        connection.end();

        return res.status(200).json({ messages: parsedMessages });

    } catch (error: any) {
        console.error('IMAP Fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch emails',
            details: error.message
        });
    }
}
