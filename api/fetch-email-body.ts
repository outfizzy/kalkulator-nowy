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

        // Open box with auto-discovery for Sent folder
        console.log(`[DEBUG] Opening box: ${box} for UID: ${uid}`);
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

            // Try auto-discovery first
            try {
                const boxes = await connection.getBoxes();
                const sentFolder = findSentFolder(boxes);
                if (sentFolder) {
                    try {
                        await connection.openBox(sentFolder);
                        opened = true;
                        console.log(`[DEBUG] Opened sent folder via discovery: "${sentFolder}"`);
                    } catch (e) {
                        console.warn(`[DEBUG] Discovery found "${sentFolder}" but failed to open`);
                    }
                }
            } catch (listErr) {
                console.warn('[DEBUG] Could not list boxes for discovery');
            }

            // Brute-force fallback
            if (!opened) {
                for (const candidate of sentFolderCandidates) {
                    try {
                        await connection.openBox(candidate);
                        opened = true;
                        console.log(`[DEBUG] Opened sent folder: "${candidate}"`);
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
        const fetchOptions = {
            bodies: [''],
            markSeen: true
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

        const parsed = await simpleParser(rawBody);

        const attachments = parsed.attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            contentId: att.contentId,
            content: att.content.toString('base64')
        }));

        connection.end();

        return res.status(200).json({
            id: msg.attributes.uid,
            subject: parsed.subject,
            from: Array.isArray(parsed.from) ? parsed.from.map(a => a.text).join(', ') : parsed.from?.text,
            to: Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : parsed.to?.text,
            date: parsed.date,
            text: parsed.text,
            html: parsed.html || parsed.textAsHtml,
            attachments: attachments
        });

    } catch (error: any) {
        console.error('IMAP Fetch Body error:', error);
        return res.status(500).json({
            error: 'Failed to fetch email body',
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
