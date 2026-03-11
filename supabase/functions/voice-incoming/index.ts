import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * voice-incoming v5 — Unified TwiML webhook for inbound AND outbound calls
 * 
 * OUTBOUND (browser → PSTN):
 *   From = "client:user-uuid" → dial the To number on PSTN
 *
 * INBOUND (PSTN → browser):
 *   From = phone number → ring ALL users from profiles table as <Client>
 */

async function parseTwilioParams(req: Request): Promise<Record<string, string>> {
    const params: Record<string, string> = {};
    try {
        const body = await req.text();
        const urlParams = new URLSearchParams(body);
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
    } catch (e) {
        console.error('[voice-incoming] Parse error:', e);
    }
    const url = new URL(req.url);
    for (const [key, value] of url.searchParams.entries()) {
        if (!params[key]) params[key] = value;
    }
    return params;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    if (req.method === 'GET') {
        return new Response(JSON.stringify({ status: 'voice-incoming v5', ts: new Date().toISOString() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const params = await parseTwilioParams(req);
        const to = params['To'] || '';
        const from = params['From'] || '';
        const callSid = params['CallSid'] || '';

        console.log(`[v5] From=${from}, To=${to}, CallSid=${callSid}`);

        let twiml = '';
        const callerIdNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

        // ── OUTBOUND: From browser (From starts with "client:")
        if (from.startsWith('client:')) {
            console.log(`[v5] OUTBOUND → ${to}`);
            twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${callerIdNumber}">
        <Number>${to}</Number>
    </Dial>
</Response>`;
        }
        // ── INBOUND: From phone (ring ALL users in browser)
        else {
            console.log(`[v5] INBOUND from ${from}`);

            let clientTags = '';
            try {
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                );

                // Ring ALL profiles — not filtered by role
                const { data: agents, error } = await supabaseClient
                    .from('profiles')
                    .select('id, full_name');

                if (error) {
                    console.error('[v5] DB error:', error);
                }

                if (agents && agents.length > 0) {
                    clientTags = agents.map(a => `        <Client>${a.id}</Client>`).join('\n');
                    console.log(`[v5] Ringing ${agents.length} users: ${agents.map(a => `${a.full_name}=${a.id}`).join(', ')}`);
                } else {
                    console.warn('[v5] No profiles found!');
                }
            } catch (dbErr) {
                console.error('[v5] DB fetch failed:', dbErr);
            }

            if (!clientTags) {
                twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="de-DE">Leider ist momentan niemand erreichbar. Bitte versuchen Sie es spaeter noch einmal.</Say>
</Response>`;
            } else {
                twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${from}" timeout="30">
${clientTags}
    </Dial>
    <Say language="de-DE">Leider konnte niemand Ihren Anruf entgegennehmen. Bitte versuchen Sie es spaeter noch einmal.</Say>
</Response>`;
            }
        }

        console.log(`[v5] TwiML:\n${twiml}`);
        return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[v5] CRITICAL:', error.message);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="de-DE">Ein Fehler ist aufgetreten.</Say>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
});
