import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, body, config } = req.body;

    if (!to || !subject || !body || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const { smtpHost, smtpPort, smtpUser, smtpPassword } = config;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        return res.status(400).json({ error: 'Incomplete email configuration' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
            tls: {
                rejectUnauthorized: false // Helps with some self-signed certs or strict firewalls
            }
        });

        // Verify connection configuration
        await transporter.verify();

        const info = await transporter.sendMail({
            from: smtpUser,
            to,
            subject,
            text: body, // Plain text body
            html: body.replace(/\n/g, '<br>') // Simple HTML conversion
        });

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Email send error:', error);
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message
        });
    }
}
