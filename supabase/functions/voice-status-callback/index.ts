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
 * 
 * DEDUPLICATION: Uses upsert on twilio_call_sid to prevent duplicate entries
 * when multiple callbacks arrive for the same call (status + recording).
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

    // Search leads by customer_data->phone (JSONB field)
    try {
        const { data: leads } = await supabase
            .from('leads')
            .select('id, customer_data')
            .or(`customer_data->>phone.eq.${normalized},customer_data->>phone.eq.${phone}`)
            .limit(1);

        if (leads && leads.length > 0) {
            const cd = leads[0].customer_data || {};
            return {
                type: 'lead',
                id: leads[0].id,
                name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Lead'
            };
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

/**
 * Upsert a call log entry — prevents duplicates by matching on twilio_call_sid.
 * If a record already exists, it merges the new data (recording, status, duration).
 */
async function upsertCallLog(supabase: any, callSid: string, newData: Record<string, any>): Promise<string | null> {
    // 1. Try to find existing record
    const { data: existing } = await supabase
        .from('call_logs')
        .select('id, status, recording_url, metadata, duration_seconds')
        .eq('twilio_call_sid', callSid)
        .limit(1);

    if (existing && existing.length > 0) {
        // 2. MERGE — update existing record, preserving non-null fields
        const existingRow = existing[0];
        const updates: Record<string, any> = {};

        // Only override status if the new one is more "final"
        const statusPriority: Record<string, number> = {
            'initiated': 1, 'ringing': 2, 'in-progress': 3,
            'completed': 10, 'no-answer': 10, 'busy': 10, 'failed': 10, 'canceled': 10, 'missed': 10, 'voicemail': 10,
        };
        if (newData.status) {
            const existingPrio = statusPriority[existingRow.status] || 0;
            const newPrio = statusPriority[newData.status] || 0;
            if (newPrio >= existingPrio) {
                updates.status = newData.status;
            }
        }

        // Duration — take the larger value
        if (newData.duration_seconds && (!existingRow.duration_seconds || newData.duration_seconds > existingRow.duration_seconds)) {
            updates.duration_seconds = newData.duration_seconds;
        }

        // Recording — only set if not already present
        if (newData.recording_url && !existingRow.recording_url) {
            updates.recording_url = newData.recording_url;
        }
        if (newData.recording_duration !== undefined) {
            updates.recording_duration = newData.recording_duration;
        }

        // Ended at
        if (newData.ended_at) {
            updates.ended_at = newData.ended_at;
        }

        // Merge metadata
        if (newData.metadata) {
            updates.metadata = { ...(existingRow.metadata || {}), ...newData.metadata };
        }

        // Contact links — only set if not already present
        if (newData.lead_id && !existingRow.lead_id) updates.lead_id = newData.lead_id;
        if (newData.customer_id && !existingRow.customer_id) updates.customer_id = newData.customer_id;
        if (newData.user_id && !existingRow.user_id) updates.user_id = newData.user_id;

        if (Object.keys(updates).length > 0) {
            await supabase
                .from('call_logs')
                .update(updates)
                .eq('id', existingRow.id);
            console.log(`[status-cb] Updated existing log ${existingRow.id} with:`, Object.keys(updates));
        }
        return existingRow.id;
    } else {
        // 3. INSERT — new record
        const { data: newLog } = await supabase
            .from('call_logs')
            .insert({
                twilio_call_sid: callSid,
                ...newData,
            })
            .select('id')
            .single();
        console.log(`[status-cb] Created new call log: ${newLog?.id}`);
        return newLog?.id || null;
    }
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

        if (!callSid) {
            console.warn('[status-cb] No CallSid, ignoring');
            return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
        }

        const supabase = getSupabaseClient();

        const direction = from.startsWith('client:') ? 'outbound' : 'inbound';
        const phoneNumber = direction === 'inbound' ? from : to;
        const contact = await findContactByPhone(supabase, phoneNumber);

        // Extract userId from client: prefix for outbound calls
        let userId: string | null = null;
        if (direction === 'outbound' && from.startsWith('client:')) {
            userId = from.replace('client:', '');
        }

        // ── RECORDING COMPLETED ──
        if (recordingUrl && (recordingStatus === 'completed' || recordingSid)) {
            console.log(`[status-cb] Recording completed: ${recordingUrl}`);

            // Twilio recording URLs need .mp3 extension for direct playback
            const fullRecordingUrl = recordingUrl.endsWith('.mp3')
                ? recordingUrl
                : `${recordingUrl}.mp3`;

            const logId = await upsertCallLog(supabase, callSid, {
                direction,
                from_number: from.startsWith('client:') ? 'app' : from,
                to_number: to,
                status: 'completed',
                recording_url: fullRecordingUrl,
                recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
                duration_seconds: duration ? parseInt(duration) : null,
                user_id: userId,
                lead_id: contact.type === 'lead' ? contact.id : null,
                customer_id: contact.type === 'customer' ? contact.id : null,
                started_at: new Date().toISOString(),
                ended_at: new Date().toISOString(),
                metadata: {
                    recording_sid: recordingSid,
                    recording_status: recordingStatus,
                    auto_linked: contact.type ? true : false,
                    contact_name: contact.name,
                }
            });

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

            // Map Twilio statuses to our simplified model
            const mappedStatus = callStatus === 'no-answer' && direction === 'inbound' ? 'missed' : callStatus;

            await upsertCallLog(supabase, callSid, {
                direction,
                from_number: from.startsWith('client:') ? 'app' : from,
                to_number: to,
                status: mappedStatus,
                duration_seconds: duration ? parseInt(duration) : null,
                user_id: userId,
                lead_id: contact.type === 'lead' ? contact.id : null,
                customer_id: contact.type === 'customer' ? contact.id : null,
                started_at: new Date().toISOString(),
                ended_at: new Date().toISOString(),
                metadata: {
                    auto_linked: contact.type ? true : false,
                    contact_name: contact.name,
                    original_status: callStatus,
                }
            });
        }

        return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

    } catch (error: any) {
        console.error('[status-cb] ERROR:', error.message);
        // Always return 200 to Twilio to avoid retries
        return new Response(emptyTwiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
});
