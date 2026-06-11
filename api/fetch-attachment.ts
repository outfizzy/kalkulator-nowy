import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

// Fetches a single attachment on demand. /api/fetch-email-body omits the
// base64 content of attachments that would push the response over Vercel's
// ~4.5MB limit (content: null) — this endpoint serves them one at a time.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, box = 'INBOX', uid, partIndex, filename } = req.body;

    if (!config || !uid || typeof partIndex !== 'number') {
        return res.status(400).json({ error: 'Missing configuration, UID or partIndex' });
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
        // event 'error' ubija całą funkcję (HTTP 500) zamiast zwrócić dane
        connection.on('error', (err: any) => console.warn('IMAP connection error (ignored):', err?.message));

        if (box === 'INBOX') {
            await connection.openBox('INBOX');
        } else if (box === 'Sent') {
            const sentFolderCandidates = [
                'Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages',
                'INBOX.Sent Items', 'INBOX.Sent Messages',
                'Gesendet', 'INBOX.Gesendet',
                'Wysłane', 'INBOX.Wysłane',
                '[Gmail]/Sent Mail', '[Gmail]/Gesendet',
            ];

            let opened = false;

            try {
                const boxes = await connection.getBoxes();
                const sentFolder = findSentFolder(boxes);
                if (sentFolder) {
                    try {
                        await connection.openBox(sentFolder);
                        opened = true;
                    } catch { /* fall through to candidates */ }
                }
            } catch { /* fall through to candidates */ }

            if (!opened) {
                for (const candidate of sentFolderCandidates) {
                    try {
                        await connection.openBox(candidate);
                        opened = true;
                        break;
                    } catch { continue; }
                }
            }

            if (!opened) {
                connection.end();
                return res.status(404).json({ error: 'Could not find Sent folder on this mail server' });
            }
        } else {
            await connection.openBox(box);
        }

        const searchCriteria = [['UID', uid.toString()]];
        const fetchOptions = { bodies: [''], markSeen: false };

        // Zerwany socket = nierozstrzygnięty promise z search() — bez limitu
        // funkcja wisiałaby do timeoutu Vercela
        const messages: any[] = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('IMAP fetch timeout (25s) — serwer nie odpowiada')), 25000);
            connection.once('error', (err: any) => { clearTimeout(timer); reject(err); });
            connection.search(searchCriteria, fetchOptions).then(
                (r: any) => { clearTimeout(timer); resolve(r); },
                (e: any) => { clearTimeout(timer); reject(e); }
            );
        });

        if (!messages || messages.length === 0) {
            connection.end();
            return res.status(404).json({ error: 'Email not found' });
        }

        const rawBody = messages[0].parts.find((p: any) => p.which === '')?.body;
        if (!rawBody) {
            connection.end();
            return res.status(500).json({ error: 'Failed to retrieve message body' });
        }

        const parsed = await simpleParser(rawBody);
        try { connection.end(); } catch { /* serwer mógł już zamknąć socket */ }

        let att = parsed.attachments[partIndex];
        // Guard against parser/version drift: verify by filename when provided
        if (filename && att?.filename !== filename) {
            att = parsed.attachments.find(a => a.filename === filename) || att;
        }

        if (!att) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        if (att.size > 4 * 1024 * 1024) {
            return res.status(413).json({
                error: `Załącznik jest zbyt duży (${(att.size / 1048576).toFixed(1)} MB) — pobierz go bezpośrednio z klienta poczty.`
            });
        }

        return res.status(200).json({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            content: att.content.toString('base64')
        });

    } catch (error: any) {
        console.error('IMAP Fetch Attachment error:', error);
        return res.status(500).json({
            error: 'Failed to fetch attachment',
            details: error.message
        });
    }
}

/**
 * Recursively search IMAP folder tree for a "Sent" folder.
 */
function findSentFolder(boxes: any, prefix = ''): string | null {
    const sentKeywords = ['sent', 'gesendet', 'wysłane', 'sent items', 'sent messages', 'envoyé'];

    for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
        const fullPath = prefix ? `${prefix}${box.delimiter || '.'}${name}` : name;

        if (sentKeywords.some(kw => name.toLowerCase().includes(kw))) {
            return fullPath;
        }

        if (box.attribs && (
            box.attribs.includes('\\Sent') ||
            box.attribs.includes('\\sent') ||
            box.special_use_attrib === '\\Sent'
        )) {
            return fullPath;
        }

        if (box.children) {
            const found = findSentFolder(box.children, fullPath);
            if (found) return found;
        }
    }

    return null;
}
