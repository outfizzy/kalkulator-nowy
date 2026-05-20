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
        return new Response(JSON.stringify({ status: 'voice-incoming v12 (voicemail)', ts: new Date().toISOString() }), {
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
        const voicemailCallbackUrl = `${supabaseUrl}/functions/v1/voice-status-callback?voicemail=true`;

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
            console.log(`[v12] INBOUND from ${from}`);

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
                    .neq('customer_data->>phone', '')
                    .not('customer_data->>phone', 'is', null)
                    .limit(1);

                if (leads && leads.length > 0) {
                    leadId = leads[0].id;
                    leadStatus = leads[0].status;
                    assignedRepId = leads[0].assigned_to;
                    const cd = leads[0].customer_data || {};
                    console.log(`[v12] Found lead: ${leadId}, status: ${leadStatus}, assigned: ${assignedRepId}, name: ${cd.firstName} ${cd.lastName}`);

                    if (assignedRepId) {
                        const { data: profile } = await supabaseClient
                            .from('profiles')
                            .select('full_name, availability_status')
                            .eq('id', assignedRepId)
                            .single();
                        assignedRepName = profile?.full_name || null;
                        // Skip assigned rep if not available
                        if (profile?.availability_status !== 'available') {
                            console.log(`[v12] Assigned rep ${assignedRepName} is ${profile?.availability_status} — skipping priority routing`);
                            assignedRepId = null; // fall through to all-agents routing
                        } else {
                            console.log(`[v12] Assigned rep: ${assignedRepName} (${assignedRepId}) — available ✓`);
                        }
                    }
                } else {
                    console.log(`[v12] No lead found for ${from}`);
                }
            } catch (dbErr) {
                console.error('[v12] Lead lookup failed:', dbErr);
            }

            // 2. Log the inbound call (upsert to prevent duplicates with status callback)
            try {
                await supabaseClient.from('call_logs').upsert({
                    direction: 'inbound',
                    from_number: from,
                    to_number: to,
                    status: 'ringing',
                    twilio_call_sid: callSid,
                    lead_id: leadId,
                    user_id: assignedRepId,
                    started_at: new Date().toISOString(),
                    metadata: { leadStatus, assignedRepName },
                }, { onConflict: 'twilio_call_sid', ignoreDuplicates: false });
                console.log(`[v12] Call logged for lead ${leadId}`);
            } catch (logErr) {
                console.error('[v12] Call logging failed:', logErr);
            }

            // 3. Fetch all AVAILABLE agents for fallback (only telephony-capable roles)
            let allAgents: { id: string; full_name: string; phone: string | null }[] = [];
            try {
                const { data: agents } = await supabaseClient
                    .from('profiles')
                    .select('id, full_name, phone')
                    .eq('availability_status', 'available')
                    .in('role', ['admin', 'sales_rep', 'manager', 'sales_rep_pl']);
                allAgents = agents || [];
                console.log(`[v13] Available telephony agents: ${allAgents.length}`, allAgents.map(a => `${a.full_name} (${a.phone || 'no phone'})`));
            } catch (dbErr) {
                console.error('[v13] Agent fetch failed:', dbErr);
            }

            // Helper: normalize phone to E.164 for <Number>
            const normalizeAgentPhone = (raw: string | null): string | null => {
                if (!raw || raw.trim().length < 6) return null;
                let p = raw.replace(/[\s\-()]/g, '');
                // German numbers without country code
                if (p.startsWith('01')) p = '+49' + p.substring(1);
                // Polish numbers without country code
                else if (p.startsWith('0') && !p.startsWith('00')) p = '+49' + p.substring(1);
                else if (/^\d{9}$/.test(p)) p = '+48' + p; // 9-digit Polish
                else if (p.startsWith('00')) p = '+' + p.substring(2);
                if (!p.startsWith('+')) p = '+' + p;
                return p;
            };

            // Helper: generate tags for an agent (Client + optional Number)
            const agentTags = (agentId: string, agentPhone: string | null): string => {
                let tags = `        <Client statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${agentId}</Client>`;
                const normalized = normalizeAgentPhone(agentPhone);
                if (normalized && normalized !== from) { // Don't call the caller's own number
                    tags += `\n        <Number statusCallback="${statusCallbackUrl}" statusCallbackEvent="initiated ringing answered completed">${normalized}</Number>`;
                }
                return tags;
            };

            // 4. Build TwiML with smart routing
            if (assignedRepId) {
                // Look up assigned rep's phone
                let assignedPhone: string | null = null;
                const repAgent = allAgents.find(a => a.id === assignedRepId);
                if (repAgent) {
                    assignedPhone = repAgent.phone;
                } else {
                    // Rep might not be in allAgents (different status), fetch directly
                    try {
                        const { data: rep } = await supabaseClient
                            .from('profiles').select('phone').eq('id', assignedRepId).single();
                        assignedPhone = rep?.phone || null;
                    } catch {}
                }

                // Priority routing: ring assigned rep first (20s), then all others
                const otherAgents = allAgents.filter(a => a.id !== assignedRepId);
                const otherTags = otherAgents.map(a => agentTags(a.id, a.phone)).join('\n');

                const fallbackDialSection = otherTags ? `
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Ihr persönlicher Berater ist aktuell nicht verfügbar. Wir verbinden Sie mit einem anderen Kundenberater.
    </Say>
    <Dial callerId="${from}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed">
${otherTags}
    </Dial>` : '';

                twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Guten Tag und herzlich willkommen bei Polendach 24.
        Ihrem Spezialisten für hochwertige Aluminium Terrassenüberdachungen und Pergolen.
        Wir verbinden Sie jetzt mit Ihrem persönlichen Berater${assignedRepName ? ', ' + assignedRepName.split(' ')[0] : ''}.
    </Say>
    <Dial callerId="${from}" timeout="20" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed">
${agentTags(assignedRepId, assignedPhone)}
    </Dial>${fallbackDialSection}
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Leider sind aktuell alle unsere Kundenberater im Gespräch.
        Bitte hinterlassen Sie uns eine Nachricht nach dem Signalton. Wir rufen Sie schnellstmöglich zurück.
    </Say>
    <Record maxLength="120" playBeep="true" recordingStatusCallback="${voicemailCallbackUrl}" recordingStatusCallbackEvent="completed" transcribe="false" />
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Vielen Dank für Ihre Nachricht. Wir melden uns in Kürze bei Ihnen. Auf Wiederhören.
    </Say>
</Response>`;
                console.log(`[v13] Smart routing: ${assignedRepName} (phone: ${normalizeAgentPhone(assignedPhone) || 'none'}) first → ${otherAgents.length} fallback agents + voicemail`);
            } else {
                // No assigned rep — ring all agents simultaneously
                const allTags = allAgents.map(a => agentTags(a.id, a.phone)).join('\n');

                if (!allTags) {
                    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Guten Tag und herzlich willkommen bei Polendach 24.
        Leider sind aktuell alle unsere Mitarbeiter im Gespräch.
        Bitte hinterlassen Sie uns eine Nachricht nach dem Signalton. Wir rufen Sie schnellstmöglich zurück.
    </Say>
    <Record maxLength="120" playBeep="true" recordingStatusCallback="${voicemailCallbackUrl}" recordingStatusCallbackEvent="completed" transcribe="false" />
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Vielen Dank für Ihre Nachricht. Wir melden uns in Kürze bei Ihnen. Auf Wiederhören.
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
    <Dial callerId="${from}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackEvent="completed">
${allTags}
    </Dial>
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Leider sind aktuell alle unsere Kundenberater im Gespräch.
        Bitte hinterlassen Sie uns eine Nachricht nach dem Signalton. Wir rufen Sie schnellstmöglich zurück.
    </Say>
    <Record maxLength="120" playBeep="true" recordingStatusCallback="${voicemailCallbackUrl}" recordingStatusCallbackEvent="completed" transcribe="false" />
    <Say voice="Polly.Vicki-Neural" language="de-DE">
        Vielen Dank für Ihre Nachricht. Wir melden uns in Kürze bei Ihnen. Auf Wiederhören.
    </Say>
</Response>`;
                }
                console.log(`[v13] No assigned rep — ringing all ${allAgents.length} agents (with phone fallback) + voicemail`);
            }
        }

        console.log(`[v12] TwiML:\n${twiml}`);
        return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[v12] CRITICAL:', error.message);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="de-DE" voice="Polly.Vicki-Neural">Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</Say>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
});
