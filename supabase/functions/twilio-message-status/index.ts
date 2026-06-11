// ============================================================================
// Twilio Message Status Webhook
// Twilio wywołuje ten endpoint (form-urlencoded, BEZ JWT → deploy z
// --no-verify-jwt!) przy każdej zmianie statusu SMS/WhatsApp:
// queued → sent → delivered / undelivered / failed.
// Aktualizuje sms_logs.status po twilio_message_sid — wcześniej 176/202
// wysłanych wiadomości wisiało wiecznie jako 'queued'.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'content-type',
            },
        });
    }

    try {
        const formData = await req.formData();
        const messageSid = formData.get('MessageSid')?.toString() || formData.get('SmsSid')?.toString() || '';
        const messageStatus = formData.get('MessageStatus')?.toString() || formData.get('SmsStatus')?.toString() || '';
        const errorCode = formData.get('ErrorCode')?.toString() || null;

        if (!messageSid || !messageStatus) {
            return new Response('missing sid/status', { status: 400 });
        }

        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { error } = await serviceClient
            .from('sms_logs')
            .update({
                status: messageStatus,
                ...(errorCode ? { error_code: errorCode } : {}),
            })
            .eq('twilio_message_sid', messageSid);

        if (error) {
            console.error(`[twilio-message-status] Update error for ${messageSid}:`, error);
        } else {
            console.log(`[twilio-message-status] ${messageSid} → ${messageStatus}${errorCode ? ` (err ${errorCode})` : ''}`);
        }

        // Twilio oczekuje 2xx — pusta odpowiedź wystarczy.
        // UWAGA: status 204 wymaga body=null ('' rzuca RangeError w Deno).
        return new Response(null, { status: 204 });
    } catch (e) {
        console.error('[twilio-message-status] Error:', (e as Error).message);
        return new Response('error', { status: 500 });
    }
});
