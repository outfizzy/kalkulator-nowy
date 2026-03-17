import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        const contentType = req.headers.get('content-type') || '';

        // ── INBOUND: Twilio webhook (form-urlencoded, no JWT) ──
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            const twilioFrom = formData.get('From')?.toString() || '';
            const twilioTo = formData.get('To')?.toString() || '';
            const twilioBody = formData.get('Body')?.toString() || '';
            const messageSid = formData.get('MessageSid')?.toString() || '';
            const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');

            // Determine channel from Twilio prefix
            const isWhatsApp = twilioFrom.startsWith('whatsapp:');
            const channel = isWhatsApp ? 'whatsapp' : 'sms';
            const cleanFrom = twilioFrom.replace('whatsapp:', '');
            const cleanTo = twilioTo.replace('whatsapp:', '');

            // Collect media URLs if present
            const mediaUrls: string[] = [];
            for (let i = 0; i < numMedia; i++) {
                const mediaUrl = formData.get(`MediaUrl${i}`)?.toString();
                if (mediaUrl) mediaUrls.push(mediaUrl);
            }

            console.log(`[twilio-sms] INBOUND ${channel} from ${cleanFrom}: "${twilioBody.substring(0, 50)}..."`);

            // Log inbound message
            try {
                await serviceClient.from('sms_logs').insert({
                    twilio_message_sid: messageSid,
                    direction: 'inbound',
                    from_number: cleanFrom,
                    to_number: cleanTo,
                    body: twilioBody,
                    status: 'received',
                    channel: channel,
                    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
                });
            } catch (logErr) {
                console.error('[twilio-sms] Inbound log error:', logErr);
            }

            // Return TwiML empty response (acknowledge receipt)
            return new Response(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // ── OUTBOUND: CRM user sending message (JSON, with JWT) ──
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { to, body, fromNumberId, channel = 'sms' } = await req.json();

        if (!to || !body) {
            throw new Error('Missing required fields: to, body');
        }

        // Resolve the from number
        let fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

        if (fromNumberId) {
            const { data: phoneNum } = await serviceClient
                .from('phone_numbers')
                .select('phone_number')
                .eq('id', fromNumberId)
                .single();

            if (phoneNum?.phone_number) {
                fromNumber = phoneNum.phone_number;
            }
        }

        if (!fromNumber) {
            const { data: anyPhone } = await serviceClient
                .from('phone_numbers')
                .select('phone_number')
                .eq('is_active', true)
                .limit(1)
                .single();
            if (anyPhone?.phone_number) fromNumber = anyPhone.phone_number;
        }

        if (!fromNumber) {
            throw new Error('No phone number available to send from');
        }

        // Send via Twilio REST API
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

        if (!accountSid || !authToken) {
            throw new Error('Missing Twilio credentials');
        }

        const isWhatsApp = channel === 'whatsapp';
        const twilioFrom = isWhatsApp ? `whatsapp:${fromNumber}` : fromNumber;
        const twilioTo = isWhatsApp ? `whatsapp:${to}` : to;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const twilioBody = new URLSearchParams({
            From: twilioFrom,
            To: twilioTo,
            Body: body,
        });

        const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: twilioBody.toString(),
        });

        const twilioResult = await twilioResponse.json();

        if (!twilioResponse.ok) {
            console.error('[twilio-sms] Twilio error:', twilioResult);
            throw new Error(twilioResult.message || 'Failed to send message');
        }

        // Log outbound message
        try {
            await serviceClient.from('sms_logs').insert({
                twilio_message_sid: twilioResult.sid,
                direction: 'outbound',
                from_number: fromNumber,
                to_number: to,
                body: body,
                status: twilioResult.status || 'queued',
                user_id: user.id,
                channel: channel,
            });
        } catch (logErr) {
            console.error('[twilio-sms] Log error:', logErr);
        }

        console.log(`[twilio-sms] Sent ${channel} to ${to}: ${twilioResult.sid}`);

        return new Response(JSON.stringify({ 
            success: true, 
            sid: twilioResult.sid,
            status: twilioResult.status 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[twilio-sms] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
