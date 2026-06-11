// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
    to: string;
    subject: string;
    html: string;
    config?: {
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        smtpPassword?: string;
        smtpPass?: string; // Compatibility
    };
    attachments?: Array<{
        filename: string;
        content: string; // base64
        contentType?: string;
    }>;
    fromName?: string; // Custom sender display name
    page?: string; // For tracking source
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { to, subject, html, config, attachments, fromName } = await req.json() as EmailRequest;

        // Determine SMTP Credentials (Config > Env)
        const smtpHost = config?.smtpHost || Deno.env.get('SMTP_HOST');
        const smtpUser = config?.smtpUser || Deno.env.get('SMTP_USER');
        const smtpPass = config?.smtpPassword || config?.smtpPass || Deno.env.get('SMTP_PASS');
        const smtpPort = config?.smtpPort || parseInt(Deno.env.get('SMTP_PORT') || '465');

        if (smtpHost && smtpUser && smtpPass) {
            console.log(`Sending via SMTP (${smtpHost})...`);

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465, // true for 465, false for 587/other
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                // Robustness settings
                tls: {
                    rejectUnauthorized: false,
                }
            });

            // Build nodemailer attachments from base64
            const mailAttachments = (attachments || []).map(a => ({
                filename: a.filename,
                content: a.content,
                encoding: 'base64' as const,
                contentType: a.contentType || 'application/pdf'
            }));

            const info = await transporter.sendMail({
                from: `${fromName || 'System Polendach'} <${smtpUser}>`,
                to: to,
                subject: subject,
                html: html,
                attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
                headers: {
                    'List-Unsubscribe': `<mailto:${smtpUser}?subject=Unsubscribe>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            });

            // Try to save to IMAP Sent folder
            try {
                const ImapClient = (await import("npm:imapflow@1.0.162")).ImapFlow;
                // home.pl uses same hostname for SMTP and IMAP
                // For other providers: smtp.xxx.de → imap.xxx.de
                const imapHost = smtpHost!.includes('home.pl') 
                    ? smtpHost! 
                    : smtpHost!.replace('smtp.', 'imap.');
                const imapConfig = {
                    host: imapHost,
                    port: 993,
                    secure: true,
                    auth: { user: smtpUser!, pass: smtpPass! },
                    logger: false,
                };
                const client = new ImapClient(imapConfig);
                await client.connect();
                
                // Build raw email for IMAP append
                const rawEmail = [
                    `From: ${fromName || 'System Polendach'} <${smtpUser}>`,
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    `Date: ${new Date().toUTCString()}`,
                    `Message-ID: ${info.messageId}`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/html; charset=utf-8`,
                    ``,
                    html,
                ].join('\r\n');
                
                // Try common Sent folder names
                const sentFolders = ['Sent', 'INBOX.Sent', 'Sent Items', 'Gesendet', 'INBOX.Gesendet'];
                let appended = false;
                for (const folder of sentFolders) {
                    try {
                        await client.append(folder, rawEmail, ['\\Seen']);
                        console.log(`✅ Email saved to IMAP folder: ${folder}`);
                        appended = true;
                        break;
                    } catch { /* try next folder */ }
                }
                if (!appended) console.log('⚠️ Could not find Sent folder in IMAP');
                
                await client.logout();
            } catch (imapErr: any) {
                console.log(`⚠️ IMAP Sent save skipped: ${imapErr.message?.substring(0, 80)}`);
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Email sent via SMTP (Nodemailer)' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fallback to Resend or Mock
        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        if (!resendApiKey) {
            console.log('Mock Email Send (No SMTP_HOST or RESEND_API_KEY found):');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Email simulated (Configure SMTP_HOST or RESEND_API_KEY to send for real)'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Call Resend API (Backup)
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'System Ofertowy <onboarding@resend.dev>',
                to,
                subject,
                html,
            }),
        })

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to send email via Resend');
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Unknown Error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
    }
})
