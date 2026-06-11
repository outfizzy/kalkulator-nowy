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

        const msg = messages[0];
        const rawBody = msg.parts.find((p: any) => p.which === '')?.body;

        if (!rawBody) {
            connection.end();
            return res.status(500).json({ error: 'Failed to retrieve message body' });
        }

        const parsed = await simpleParser(rawBody);

        // Vercel serverless caps the response at ~4.5MB — anything above that
        // and the email never loads at all, so budget what we inline/attach
        const RESPONSE_BUDGET = 3 * 1024 * 1024;
        let usedBudget = 0;

        // Inline images (cid: references) → data URIs, otherwise they render broken
        let html = parsed.html || parsed.textAsHtml || undefined;
        const inlinedCids = new Set<string>();
        if (html) {
            usedBudget += html.length;
            for (const att of parsed.attachments) {
                if (!att.contentId) continue;
                const cid = att.contentId.replace(/[<>]/g, '');
                if (!html.includes(`cid:${cid}`)) continue;
                const base64 = att.content.toString('base64');
                if (usedBudget + base64.length > RESPONSE_BUDGET) continue;
                html = html.split(`cid:${cid}`).join(`data:${att.contentType};base64,${base64}`);
                usedBudget += base64.length;
                inlinedCids.add(cid);
            }
        }

        // partIndex lets /api/fetch-attachment re-locate an attachment whose
        // content didn't fit the budget (content: null → fetched on demand)
        const attachments = parsed.attachments
            .map((att, partIndex) => ({ att, partIndex }))
            .filter(({ att }) => !(att.contentId && inlinedCids.has(att.contentId.replace(/[<>]/g, ''))))
            .map(({ att, partIndex }) => {
                const base64Size = Math.ceil(att.size * 1.37);
                const fits = usedBudget + base64Size <= RESPONSE_BUDGET;
                if (fits) usedBudget += base64Size;
                return {
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    contentId: att.contentId,
                    partIndex,
                    content: fits ? att.content.toString('base64') : null
                };
            });

        try { connection.end(); } catch { /* serwer mógł już zamknąć socket */ }

        return res.status(200).json({
            id: msg.attributes.uid,
            subject: parsed.subject,
            from: Array.isArray(parsed.from) ? parsed.from.map(a => a.text).join(', ') : parsed.from?.text,
            to: Array.isArray(parsed.to) ? parsed.to.map(a => a.text).join(', ') : parsed.to?.text,
            date: parsed.date,
            text: parsed.text,
            html,
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
