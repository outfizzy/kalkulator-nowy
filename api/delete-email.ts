import type { VercelRequest, VercelResponse } from '@vercel/node';
import imaps from 'imap-simple';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { config, uid, box = 'INBOX' } = req.body;

    if (!config || !uid) {
        return res.status(400).json({ error: 'Missing config or UID' });
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

        // Add \Deleted flag to the message
        await connection.addFlags(uid.toString(), ['\\Deleted']);

        // Some servers require EXPUNGE to actually remove
        // But most move to Trash automatically with \Deleted flag
        // We'll try to move to Trash first, fall back to flag+expunge
        try {
            const boxes = await connection.getBoxes();
            const trashFolder = findTrashFolder(boxes);

            if (trashFolder) {
                // Move to trash (copy + delete from source)
                await connection.moveMessage(uid.toString(), trashFolder);
            } else {
                // No trash folder found — just expunge (permanent delete)
                await (connection as any).imap.expunge();
            }
        } catch (moveErr) {
            // Fallback: just expunge
            try {
                await (connection as any).imap.expunge();
            } catch { /* best effort */ }
        }

        connection.end();

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('IMAP Delete error:', error);
        return res.status(500).json({
            error: 'Failed to delete email',
            details: error.message
        });
    }
}

/**
 * Recursively search IMAP folder tree for a Trash folder.
 */
function findTrashFolder(boxes: any, prefix = ''): string | null {
    const trashKeywords = ['trash', 'papierkorb', 'kosz', 'deleted', 'deleted items', 'bin'];

    for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
        const fullPath = prefix ? `${prefix}${box.delimiter || '.'}${name}` : name;

        if (trashKeywords.some(kw => name.toLowerCase().includes(kw))) {
            return fullPath;
        }

        if (box.attribs && (
            box.attribs.includes('\\Trash') ||
            box.attribs.includes('\\trash') ||
            box.special_use_attrib === '\\Trash'
        )) {
            return fullPath;
        }

        if (box.children) {
            const found = findTrashFolder(box.children, fullPath);
            if (found) return found;
        }
    }

    return null;
}
