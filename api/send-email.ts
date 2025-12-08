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

    const { to, subject, body, config, attachments, scheduledAt, userId } = req.body;

    if (!to || !subject || !body || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- SCHEDULING LOGIC ---
    if (scheduledAt) {
        // If userId is missing, we can't schedule (need row owner). 
        // We expect userId to be passed from frontend (currentUser.id).
        if (!userId) {
            return res.status(400).json({ error: 'User ID required for scheduling' });
        }

        const { error } = await supabase
            .from('mail_queue')
            .insert({
                user_id: userId,
                email_to: to,
                subject: subject,
                body: body,
                attachments: attachments || [],
                config: config,
                scheduled_for: scheduledAt,
                status: 'pending'
            });

        if (error) {
            console.error('Scheduling error:', error);
            return res.status(500).json({ error: 'Failed to schedule email', details: error.message });
        }

        return res.status(200).json({ success: true, message: 'Email scheduled successfully' });
    }

    // --- IMMEDIATE SENDING LOGIC ---
    const { smtpHost, smtpPort, smtpUser, smtpPassword } = config;

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPassword,
        },
    });

    try {
        const mailOptions: any = {
            from: smtpUser,
            to: to,
            subject: subject,
            html: body, // We assume body is HTML
        };

        // Handle Attachments
        if (attachments && Array.isArray(attachments)) {
            mailOptions.attachments = attachments.map((att: any) => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'), // Convert base64 back to Buffer
                contentType: att.contentType
            }));
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('SMTP Send error:', error);
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message
        });
    }
}
