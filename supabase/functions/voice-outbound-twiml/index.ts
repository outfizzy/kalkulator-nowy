const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let to = '';
        let callerId = Deno.env.get('TWILIO_PHONE_NUMBER') || '+4915888649130';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const statusCallbackUrl = `${supabaseUrl}/functions/v1/voice-status-callback`;

        const contentType = req.headers.get('content-type') || '';
        console.log('[outbound-twiml] content-type:', contentType);

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            to = formData.get('To') as string || '';
            const from = formData.get('From') as string || '';
            const callSid = formData.get('CallSid') as string || '';
            
            console.log('[outbound-twiml] To:', to, 'From:', from, 'CallSid:', callSid);

            if (to.startsWith('client:')) {
                const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Dial callerId="${callerId}" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">\n        <Client statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${to.replace('client:', '')}</Client>\n    </Dial>\n</Response>`;
                console.log('[outbound-twiml] Routing to client:', to);
                return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
            }

            if (to) {
                const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Dial callerId="${callerId}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">\n        <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${to}</Number>\n    </Dial>\n</Response>`;
                console.log('[outbound-twiml] Dialing:', to);
                return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
            }
        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            to = body.To || body.to || '';
            console.log('[outbound-twiml] JSON To:', to);

            if (to) {
                const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Dial callerId="${callerId}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">\n        <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${to}</Number>\n    </Dial>\n</Response>`;
                return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
            }
        }

        console.warn('[outbound-twiml] No destination');
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Say language="de-DE">Keine Zielnummer angegeben.</Say>\n</Response>`, { headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[outbound-twiml] ERROR:', error.message);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Say language="de-DE">Ein Fehler ist aufgetreten.</Say>\n</Response>`, { headers: { 'Content-Type': 'application/xml' } });
    }
});
