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
    page?: string; // For tracking source
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { to, subject, html, config } = await req.json() as EmailRequest;

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
                    rejectUnauthorized: false, // Often needed for shared hosts
                    ciphers: 'SSLv3' // Sometimes helps with old servers
                }
            });

            await transporter.sendMail({
                from: `System Polendach <${smtpUser}>`, // Use authenticated user
                to: to,
                subject: subject,
                html: html,
            });

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
