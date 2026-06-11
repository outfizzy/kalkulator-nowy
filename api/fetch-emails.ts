import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';
import libmime from 'libmime';

// Decode MIME encoded-words (=?UTF-8?B?...?=) in headers — raw values
// otherwise show up as gibberish in the list for PL/DE characters
function decodeHeader(value?: string): string {
    if (!value) return '';
    try {
        return libmime.decodeWords(value);
    } catch {
        return value;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, limit = 50, box = 'INBOX', searchEmail } = req.body;

    if (!config || !config.imapHost || !config.imapUser || !config.imapPassword) {
        return res.status(400).json({ error: 'Missing IMAP configuration' });
    }

    const imapConfig = {
        imap: {
            user: config.imapUser.trim(),
            password: config.imapPassword,
            host: config.imapHost.trim(),
            port: Number(config.imapPort),
            tls: Number(config.imapPort) === 993,
            authTimeout: 5000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);
        // home.pl zrywa sockety po stronie serwera — bez handlera nieobsłużony
        // event 'error' ubija całą funkcję (HTTP 500) zamiast zwrócić dane
        connection.on('error', (err: any) => console.warn('IMAP connection error (ignored):', err?.message));

        // Open the requested mailbox (keep the box object — uidnext bounds the search)
        let openedBox: any = null;
        if (box === 'INBOX') {
            openedBox = await connection.openBox('INBOX');
        } else if (box === 'Sent') {
            // Auto-discover sent folder — IMAP servers use many different names
            const sentFolderCandidates = [
                'Sent',
                'INBOX.Sent',
                'Sent Items',
                'Sent Messages',
                'INBOX.Sent Items',
                'INBOX.Sent Messages',
                'Gesendet',
                'INBOX.Gesendet',
                'Wysłane',
                'INBOX.Wysłane',
                '[Gmail]/Sent Mail',
                '[Gmail]/Gesendet',
            ];

            let opened = false;

            // First try listing all folders to find the right one
            try {
                const boxes = await connection.getBoxes();
                const sentFolder = findSentFolder(boxes);
                if (sentFolder) {
                    try {
                        openedBox = await connection.openBox(sentFolder);
                        opened = true;
                        console.log(`Opened sent folder via discovery: "${sentFolder}"`);
                    } catch (e) {
                        console.warn(`Discovery found "${sentFolder}" but failed to open:`, e);
                    }
                }
            } catch (listErr) {
                console.warn('Could not list boxes for sent folder discovery:', listErr);
            }

            // Fall back to brute-force trying known names
            if (!opened) {
                for (const candidate of sentFolderCandidates) {
                    try {
                        openedBox = await connection.openBox(candidate);
                        opened = true;
                        console.log(`Opened sent folder: "${candidate}"`);
                        break;
                    } catch (e) {
                        // Try next candidate
                        continue;
                    }
                }
            }

            if (!opened) {
                connection.end();
                return res.status(200).json({
                    messages: [],
                    warning: 'Could not find Sent folder. Tried: ' + sentFolderCandidates.join(', ')
                });
            }
        } else {
            // Custom folder name passed directly
            openedBox = await connection.openBox(box);
        }

        // Build search criteria — filter by email address if provided
        let searchCriteria: any[];
        if (searchEmail) {
            searchCriteria = [['OR', ['FROM', searchEmail], ['TO', searchEmail]]];
        } else if (openedBox?.uidnext && openedBox.uidnext > 1) {
            // Only the most recent UIDs — SEARCH ALL pulled headers of the whole
            // mailbox on every 60s poll, which made big inboxes load for ages
            const windowStart = Math.max(1, openedBox.uidnext - Math.max(500, limit * 3));
            searchCriteria = [['UID', `${windowStart}:*`]];
        } else {
            searchCriteria = ['ALL'];
        }
        const fetchOptions = {
            // Tylko potrzebne pola — pełny HEADER (DKIM, Received...) to ~10x więcej
            // transferu i zauważalnie wolniejsze ładowanie listy
            bodies: ['HEADER.FIELDS (FROM TO CC SUBJECT DATE REPLY-TO)'],
            struct: true,
            markSeen: false
        };

        // Gdy home.pl ubije socket w trakcie FETCH, promise z search() nigdy się nie
        // rozstrzyga — funkcja wisiałaby do timeoutu Vercela. Twardy limit + nasłuch
        // na zerwanie połączenia zamieniają to w czysty błąd.
        const messages: any[] = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('IMAP search timeout (25s) — serwer nie odpowiada')), 25000);
            connection.once('error', (err: any) => { clearTimeout(timer); reject(err); });
            connection.search(searchCriteria, fetchOptions).then(
                (r: any) => { clearTimeout(timer); resolve(r); },
                (e: any) => { clearTimeout(timer); reject(e); }
            );
        });

        if (messages.length === 0) {
            connection.end();
            return res.status(200).json({ messages: [] });
        }

        // Sort by Date Descending
        const simplified = messages.map(msg => {
            const headerPart = msg.parts.find((part: any) => part.which === 'HEADER' || part.which.startsWith('HEADER'));
            const dateStr = headerPart?.body.date?.[0];
            // A malformed Date header must not 500 the whole list
            // (Invalid Date.toISOString() throws) — fall back to IMAP internal date
            let date = dateStr ? new Date(dateStr) : null;
            if (!date || isNaN(date.getTime())) {
                const internal = (msg.attributes as any)?.date;
                date = internal ? new Date(internal) : new Date();
            }
            if (isNaN(date.getTime())) date = new Date();

            // Detect attachments from IMAP struct
            let hasAttachments = false;
            try {
                const struct = msg.attributes.struct;
                if (struct) {
                    hasAttachments = checkForAttachments(struct);
                }
            } catch { /* ignore */ }

            return {
                id: msg.attributes.uid,
                subject: decodeHeader(headerPart?.body.subject?.[0]) || '(Brak tematu)',
                from: decodeHeader(headerPart?.body.from?.[0]) || 'Nieznany',
                to: decodeHeader(headerPart?.body.to?.[0]) || '',
                cc: decodeHeader(headerPart?.body.cc?.[0]) || '',
                replyTo: decodeHeader(headerPart?.body['reply-to']?.[0]) || '',
                date: date.toISOString(),
                hasAttachments,
                flags: msg.attributes.flags || [],
                timestamp: date.getTime()
            };
        })
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        const finalMessages = simplified.map(msg => {
            const { timestamp, ...rest } = msg;
            return rest;
        });

        try { connection.end(); } catch { /* serwer mógł już zamknąć socket */ }
        return res.status(200).json({ messages: finalMessages });

    } catch (error: any) {
        console.error('IMAP Fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch emails',
            details: error.message
        });
    }
}

/**
 * Recursively search IMAP folder tree for a "Sent" folder.
 * Returns the full path (e.g. "INBOX.Sent") or null.
 */
function findSentFolder(boxes: any, prefix = ''): string | null {
    const sentKeywords = ['sent', 'gesendet', 'wysłane', 'sent items', 'sent messages', 'envoyé'];

    for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
        const fullPath = prefix ? `${prefix}${box.delimiter || '.'}${name}` : name;

        // Check if this folder name matches known sent folder patterns
        if (sentKeywords.some(kw => name.toLowerCase().includes(kw))) {
            return fullPath;
        }

        // Check special-use attribute (RFC 6154) — some IMAP servers mark Sent with \Sent
        if (box.attribs && (
            box.attribs.includes('\\Sent') ||
            box.attribs.includes('\\sent') ||
            box.special_use_attrib === '\\Sent'
        )) {
            return fullPath;
        }

        // Recurse into child folders
        if (box.children) {
            const found = findSentFolder(box.children, fullPath);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Recursively check IMAP struct for attachment parts.
 * IMAP struct is nested arrays: [{type, subtype, disposition, ...}, [...children]]
 */
function checkForAttachments(struct: any): boolean {
    if (!struct) return false;
    if (Array.isArray(struct)) {
        for (const part of struct) {
            if (Array.isArray(part)) {
                if (checkForAttachments(part)) return true;
            } else if (part && typeof part === 'object') {
                // Check disposition for 'attachment' or 'inline' with a filename
                const disp = part.disposition;
                if (disp) {
                    const dispType = disp.type?.toLowerCase?.() || (typeof disp === 'string' ? disp.toLowerCase() : '');
                    if (dispType === 'attachment') return true;
                    if (dispType === 'inline' && disp.params?.filename) return true;
                }
                // Also check if it's a non-text, non-multipart part (binary attachment)
                const type = part.type?.toLowerCase?.();
                const subtype = part.subtype?.toLowerCase?.();
                if (type && type !== 'text' && type !== 'multipart') {
                    // Application, image, audio, video = likely attachment
                    if (['application', 'image', 'audio', 'video'].includes(type)) return true;
                }
            }
        }
    }
    return false;
}
