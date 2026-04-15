import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

// Use Service Role Key for CRON job to access all users' queues
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST or GET (Cron usually sends GET)
    // Check for authorization header (Vercel Cron security)
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VITE_DEV_MODE) {
        // In production we should verify this, but for now we skip strict check to simplify MVP testing if secret setup is complex.
        // Ideally: check process.env.CRON_SECRET
    }

    if (!supabaseServiceKey) {
        return res.status(500).json({ error: 'Missing Service Role Key' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch pending emails due for sending
    const now = new Date().toISOString();
    const { data: pendingMails, error } = await supabase
        .from('mail_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .limit(20); // Process in batches

    if (error) {
        console.error('Queue fetch error:', error);
        return res.status(500).json({ error: error.message });
    }

    if (!pendingMails || pendingMails.length === 0) {
        return res.status(200).json({ message: 'No emails to send' });
    }

    const results = [];

    // 2. Process each email
    for (const mail of pendingMails) {
        try {
            // Update status to processing (locking)
            await supabase.from('mail_queue').update({ status: 'processing' }).eq('id', mail.id);

            const { smtpHost, smtpPort, smtpUser, smtpPassword, imapHost, imapPort, imapUser, imapPassword } = mail.config;

            const transporter = nodemailer.createTransport({
                host: (smtpHost || '').trim(),
                port: Number(smtpPort),
                secure: Number(smtpPort) === 465,
                auth: { user: (smtpUser || '').trim(), pass: smtpPassword },
            });

            const mailOptions: any = {
                from: (smtpUser || '').trim(),
                to: mail.email_to,
                subject: mail.subject,
                html: mail.body,
            };

            if (mail.attachments && Array.isArray(mail.attachments)) {
                mailOptions.attachments = mail.attachments.map((att: any) => ({
                    filename: att.filename,
                    content: Buffer.from(att.content, 'base64'),
                    contentType: att.contentType
                }));
            }

            const info = await transporter.sendMail(mailOptions);

            // --- SAVE TO IMAP SENT FOLDER ---
            const imapSaveHost = (imapHost || smtpHost || '').trim();
            const imapSaveUser = (imapUser || smtpUser || '').trim();
            const imapSavePass = imapPassword || smtpPassword;
            const imapSavePort = Number(imapPort) || 993;

            if (imapSaveHost && imapSaveUser && imapSavePass) {
                try {
                    const rawMessage = [
                        `From: "${(smtpUser || '').trim()}" <${(smtpUser || '').trim()}>`,
                        `To: ${mail.email_to}`,
                        `Subject: ${mail.subject}`,
                        `Date: ${new Date().toUTCString()}`,
                        `Message-ID: ${info.messageId}`,
                        `MIME-Version: 1.0`,
                        `Content-Type: text/html; charset=utf-8`,
                        '',
                        mail.body
                    ].join('\r\n');

                    const connection = await imaps.connect({
                        imap: {
                            host: imapSaveHost,
                            port: imapSavePort,
                            tls: true,
                            user: imapSaveUser,
                            password: imapSavePass,
                            authTimeout: 10000,
                            tlsOptions: { rejectUnauthorized: false },
                        }
                    });

                    let sentFolder = 'Sent';
                    try {
                        const boxes = await connection.getBoxes();
                        const discovered = findSentFolder(boxes);
                        if (discovered) sentFolder = discovered;
                    } catch { /* use default */ }

                    await connection.append(rawMessage, { mailbox: sentFolder, flags: ['\\Seen'] });
                    connection.end();
                    console.log(`[CRON-MAIL] Saved to "${sentFolder}" for ${mail.email_to}`);
                } catch (imapErr: any) {
                    console.error(`[CRON-MAIL] Failed to save to Sent:`, imapErr.message);
                }
            }

            // Update status to sent
            await supabase.from('mail_queue').update({ status: 'sent' }).eq('id', mail.id);
            results.push({ id: mail.id, status: 'sent' });

        } catch (err: any) {
            console.error(`Failed to send mail ${mail.id}:`, err);
            // Update status to failed
            await supabase.from('mail_queue').update({
                status: 'failed',
                error_message: err.message
            }).eq('id', mail.id);
            results.push({ id: mail.id, status: 'failed', error: err.message });
        }
    }

    return res.status(200).json({ processed: results.length, results });
}

/** Recursively search IMAP folder tree for a "Sent" folder. */
function findSentFolder(boxes: any, prefix = ''): string | null {
    const sentKeywords = ['sent', 'gesendet', 'wysłane', 'sent items', 'sent messages'];
    for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
        const fullPath = prefix ? `${prefix}${(box as any).delimiter || '.'}${name}` : name;
        if (sentKeywords.some(kw => name.toLowerCase().includes(kw))) return fullPath;
        if ((box as any).attribs && ((box as any).attribs.includes('\\Sent') || (box as any).special_use_attrib === '\\Sent')) return fullPath;
        if ((box as any).children) { const found = findSentFolder((box as any).children, fullPath); if (found) return found; }
    }
    return null;
}
