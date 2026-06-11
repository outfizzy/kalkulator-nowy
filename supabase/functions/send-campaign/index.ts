// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import nodemailer from "npm:nodemailer@6.9.13";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DELAY_BETWEEN_EMAILS_MS = 3000;
const APP_BASE_URL = 'https://polendach24.app';
const SENDER_EMAIL = 'buero@polendach24.de';
const SENDER_NAME = 'Polendach24 \u2013 Sonnenschutz & Terrassen\u00fcberdachungen';

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { campaignId } = await req.json();
        if (!campaignId) throw new Error('campaignId required');

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: campaign, error: campErr } = await supabase
            .from('email_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campErr || !campaign) throw new Error('Campaign not found');

        const { data: recipients, error: recipErr } = await supabase
            .from('campaign_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');

        if (recipErr) throw new Error(`Recipients error: ${recipErr.message}`);
        if (!recipients || recipients.length === 0) {
            await supabase.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaignId);
            return new Response(JSON.stringify({ success: true, message: 'No recipients' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: unsubs } = await supabase.from('email_unsubscribes').select('email');
        const unsubSet = new Set((unsubs || []).map((u: any) => u.email.toLowerCase()));

        const smtpHost = Deno.env.get('SMTP_HOST');
        const smtpUser = Deno.env.get('SMTP_USER');
        const smtpPass = Deno.env.get('SMTP_PASS');
        const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');

        if (!smtpHost || !smtpUser || !smtpPass) {
            throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            pool: true,
            maxConnections: 1,
            rateDelta: 3000,
            rateLimit: 1,
        });

        // Update campaign to 'sending'
        await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

        let sentCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
            if (unsubSet.has(recipient.email.toLowerCase())) {
                await supabase.from('campaign_recipients')
                    .update({ status: 'skipped', error_message: 'Unsubscribed' })
                    .eq('id', recipient.id);
                continue;
            }

            try {
                // Unsubscribe token
                const { data: existingUnsub } = await supabase
                    .from('email_unsubscribes')
                    .select('token')
                    .eq('email', recipient.email.toLowerCase())
                    .single();

                let unsubToken: string;
                if (existingUnsub?.token) {
                    unsubToken = existingUnsub.token;
                } else {
                    unsubToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
                    await supabase.from('email_unsubscribes').upsert({
                        email: recipient.email.toLowerCase(),
                        token: unsubToken,
                        customer_id: recipient.customer_id || null,
                        lead_id: recipient.lead_id || null,
                        source: 'link',
                        unsubscribed_at: null,
                    }, { onConflict: 'email' });
                }

                const unsubscribeUrl = `${APP_BASE_URL}/unsubscribe/${unsubToken}`;
                const listUnsubscribeHeader = `<${unsubscribeUrl}>`;

                // Tracking pixel URL
                const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?rid=${recipient.id}`;

                // Replace #UNSUBSCRIBE_URL# placeholder in brand wrapper
                let htmlBody = campaign.html_body || '';
                htmlBody = htmlBody.replace(/#UNSUBSCRIBE_URL#/g, unsubscribeUrl);

                // Add tracking pixel before </body>
                const htmlWithTracking = htmlBody.replace(
                    '</body>',
                    `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none; width:1px; height:1px; opacity:0;" alt="" />\n</body>`
                );

                await transporter.sendMail({
                    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
                    to: recipient.email,
                    subject: campaign.subject,
                    html: htmlWithTracking,
                    headers: {
                        'List-Unsubscribe': listUnsubscribeHeader,
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                        'Precedence': 'bulk',
                        'X-Mailer': 'Polendach24-CRM/1.0',
                        'X-Campaign-Id': campaignId,
                    },
                });

                sentCount++;
                await supabase.from('campaign_recipients')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', recipient.id);

                await supabase.from('email_campaigns')
                    .update({ sent_count: sentCount, failed_count: failedCount })
                    .eq('id', campaignId);

                console.log(`[${sentCount}/${recipients.length}] Sent to ${recipient.email}`);

            } catch (sendErr: any) {
                failedCount++;
                console.error(`Failed to send to ${recipient.email}:`, sendErr.message);
                await supabase.from('campaign_recipients')
                    .update({ status: 'failed', error_message: sendErr.message?.substring(0, 500) })
                    .eq('id', recipient.id);
            }

            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));
        }

        await supabase.from('email_campaigns').update({
            status: failedCount === recipients.length ? 'failed' : 'sent',
            sent_count: sentCount,
            failed_count: failedCount,
            sent_at: new Date().toISOString(),
        }).eq('id', campaignId);

        transporter.close();

        console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

        return new Response(
            JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Campaign error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
