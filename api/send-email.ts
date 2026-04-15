import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import imaps from 'imap-simple';

// Initialize Supabase Client (safe for Vercel Functions)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        userId,
        to,
        cc,
        bcc,
        subject,
        body,
        config,
        attachments,
        scheduledAt,
        useSharedConfig,
        saveToSent,
        leadId,
        customerId
    } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- SCHEDULING LOGIC ---
    if (scheduledAt) {
        const { error } = await supabase
            .from('mail_queue')
            .insert({
                user_id: userId,
                to_address: to,
                subject,
                body,
                attachments: attachments || [],
                scheduled_at: scheduledAt,
                status: 'pending',
                config: config, // We store the config used at scheduling time
                metadata: {
                    useSharedConfig, // Store preference
                    leadId,
                    customerId
                }
            });

        if (error) {
            console.error('Queue Error:', error);
            return res.status(500).json({ error: 'Failed to schedule email' });
        }

        return res.status(200).json({ success: true, scheduled: true });
    }

    // --- IMMEDIATE SENDING LOGIC ---
    let smtpConfig: any;
    let imapConfig: any = null;

    if (useSharedConfig) {
        // Use Environment Variables for Shared Inbox
        smtpConfig = {
            host: process.env.SHARED_SMTP_HOST,
            port: Number(process.env.SHARED_SMTP_PORT) || 465,
            secure: Number(process.env.SHARED_SMTP_PORT) === 465,
            auth: {
                user: process.env.SHARED_SMTP_USER,
                pass: process.env.SHARED_SMTP_PASS,
            },
            from: process.env.SHARED_SMTP_USER // Sender is Shared Address
        };

        if (!smtpConfig.host || !smtpConfig.auth.user) {
            return res.status(500).json({ error: 'Shared SMTP configuration is missing on server.' });
        }

        // IMAP config for shared mailbox (for save-to-sent)
        if (saveToSent && process.env.SHARED_IMAP_HOST) {
            imapConfig = {
                host: process.env.SHARED_IMAP_HOST,
                port: Number(process.env.SHARED_IMAP_PORT) || 993,
                user: process.env.SHARED_IMAP_USER || process.env.SHARED_SMTP_USER,
                password: process.env.SHARED_IMAP_PASS || process.env.SHARED_SMTP_PASS,
            };
        }

    } else {
        // Use Personal Config
        if (!config?.smtpHost) {
            return res.status(400).json({ error: 'Missing SMTP configuration' });
        }
        smtpConfig = {
            host: config.smtpHost.trim(),
            port: Number(config.smtpPort),
            secure: Number(config.smtpPort) === 465,
            auth: {
                user: config.smtpUser.trim(),
                pass: config.smtpPassword,
            },
            from: config.smtpUser.trim() // Sender is Personal Address
        };

        // IMAP config from personal config (for save-to-sent)
        if (saveToSent && config.imapHost) {
            imapConfig = {
                host: config.imapHost.trim(),
                port: Number(config.imapPort) || 993,
                user: (config.imapUser || config.smtpUser).trim(),
                password: config.imapPassword || config.smtpPassword,
            };
        }
    }

    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
    });

    try {
        const mailOptions: any = {
            from: `"Polendach24" <${smtpConfig.from}>`, // Display name: Polendach24
            to: to,
            subject: subject,
            html: body,
        };

        if (cc) mailOptions.cc = cc;
        if (bcc) mailOptions.bcc = bcc;

        // Handle Attachments
        if (attachments && Array.isArray(attachments)) {
            mailOptions.attachments = attachments.map((att: any) => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                contentType: att.contentType
            }));
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        // --- SAVE TO IMAP SENT FOLDER ---
        if (saveToSent && imapConfig) {
            try {
                console.log(`[IMAP-SAVE] Connecting to ${imapConfig.host}:${imapConfig.port} as ${imapConfig.user}`);
                const rawHeaders = [
                    `From: "Polendach24" <${smtpConfig.from}>`,
                    `To: ${to}`,
                ];
                if (cc) rawHeaders.push(`Cc: ${cc}`);
                rawHeaders.push(
                    `Subject: ${subject}`,
                    `Date: ${new Date().toUTCString()}`,
                    `Message-ID: ${info.messageId}`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/html; charset=utf-8`,
                    '',
                    body
                );
                const rawMessage = rawHeaders.join('\r\n');

                const connection = await imaps.connect({
                    imap: {
                        host: imapConfig.host.trim(),
                        port: imapConfig.port,
                        tls: true,
                        user: imapConfig.user.trim(),
                        password: imapConfig.password,
                        authTimeout: 10000,
                        tlsOptions: { rejectUnauthorized: false },
                    }
                });

                // Use the same discovery logic as fetch-emails.ts
                let sentFolder = 'Sent';
                try {
                    const boxes = await connection.getBoxes();
                    console.log('[IMAP-SAVE] Available folders:', JSON.stringify(Object.keys(boxes)));
                    const discovered = findSentFolderForSave(boxes);
                    if (discovered) {
                        sentFolder = discovered;
                        console.log(`[IMAP-SAVE] Discovered sent folder: "${sentFolder}"`);
                    } else {
                        console.log(`[IMAP-SAVE] No sent folder discovered, trying brute-force...`);
                        // Brute-force fallback
                        const candidates = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages', 'Gesendet', 'INBOX.Gesendet', 'Wysłane', 'INBOX.Wysłane'];
                        for (const candidate of candidates) {
                            try {
                                await connection.openBox(candidate);
                                sentFolder = candidate;
                                console.log(`[IMAP-SAVE] Brute-force found: "${candidate}"`);
                                break;
                            } catch { continue; }
                        }
                    }
                } catch (boxErr) {
                    console.warn('[IMAP-SAVE] Could not list boxes:', boxErr);
                }

                await connection.append(rawMessage, { mailbox: sentFolder, flags: ['\\Seen'] });
                connection.end();
                console.log(`[IMAP-SAVE] ✅ Saved to "${sentFolder}" for ${to}`);
            } catch (imapErr: any) {
                console.error(`[IMAP-SAVE] ❌ Failed to save to Sent (host: ${imapConfig.host}):`, imapErr.message);
                // Don't fail the request — email was sent successfully
            }
        }

        // --- LOGGING TO COMMUNICATIONS ---
        if (leadId || customerId) {
            const { error: logError } = await supabase
                .from('communications')
                .insert({
                    user_id: userId,
                    lead_id: leadId || null,
                    type: 'email',
                    direction: 'outbound',
                    title: subject,
                    content: body,
                    metadata: {
                        messageId: info.messageId,
                        sentBy: useSharedConfig ? 'shared' : 'personal',
                        recipient: to
                    }
                });

            if (logError) {
                console.error('Failed to log email to communications:', logError);
            }
        }

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('SMTP Send error:', error);
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message
        });
    }
}

/**
 * Recursively search IMAP folder tree for a "Sent" folder.
 * Uses same logic as fetch-emails.ts to ensure consistency.
 */
function findSentFolderForSave(boxes: any, prefix = ''): string | null {
    const sentKeywords = ['sent', 'gesendet', 'wysłane', 'sent items', 'sent messages', 'envoyé'];

    for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
        const fullPath = prefix ? `${prefix}${(box as any).delimiter || '.'}${name}` : name;

        if (sentKeywords.some(kw => name.toLowerCase().includes(kw))) {
            return fullPath;
        }

        if ((box as any).attribs && (
            (box as any).attribs.includes('\\Sent') ||
            (box as any).attribs.includes('\\sent') ||
            (box as any).special_use_attrib === '\\Sent'
        )) {
            return fullPath;
        }

        if ((box as any).children) {
            const found = findSentFolderForSave((box as any).children, fullPath);
            if (found) return found;
        }
    }

    return null;
}
