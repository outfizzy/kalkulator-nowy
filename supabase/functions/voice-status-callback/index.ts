import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * voice-status-callback — Handles Twilio call status + recording callbacks
 * 
 * Called by Twilio when:
 * 1. A call's status changes (initiated, ringing, answered, completed)
 * 2. A recording is completed (has RecordingUrl)
 * 3. The <Dial> action callback (has DialCallStatus)
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
        console.error('[status-cb] Parse error:', e);
    }
    return params;
}

function getSupabaseClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
}

// Normalize phone number for matching (strip spaces, dashes)
function normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
}

// Try to find a lead or customer by phone number
async function findContactByPhone(supabase: any, phone: string): Promise<{ type: 'lead' | 'customer' | null; id: string | null; name: string | null }> {
    const normalized = normalizePhone(phone);

    // Search leads
    try {
        const { data: leads } = await supabase
            .from('leads')
            .select('id, name, phone')
            .or(`phone.eq.${normalized},phone.eq.${phone}`)
            .limit(1);

        if (leads && leads.length > 0) {
            return { type: 'lead', id: leads[0].id, name: leads[0].name };
        }
    } catch (e) {
        console.warn('[status-cb] Lead search error:', e);
    }

    // Search customers
    try {
        const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name, phone')
            .or(`phone.eq.${normalized},phone.eq.${phone}`)
            .limit(1);

        if (customers && customers.length > 0) {
            return {
                type: 'customer',
                id: customers[0].id,
                name: `${customers[0].first_name} ${customers[0].last_name}`.trim()
            };
        }
    } catch (e) {
        console.warn('[status-cb] Customer search error:', e);
    }

    return { type: null, id: null, name: null };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Twilio expects a 200 with empty TwiML or empty body
    const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    try {
        const params = await parseTwilioParams(req);
        const callSid = params['CallSid'] || '';
        const callStatus = params['CallStatus'] || params['DialCallStatus'] || '';
        const from = params['From'] || '';
        const to = params['To'] || '';
        const duration = params['CallDuration'] || params['Duration'] || '';
        const recordingUrl = params['RecordingUrl'] || '';
        const recordingSid = params['RecordingSid'] || '';
        const recordingDuration = params['RecordingDuration'] || '';
        const recordingStatus = params['RecordingStatus'] || '';

        console.log(`[status-cb] CallSid=${callSid}, Status=${callStatus}, RecordingUrl=${recordingUrl ? 'YES' : 'NO'}`);
        console.log(`[status-cb] All params: ${JSON.stringify(params)}`);

        if (!callSid) {
            console.warn('[status-cb] No CallSid, ignoring');
            return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
        }

        const supabase = getSupabaseClient();

        // ── RECORDING COMPLETED ──
        if (recordingUrl && (recordingStatus === 'completed' || recordingSid)) {
            console.log(`[status-cb] Recording completed: ${recordingUrl}`);

            // Twilio recording URLs need .mp3 extension for direct playback
            const fullRecordingUrl = recordingUrl.endsWith('.mp3')
                ? recordingUrl
                : `${recordingUrl}.mp3`;

            // Update existing call_log or create one
            const { data: existing } = await supabase
                .from('call_logs')
                .select('id')
                .eq('twilio_call_sid', callSid)
                .limit(1);

            if (existing && existing.length > 0) {
                await supabase
                    .from('call_logs')
                    .update({
                        recording_url: fullRecordingUrl,
                        recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
                        metadata: {
                            recording_sid: recordingSid,
                            recording_status: recordingStatus,
                        }
                    })
                    .eq('twilio_call_sid', callSid);
                console.log(`[status-cb] Recording saved to existing log ${existing[0].id}`);
            } else {
                // Create new call log with recording
                const direction = from.startsWith('client:') ? 'outbound' : 'inbound';
                const phoneNumber = direction === 'inbound' ? from : to;
                const contact = await findContactByPhone(supabase, phoneNumber);

                const { data: newLog } = await supabase
                    .from('call_logs')
                    .insert({
                        twilio_call_sid: callSid,
                        direction,
                        from_number: from,
                        to_number: to,
                        status: 'completed',
                        recording_url: fullRecordingUrl,
                        recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
                        duration_seconds: duration ? parseInt(duration) : null,
                        lead_id: contact.type === 'lead' ? contact.id : null,
                        customer_id: contact.type === 'customer' ? contact.id : null,
                        started_at: new Date().toISOString(),
                        ended_at: new Date().toISOString(),
                        metadata: {
                            recording_sid: recordingSid,
                            auto_linked: contact.type ? true : false,
                            contact_name: contact.name,
                        }
                    })
                    .select()
                    .single();
                console.log(`[status-cb] Created new call log with recording: ${newLog?.id}`);
            }

            // Trigger transcription asynchronously
            try {
                const analyzeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-call-recording`;
                fetch(analyzeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({ callSid, recordingUrl: fullRecordingUrl }),
                }).catch(e => console.warn('[status-cb] Async transcription trigger failed:', e));
                console.log('[status-cb] Transcription triggered asynchronously');
            } catch (e) {
                console.warn('[status-cb] Could not trigger transcription:', e);
            }

            return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
        }

        // ── CALL STATUS UPDATE (completed / no-answer / busy / failed) ──
        if (callStatus && ['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(callStatus)) {
            console.log(`[status-cb] Call ${callSid} ended with status: ${callStatus}`);

            const direction = from.startsWith('client:') ? 'outbound' : 'inbound';
            const phoneNumber = direction === 'inbound' ? from : to;

            // Check if call log exists
            const { data: existing } = await supabase
                .from('call_logs')
                .select('id')
                .eq('twilio_call_sid', callSid)
                .limit(1);

            if (existing && existing.length > 0) {
                // Update existing
                await supabase
                    .from('call_logs')
                    .update({
                        status: callStatus,
                        duration_seconds: duration ? parseInt(duration) : null,
                        ended_at: new Date().toISOString(),
                    })
                    .eq('twilio_call_sid', callSid);
            } else {
                // Create new log for this call
                const contact = await findContactByPhone(supabase, phoneNumber);

                // Extract userId from client: prefix for outbound calls
                let userId: string | null = null;
                if (direction === 'outbound' && from.startsWith('client:')) {
                    userId = from.replace('client:', '');
                }

                await supabase
                    .from('call_logs')
                    .insert({
                        twilio_call_sid: callSid,
                        direction,
                        from_number: from.startsWith('client:') ? 'app' : from,
                        to_number: to,
                        status: callStatus,
                        duration_seconds: duration ? parseInt(duration) : null,
                        user_id: userId,
                        lead_id: contact.type === 'lead' ? contact.id : null,
                        customer_id: contact.type === 'customer' ? contact.id : null,
                        started_at: new Date().toISOString(),
                        ended_at: new Date().toISOString(),
                        metadata: {
                            auto_linked: contact.type ? true : false,
                            contact_name: contact.name,
                        }
                    });
                console.log(`[status-cb] Created call log for ${callSid} (${callStatus})`);
            }
        }

        return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[status-cb] ERROR:', error.message);
        // Always return 200 to Twilio to avoid retries
        return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
});
