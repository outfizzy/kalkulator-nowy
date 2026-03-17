import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * analyze-call-recording — Downloads Twilio recording, transcribes with Whisper, summarizes with GPT
 * 
 * Called by voice-status-callback when a recording is completed.
 * Input: { callSid, recordingUrl }
 */

function getSupabaseClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
}

async function downloadRecording(recordingUrl: string): Promise<Blob> {
    // Twilio recordings require Account SID + Auth Token for auth
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

    const url = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;

    const response = await fetch(url, {
        headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
}

async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${err}`);
    }

    return await response.text();
}

async function summarizeWithGPT(transcription: string): Promise<{
    summary: string;
    action_items: string[];
    sentiment: string;
    language: string;
}> {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

    const systemPrompt = `Jesteś asystentem CRM analizującym rozmowy telefoniczne firmy produkującej zadaszenia aluminiowe (patio covers, pergole).
Twoje zadanie to przeanalizować transkrypcję rozmowy i zwrócić JSON z:
1. "summary" - zwięzłe podsumowanie rozmowy (2-4 zdania, po polsku)
2. "action_items" - lista konkretnych działań do wykonania (po polsku)
3. "sentiment" - nastrój klienta: "positive", "neutral" lub "negative"
4. "language" - język w jakim odbyła się rozmowa (np. "de", "pl", "en")

Odpowiedz TYLKO poprawnym JSON-em, bez dodatkowego tekstu.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Transkrypcja rozmowy:\n\n${transcription}` },
            ],
            temperature: 0.3,
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`GPT API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    try {
        // Try to parse JSON, handle potential markdown wrapping
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {
            summary: content,
            action_items: [],
            sentiment: 'neutral',
            language: 'unknown',
        };
    }
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();

        // ── MODE 1: Extract contact info from transcription ──
        if (body.extractContact && body.transcription) {
            console.log('[analyze] Extract contact mode');
            const openaiKey = Deno.env.get('OPENAI_API_KEY');
            if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

            const extractPrompt = `Przeanalizuj transkrypcję rozmowy telefonicznej i wyciągnij dane kontaktowe klienta.
Zwróć JSON z polami:
- "firstName" - imię klienta
- "lastName" - nazwisko klienta
- "email" - adres email (jeśli padł w rozmowie)
- "company" - nazwa firmy (jeśli padła)
- "address" - adres (ulica, miasto, kod pocztowy - jeśli padł)

Jeśli dane nie padły w rozmowie, zostaw pusty string.
Odpowiedz TYLKO poprawnym JSON-em.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: extractPrompt },
                        { role: 'user', content: `Transkrypcja:\n\n${body.transcription}\n\nNumer telefonu: ${body.phoneNumber || ''}` },
                    ],
                    temperature: 0.2,
                    max_tokens: 500,
                }),
            });

            if (!response.ok) throw new Error(`GPT error: ${response.status}`);
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '{}';
            let contact;
            try {
                contact = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
            } catch {
                contact = { firstName: '', lastName: '', email: '', company: '', address: '' };
            }

            return new Response(JSON.stringify({ success: true, contact }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── MODE 2: Full recording analysis ──
        const { callSid, recordingUrl } = body;

        if (!callSid || !recordingUrl) {
            return new Response(JSON.stringify({ error: 'Missing callSid or recordingUrl' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[analyze] Starting analysis for CallSid=${callSid}`);
        const supabase = getSupabaseClient();

        // 1. Download recording from Twilio
        console.log(`[analyze] Downloading recording: ${recordingUrl}`);
        const audioBlob = await downloadRecording(recordingUrl);
        console.log(`[analyze] Downloaded ${(audioBlob.size / 1024).toFixed(1)} KB`);

        // 2. Transcribe with Whisper
        console.log('[analyze] Transcribing with Whisper...');
        const transcription = await transcribeWithWhisper(audioBlob);
        console.log(`[analyze] Transcription: ${transcription.substring(0, 200)}...`);

        // 3. Summarize with GPT
        console.log('[analyze] Summarizing with GPT...');
        let analysis = { summary: '', action_items: [] as string[], sentiment: 'neutral', language: 'unknown' };

        if (transcription.trim().length > 10) {
            analysis = await summarizeWithGPT(transcription);
        } else {
            analysis.summary = 'Rozmowa zbyt krótka do analizy.';
        }
        console.log(`[analyze] Summary: ${analysis.summary}`);

        // 4. Save to call_logs
        const { data: existing } = await supabase
            .from('call_logs')
            .select('id, metadata')
            .eq('twilio_call_sid', callSid)
            .limit(1);

        if (existing && existing.length > 0) {
            const existingMetadata = existing[0].metadata || {};
            await supabase
                .from('call_logs')
                .update({
                    transcription: transcription,
                    summary: analysis.summary,
                    ai_summary: JSON.stringify(analysis),
                    ai_analyzed_at: new Date().toISOString(),
                    sentiment: analysis.sentiment,
                    metadata: {
                        ...existingMetadata,
                        action_items: analysis.action_items,
                        language: analysis.language,
                        analyzed_at: new Date().toISOString(),
                    }
                })
                .eq('twilio_call_sid', callSid);
            console.log(`[analyze] Saved analysis to call_log ${existing[0].id}`);
        } else {
            console.warn(`[analyze] No call_log found for CallSid=${callSid}`);
        }

        return new Response(JSON.stringify({
            success: true,
            callSid,
            transcription_length: transcription.length,
            summary: analysis.summary,
            sentiment: analysis.sentiment,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[analyze] ERROR:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
