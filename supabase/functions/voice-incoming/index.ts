import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
        return new Response(JSON.stringify({ status: 'voice-incoming v11 (smart-routing)', ts: new Date().toISOString() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const params = await parseTwilioParams(req);
        const to = params['To'] || '';
        const from = params['From'] || '';
        const callSid = params['CallSid'] || '';

        console.log(`[v11] From=${from}, To=${to}, CallSid=${callSid}`);

        let twiml = '';
        const callerIdNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const statusCallbackUrl = `${supabaseUrl}/functions/v1/voice-status-callback`;

        // ── OUTBOUND: From browser (From starts with "client:")
        if (from.startsWith('client:')) {
            const userId = from.replace('client:', '');
            console.log(`[v11] OUTBOUND → ${to} by user ${userId}`);
            twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${callerIdNumber}" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">
        <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${to}</Number>
    </Dial>
</Response>`;
        }
        // ── INBOUND: Smart routing — assigned rep first, then all
        else {
            console.log(`[v11] INBOUND from ${from}`);

            const supabaseClient = createClient(
                supabaseUrl,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            // 1. Look up the caller in leads to find assigned rep
            const normalizedFrom = from.replace(/[\s\-()]/g, '');
            let assignedRepId: string | null = null;
            let assignedRepName: string | null = null;
            let leadId: string | null = null;
            let leadStatus: string | null = null;

            try {
                const { data: leads } = await supabaseClient
                    .from('leads')
                    .select('id, assigned_to, status, customer_data')
                    .or(`customer_data->>phone.eq.${normalizedFrom},customer_data->>phone.eq.${from}`)
                    .limit(1);

                if (leads && leads.length > 0) {
                    leadId = leads[0].id;
                    leadStatus = leads[0].status;
                    assignedRepId = leads[0].assigned_to;
                    const cd = leads[0].customer_data || {};
                    console.log(`[v11] Found lead: ${leadId}, status: ${leadStatus}, assigned: ${assignedRepId}, name: ${cd.firstName} ${cd.lastName}`);

                    if (assignedRepId) {
                        const { data: profile } = await supabaseClient
                            .from('profiles')
                            .select('full_name, availability_status')
                            .eq('id', assignedRepId)
                            .single();
                        assignedRepName = profile?.full_name || null;
                        // Skip assigned rep if not available
                        if (profile?.availability_status !== 'available') {
                            console.log(`[v11] Assigned rep ${assignedRepName} is ${profile?.availability_status} — skipping priority routing`);
                            assignedRepId = null; // fall through to all-agents routing
                        } else {
                            console.log(`[v11] Assigned rep: ${assignedRepName} (${assignedRepId}) — available ✓`);
                        }
                    }
                } else {
                    console.log(`[v11] No lead found for ${from}`);
                }
            } catch (dbErr) {
                console.error('[v11] Lead lookup failed:', dbErr);
            }

            // 2. Log the inbound call
            try {
                await supabaseClient.from('call_logs').insert({
                    direction: 'inbound',
                    from_number: from,
                    to_number: to,
                    status: 'ringing',
                    twilio_call_sid: callSid,
                    lead_id: leadId,
                    user_id: assignedRepId,
                    started_at: new Date().toISOString(),
                    metadata: { leadStatus, assignedRepName },
                });
                console.log(`[v11] Call logged for lead ${leadId}`);
            } catch (logErr) {
                console.error('[v11] Call logging failed:', logErr);
            }

            // 3. Fetch all AVAILABLE agents for fallback
            let allAgents: { id: string; full_name: string }[] = [];
            try {
                const { data: agents } = await supabaseClient
                    .from('profiles')
                    .select('id, full_name')
                    .eq('availability_status', 'available');
                allAgents = agents || [];
                console.log(`[v11] Available agents: ${allAgents.length} (filtered by status)`);
            } catch (dbErr) {
                console.error('[v11] Agent fetch failed:', dbErr);
            }

            // 4. Build TwiML with smart routing
            if (assignedRepId) {
                // Priority routing: ring assigned rep first (20s), then all others
                const otherAgents = allAgents.filter(a => a.id !== assignedRepId);
                const otherClientTags = otherAgents.map(a =>
                    `        <Client statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${a.id}</Client>`
                ).join('\n');

                const fallbackDialSection = otherClientTags ? `
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Ihr persönlicher Berater ist aktuell nicht verfügbar. Wir verbinden Sie mit einem anderen Kundenberater.
    </Say>
    <Dial callerId="${from}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">
${otherClientTags}
    </Dial>` : '';

                twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Guten Tag und herzlich willkommen bei Polendach 24.
        Ihrem Spezialisten für hochwertige Aluminium Terrassenüberdachungen und Pergolen.
        Wir verbinden Sie jetzt mit Ihrem persönlichen Berater${assignedRepName ? ', ' + assignedRepName.split(' ')[0] : ''}.
    </Say>
    <Dial callerId="${from}" timeout="20" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed">
        <Client statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${assignedRepId}</Client>
    </Dial>${fallbackDialSection}
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Leider sind aktuell alle unsere Kundenberater im Gespräch.
        Bitte versuchen Sie es später noch einmal, oder senden Sie uns eine E-Mail an buero@polendach24.de.
        Vielen Dank für Ihren Anruf. Auf Wiederhören.
    </Say>
</Response>`;
                console.log(`[v11] Smart routing: ${assignedRepName} first → ${otherAgents.length} fallback agents`);
            } else {
                // No assigned rep — ring all agents simultaneously (existing behavior)
                const clientTags = allAgents.map(a =>
                    `        <Client statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${a.id}</Client>`
                ).join('\n');

                if (!clientTags) {
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Guten Tag und herzlich willkommen bei Polendach 24.
        Leider sind aktuell alle unsere Mitarbeiter im Gespräch.
        Bitte versuchen Sie es später noch einmal oder senden Sie uns eine E-Mail an buero@polendach24.de.
        Auf Wiederhören.
    </Say>
</Response>`;
                } else {
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Guten Tag und herzlich willkommen bei Polendach 24.
        Ihrem Spezialisten für hochwertige Aluminium Terrassenüberdachungen und Pergolen.
        Ihr Anruf ist uns wichtig. Bitte haben Sie einen Moment Geduld, wir verbinden Sie mit dem nächsten verfügbaren Kundenberater.
    </Say>
    <Dial callerId="${from}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed" action="${statusCallbackUrl}">
${clientTags}
    </Dial>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Leider sind aktuell alle unsere Kundenberater im Gespräch.
        Bitte versuchen Sie es später noch einmal, oder senden Sie uns eine E-Mail an buero@polendach24.de.
        Vielen Dank für Ihren Anruf. Auf Wiederhören.
    </Say>
</Response>`;
                }
                console.log(`[v11] No assigned rep — ringing all ${allAgents.length} agents`);
            }
        }

        console.log(`[v11] TwiML:\n${twiml}`);
        return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[v11] CRITICAL:', error.message);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="de-DE" voice="Polly.Vicki-Neural">Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</Say>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
});
