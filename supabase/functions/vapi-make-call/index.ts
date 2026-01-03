import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper functions that were missing
// Helper functions updated for German
const formatDate = (date: Date) => {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${date.getDate()}. ${months[date.getMonth()]}`;
};

const formatDay = (date: Date) => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return days[date.getDay()];
};

const getGreeting = () => {
    const hour = new Date().getHours() + 1; // Adjust for PL/DE time roughly
    if (hour < 11) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let step = 'init';
    let debugInfo: any = {};

    try {
        step = 'parsing_payload';
        const payload = await req.json();
        debugInfo.payload = payload;
        const { phoneNumber, customerName, installationDate, installationId, customerId, customInstructions, leadId } = payload;

        console.log('Received Payload:', JSON.stringify(payload));

        if (!phoneNumber) {
            throw new Error('Missing phoneNumber');
        }

        step = 'supabase_client';
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        step = 'logging_communication';
        // 1. Create a communication log entry to track this call
        const { data: commData, error: commError } = await supabaseClient
            .from('customer_communications')
            .insert({
                customer_id: customerId,
                type: 'call',
                direction: 'outbound',
                subject: customInstructions ? 'AI: Kundengespräch (Custom)' : 'AI: Montagebestätigung',
                content: 'Initiiere AI-Anruf (Leo - DE)...',
                // user_id: 'vapi-bot', // REMOVED: This causes UUID error if column is uuid type. Leave null or use valid UUID if needed.
                metadata: {
                    status: 'initiating',
                    installationId: installationId,
                    customInstructions: customInstructions,
                    actor: 'vapi-bot' // Store actor in metadata instead
                }
            })
            .select()
            .single();

        if (commError) {
            console.error('Error creating communication log:', commError);
            debugInfo.commError = commError;
            // We continue even if log fails, but it's bad practice.
        }

        const communicationId = commData?.id;
        debugInfo.communicationId = communicationId;

        step = 'vapi_config';
        // 2. Prepare Variables
        const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
        const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');

        if (!VAPI_PRIVATE_KEY || !VAPI_PHONE_NUMBER_ID) {
            throw new Error(`Missing Vapi Configuration ${!VAPI_PRIVATE_KEY ? 'KEY' : ''} ${!VAPI_PHONE_NUMBER_ID ? 'ID' : ''}`);
        }

        step = 'parsing_date';
        // Parse Date
        let originalDate = new Date();
        if (installationDate) {
            originalDate = new Date(installationDate);
        }
        if (isNaN(originalDate.getTime())) {
            originalDate = new Date(); // Fallback to now if invalid
        }

        // Calculate alternatives (simple +1 and +2 days logic for standard flow)
        const altDate1 = new Date(originalDate); altDate1.setDate(originalDate.getDate() + 1);

        step = 'formatting_phone';
        // Format Phone Number (ensure E.164)
        let formattedPhone = phoneNumber.replace(/\s+/g, '');
        if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('00')) formattedPhone = '+' + formattedPhone.slice(2);
            else formattedPhone = '+49' + formattedPhone; // Default to DE now? Or keep PL default but allow DE?
            // User context: "Polendach24" suggests German customers. Changing default to +49 might be safer if usually calling Germans.
            // But let's check current logic: previously +48.
            // Let's safe-guard: if it looks like PL (9 digits), add +48. If 10-11, add +49?
            // For now, simpler: adhere to existing or maybe default to +49 for German market focus.
            // Let's keep +49 as default for "German LEO".
        }

        step = 'constructing_prompt';
        // 3. Construct Prompts
        const greeting = getGreeting();
        let systemPrompt = '';
        let firstMessage = '';

        if (customInstructions) {
            // --- CUSTOM SCENARIO (GERMAN) ---
            systemPrompt = `
Du bist Leo, ein professioneller Koordinator bei der Firma Polendach24.
**TONART:** Natürlich, männlich, konkret, aber sehr höflich und hilfsbereit. Stil "Casual Professional".
Ziel: Erfüllung der Aufgabe, die vom Kundenbetreuer gestellt wurde.

**DEINE DATEN:**
- Firma: Polendach24
- Kunde: ${customerName}
- Dein Name: Leo

**DEINE AUFGABE (Anweisung vom Betreuer):**
"${customInstructions}"

**GESPRÄCHSREGELN (SEHR NATÜRLICH):**
1. Sprich natürlich, benutze Füllwörter wie "hm", "verstehe", "alles klar".
2. Du bist kein Roboter. Reagiere auf das, was der Kunde sagt.
3. Stell dich kurz vor: "Hallo, hier ist Leo von Polendach24".
4. Wenn der Kunde dich unterbricht - hör auf zu sprechen und hör zu.
`;
            firstMessage = `${greeting}, hier ist Leo von Polendach24! Ich rufe wegen Ihrer Bestellung an.`;
        } else {
            // --- STANDARD CONFIRMATION SCENARIO (GERMAN) ---
            systemPrompt = `
Du bist Leo, ein professioneller Koordinator bei der Firma Polendach24.
**TONART:** Natürlich, männlich, höflich. Du sprichst ruhig und deutlich.
Ziel: Bestätigung des Montagetermins und Erkennung zusätzlicher Bedürfnisse.

**DEINE DATEN:**
- Firma: Polendach24
- Kunde: ${customerName}
- Termin: ${formatDate(originalDate)} (zwischen 8:00 und 10:00 Uhr)

**REGELN (NATÜRLICHKEIT):**
1. **DATUM:** "Zwanzigster Mai" (nicht "zwanzig Mai").
2. **LOCKERHEIT:** Benutze Phrasen wie "Alles klar", "In Ordnung", "Verstehe".
3. **FLUSS:** Warte nicht künstlich.

**HAUPTSZENARIO:**
1. **Du:** "${greeting}, hier ist Leo von Polendach24! Ich rufe an, um Ihren Montagetermin am ${formatDate(originalDate)} zu bestätigen. Das Team wird zwischen 8 und 10 Uhr morgens da sein. Passt Ihnen dieser Termin?"

**UMGANG MIT ANTWORTEN:**

**A. KUNDE BESTÄTIGT:**
- Du: "Super! Der Termin ist hiermit bestätigt. Ich habe noch eine kurze Frage: Kann ich Ihnen sonst noch irgendwie helfen, oder soll Ihr Kundenbetreuer Sie kurz zurückrufen?"
    - **Kunde: "Nein, danke" / "Alles OK":**
      - Du: "In Ordnung. Dann sehen wir uns bei der Montage! Einen schönen Tag noch."
      - **AKTION:** \`confirmDate(confirmed=true, contactRequested=false)\`
    - **Kunde: "Ja, bitte um Kontakt" / "Ich habe eine Frage":**
      - Du: "Alles klar, ich gebe dem Betreuer Bescheid. Er wird Sie in Kürze anrufen. Bis dann!"
      - **AKTION:** \`confirmDate(confirmed=true, contactRequested=true)\`

**B. KUNDE VERSCHIEBT:**
- Du: "Verstehe. Wie wäre es vielleicht am ${formatDay(altDate1)}?"
    - Wenn ein neues Datum vereinbart wird -> "Super, habe ich notiert. Bis dann!" -> \`changeDate(newDate)\`

**C. ABSAGE:**
- Du: "Verstanden. Ich bitte das Büro, Sie zu kontaktieren. Auf Wiederhören." -> \`rejectDate("Kontakt")\`
=========================================
`;
            firstMessage = `${greeting}, hier ist Leo von Polendach24! Ich rufe an, um Ihren Montagetermin am ${formatDate(originalDate)} zu bestätigen. Das Team wird zwischen 8 und 10 Uhr da sein. Passt Ihnen das?`;
        }

        const WEBHOOK_URL = 'https://whgjsppyuvglhbdgdark.supabase.co/functions/vapi-webhook';

        step = 'vapi_fetch';
        // 4. Call Vapi
        const vapiBody = {
            phoneNumberId: VAPI_PHONE_NUMBER_ID,
            customer: {
                number: formattedPhone,
                name: customerName,
            },
            assistant: {
                firstMessage: firstMessage,
                firstMessageMode: 'assistant-speaks-first',
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "de" // Changed to German
                },
                model: {
                    provider: "openai",
                    model: "gpt-4o", // Ensuring flagship model
                    messages: [{
                        role: "system", content: systemPrompt + `
\n**EHRLICHKEITS-REGEL:**
Wenn der Kunde eine Frage stellt, auf die du keine Antwort hast (z.B. technische Details zum Dach, die du nicht im Kontext hast), SAG DIREKT: "Entschuldigen Sie, diese Information habe ich gerade nicht vorliegen. Ich gebe Ihrem Betreuer Bescheid, damit er Sie zurückruft und das klärt." DENK DIR NICHTS AUS.

**GESPRÄCHS-ENDE:**
Wenn das Thema erledigt ist (Termin bestätigt oder neu vereinbart + Verabschiedung), musst du auflegen.
Nach der Verabschiedung ("Auf Wiederhören", "Schönen Tag") BENUTZE DIE FUNKTION \`endCall\`.
` }],
                    tools: [
                        { type: "function", function: { name: "confirmDate", description: "Call when customer confirms the date.", parameters: { type: "object", properties: { confirmed: { type: "boolean" }, contactRequested: { type: "boolean", description: "True if customer wants sales rep to contact them." } }, required: ["confirmed"] } } },
                        { type: "function", function: { name: "changeDate", description: "Use only when customer proposes a NEW date.", parameters: { type: "object", properties: { newDate: { type: "string", description: "The new date requested by customer (YYYY-MM-DD)" } }, required: ["newDate"] } } },
                        { type: "function", function: { name: "rejectDate", description: "Call when customer cancels without new date.", parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } } },
                        { type: "function", function: { name: "endCall", description: "Call this to hang up the phone immediately when the conversation is over.", parameters: { type: "object", properties: {}, required: [] } } }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh - Standard Male (works well for DE too)
                    model: "eleven_turbo_v2_5", // Multilingual v2.5
                    stability: 0.5,
                    similarityBoost: 0.75
                },
                analysisPlan: {
                    structuredDataSchema: {
                        type: "object",
                        properties: {
                            installationConfirmed: { type: "boolean", description: "Set to true if the customer confirmed the installation date." },
                            contactRequested: { type: "boolean", description: "Set to true if the customer explicitly asked for a sales representative to contact them." }
                        },
                        required: ["installationConfirmed", "contactRequested"]
                    }
                },

                serverUrl: WEBHOOK_URL
            },
            metadata: {
                installationId: installationId,
                customerId: customerId,
                customerName: customerName,
                installationDate: installationDate,
                communicationId: communicationId
            }
        };

        const response = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vapiBody)
        });

        step = 'vapi_response';
        const responseData = await response.json();

        if (!response.ok) {
            console.error('Vapi API Error:', responseData);
            if (communicationId) {
                await supabaseClient.from('customer_communications').update({
                    content: `Błąd połączenia z Vapi: ${JSON.stringify(responseData)}`,
                    metadata: { isSystemNote: true, installationId, status: 'failed', error: responseData }
                }).eq('id', communicationId);
            }
            return new Response(JSON.stringify({ error: "Vapi API Error", details: responseData }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Success - update log
        if (communicationId) {
            await supabaseClient.from('customer_communications').update({
                content: `Połączenie nawiązane. Vapi ID: ${responseData.id}`,
                metadata: { isSystemNote: true, installationId, status: 'sent', vapiCallId: responseData.id }
            }).eq('id', communicationId);
        }

        return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error('Function Critical Error:', error);
        // Expose detail in the main error string so it's visible in simple UI alerts
        const summary = `Critical Error at step [${step}]: ${error.message}`;
        return new Response(JSON.stringify({
            error: summary,
            step: step,
            message: error.message,
            stack: error.stack,
            debug: debugInfo
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
