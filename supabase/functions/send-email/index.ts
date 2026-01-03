// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
//
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
    to: string;
    subject: string;
    html: string;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { to, subject, html } = await req.json() as EmailRequest;

        // Check for SMTP Credentials (User Preference: home.pl)
        const smtpHost = Deno.env.get('SMTP_HOST');
        const smtpUser = Deno.env.get('SMTP_USER');
        const smtpPass = Deno.env.get('SMTP_PASS');

        if (smtpHost && smtpUser && smtpPass) {
            console.log(`Sending via SMTP (${smtpHost})...`);

            const client = new SmtpClient();
            await client.connectTLS({
                hostname: smtpHost,
                port: 465, // Standard Secure SMTP Port for home.pl
                username: smtpUser,
                password: smtpPass,
            });

            await client.send({
                from: smtpUser, // Send from the authenticated user
                to: to,
                subject: subject,
                content: html,
                html: html,
            });

            await client.close();

            return new Response(
                JSON.stringify({ success: true, message: 'Email sent via SMTP' }),
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
                from: 'System Ofertowy <onboarding@resend.dev>', // Default Resend, user should change this
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
    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
