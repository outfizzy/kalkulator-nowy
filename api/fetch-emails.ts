import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';

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
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: Number(config.imapPort),
            tls: Number(config.imapPort) === 993,
            authTimeout: 5000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        const connection = await imaps.connect(imapConfig);

        // Open the requested mailbox
        if (box === 'INBOX') {
            await connection.openBox('INBOX');
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
                        await connection.openBox(sentFolder);
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
                        await connection.openBox(candidate);
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
            await connection.openBox(box);
        }

        // Build search criteria — filter by email address if provided
        let searchCriteria: any[];
        if (searchEmail) {
            searchCriteria = [['OR', ['FROM', searchEmail], ['TO', searchEmail]]];
        } else {
            searchCriteria = ['ALL'];
        }
        const fetchOptions = {
            bodies: ['HEADER'],
            struct: true,
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            connection.end();
            return res.status(200).json({ messages: [] });
        }

        // Sort by Date Descending
        const simplified = messages.map(msg => {
            const headerPart = msg.parts.find((part: any) => part.which === 'HEADER' || part.which.startsWith('HEADER'));
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
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        const finalMessages = simplified.map(msg => {
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
