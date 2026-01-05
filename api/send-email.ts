import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

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
        subject,
        body,
        config,
        attachments,
        scheduledAt,
        useSharedConfig, // NEW: Flag to use shared inbox
        leadId,          // NEW: For logging
        customerId       // NEW: For logging
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
    let smtpConfig;

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

    } else {
        // Use Personal Config
        if (!config?.smtpHost) {
            return res.status(400).json({ error: 'Missing SMTP configuration' });
        }
        smtpConfig = {
            host: config.smtpHost,
            port: Number(config.smtpPort),
            secure: Number(config.smtpPort) === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPassword,
            },
            from: config.smtpUser // Sender is Personal Address
        };
    }

    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
    });

    try {
        const mailOptions: any = {
            from: smtpConfig.from, // Dynamic Sender
            to: to,
            subject: subject,
            html: body,
        };

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

        // --- LOGGING TO COMMUNICATIONS ---
        // Fire and forget logging to avoid blocking response, or await it to ensure consistency.
        // Awaiting is safer for 'success' confirmation.
        if (leadId || customerId) {
            const { error: logError } = await supabase
                .from('communications')
                .insert({
                    user_id: userId,
                    lead_id: leadId || null,
                    // customer_id: customerId || null, // Ensure your schema has this column if you use it
                    type: 'email',
                    direction: 'outbound',
                    title: subject,
                    content: body, // Warning: This might be large. Consider truncating or storing snippet if body is huge.
                    metadata: {
                        messageId: info.messageId,
                        sentBy: useSharedConfig ? 'shared' : 'personal',
                        recipient: to
                    }
                });

            if (logError) {
                console.error('Failed to log email to communications:', logError);
                // We don't fail the request if logging fails, but we log it.
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
