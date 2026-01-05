import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';
// import { simpleParser } from 'mailparser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') { // Using POST to securely pass credentials in body
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, limit = 50, box = 'INBOX' } = req.body;

    if (!config || !config.imapHost || !config.imapUser || !config.imapPassword) {
        return res.status(400).json({ error: 'Missing IMAP configuration' });
    }

    const imapConfig = {
        imap: {
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: Number(config.imapPort),
            tls: Number(config.imapPort) === 993,
            authTimeout: 3000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);

        // Open box: try 'box' first
        try {
            await connection.openBox(box);
        } catch (e) {
            // Fallback for Sent folder naming differences
            if (box === 'Sent') {
                try {
                    await connection.openBox('Sent Items');
                } catch (e2) {
                    // Try Polish folder name? Home.pl often uses standard Sent but maybe mapped differently
                    // Just fail if primary and secondary fail, or try 'Wysłane'
                    await connection.openBox('Wysłane');
                }
            } else {
                throw e;
            }
        }

        const searchCriteria = ['ALL'];
        // Optimal Fetch: Get structure and header, avoid full body scan for list
        const fetchOptions = {
            bodies: ['HEADER'],
            struct: true,
            markSeen: false
        };

        // Fetch ALL messages (Robustness > Performance for MVP)
        // Note: For very large inboxes this is slow, but guarantees we get the actual latest messages regardless of UID gaps.
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            connection.end();
            return res.status(200).json({ messages: [] });
        }

        // Sort by Date Descending
        const simplified = messages.map(msg => {
            const headerPart = msg.parts.find((part: any) => part.which === 'HEADER' || part.which.startsWith('HEADER'));
            // Safety check for date
            const dateStr = headerPart?.body.date?.[0];
            const date = dateStr ? new Date(dateStr) : new Date();

            return {
                id: msg.attributes.uid,
                subject: headerPart?.body.subject?.[0] || '(No Subject)',
                from: headerPart?.body.from?.[0] || 'Unknown',
                to: headerPart?.body.to?.[0] || 'Unknown',
                date: date.toISOString(),
                hasAttachment: false,
                flags: msg.attributes.flags || [],
                timestamp: date.getTime()
            };
        })
            .sort((a, b) => b.timestamp - a.timestamp) // Newest first
            .slice(0, limit); // Take top N

        // Remove timestamp helper before sending
        const finalMessages = simplified.map(msg => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { timestamp, ...rest } = msg;
            return rest;
        });

        connection.end();
        return res.status(200).json({ messages: finalMessages });

    } catch (error: any) {
        console.error('IMAP Fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch emails',
            details: error.message
        });
    }
}
