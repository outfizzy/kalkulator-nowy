import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper functions that were missing
const formatDate = (date: Date) => {
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
};

const formatDay = (date: Date) => {
    const days = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
    return days[date.getDay()];
};

const getGreeting = () => {
    const hour = new Date().getHours() + 1; // Adjust for PL time roughly if cleaner not available
    return (hour < 18) ? 'Dzień dobry' : 'Dobry wieczór';
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
                subject: customInstructions ? 'AI: Rozmowa Niestandardowa' : 'AI: Potwierdzenie montażu',
                content: 'Inicjowanie połączenia AI...',
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
            else formattedPhone = '+48' + formattedPhone; // Default to PL
        }

        step = 'constructing_prompt';
        // 3. Construct Prompts
        const greeting = getGreeting();
        let systemPrompt = '';
        let firstMessage = '';

        if (customInstructions) {
            // --- CUSTOM SCENARIO ---
            systemPrompt = `
Jesteś Sashą, profesjonalną koordynatorką w firmie Polendach24. 
**TON:** Bardzo pozytywny, uśmiechnięty, entuzjastyczny i pomocny.
Cel: Wykonanie zadania zleconego przez opiekuna klienta.

**TWOJE DANE:**
- Firma: Polendach24
- Klient: ${customerName}

**TWOJE ZADANIE (Instrukcja od opiekuna):**
"${customInstructions}"

**ZASADY:**
1. Przedstaw się krótko (Sasha z Polendach24).
2. Przejdź od razu do realizacji zadania.
3. Bądź uprzejma i pomocna.
4. Jesteś asystentem AI, ale zachowuj się naturalnie.
`;
            firstMessage = `${greeting}, tu Sasha z Polendach24! Dzwonię w sprawie Twojego zamówienia.`;
        } else {
            // --- STANDARD CONFIRMATION SCENARIO ---
            systemPrompt = `
Jesteś Sashą, profesjonalną koordynatorką w firmie Polendach24. 
**TON:** Bardzo pozytywny, uśmiechnięty, entuzjastyczny i pomocny.
Cel: Potwierdzenie terminu montażu oraz zbadanie dodatkowych potrzeb.

**TWOJE DANE:**
- Firma: Polendach24
- Klient: ${customerName}
- Termin: ${formatDate(originalDate)} (godziny 8:00 - 10:00)

**ZASADY:**
1. **ODMIANA:** "Dwudziestego marca" (nie "dwudziesty").
2. **PŁYNNOŚĆ:** Mów ciągiem, nie czekaj na "halo".
3. **KONTEKST:** Jeśli klient potwierdzi, zapytaj czy ma pytania do opiekuna.

**SCENARIUSZ GŁÓWNY:**
1. **Ty:** "${greeting}, tu Sasha z Polendach24! Dzwonię potwierdzić montaż na ${formatDate(originalDate)}. Ekipa będzie między 8 a 10 rano. Czy ten termin Państwu odpowiada?"

**OBSŁUGA ODPOWIEDZI:**

**A. KLIENT POTWIERDZA:**
- Ty: "Świetnie! Termin potwierdzony. Mam jeszcze pytanie: czy mogę w czymś jeszcze pomóc, albo czy prosi Pan o kontakt swojego przedstawiciela handlowego?"
    - **Klient: "Nie, dziękuję" / "Wszystko OK":**
      - Ty: "Dobrze. W takim razie do zobaczenia przy montażu! Miłego dnia."
      - **AKCJA:** \`confirmDate(confirmed=true, contactRequested=false)\`
    - **Klient: "Tak, poproszę o kontakt" / "Mam pytanie":**
      - Ty: "Oczywiście, przekażę prośbę do opiekuna. Zadzwoni do Pana. Do zobaczenia!"
      - **AKCJA:** \`confirmDate(confirmed=true, contactRequested=true)\`

**B. KLIENT PRZEKŁADA:**
- Ty: "Rozumiem. A czy pasuje ${formatDay(altDate1)}?"
    - Jeśli ustalisz nową datę -> "Super, zapisane. Do zobaczenia!" -> \`changeDate(newDate)\`

**C. ODMOWA:**
- Ty: "Rozumiem. Poproszę biuro o kontakt. Do usłyszenia." -> \`rejectDate("Kontakt")\`
=========================================
`;
            firstMessage = `${greeting}, tu Sasha z Polendach24! Dzwonię potwierdzić montaż na ${formatDate(originalDate)}. Ekipa będzie między 8 a 10 rano. Czy ten termin Państwu odpowiada?`;
        }

        const WEBHOOK_URL = 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/vapi-webhook';

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
                transcriber: { provider: "deepgram", model: "nova-2", language: "pl" },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }],
                    tools: [
                        { type: "function", function: { name: "confirmDate", description: "Call when customer confirms the date.", parameters: { type: "object", properties: { confirmed: { type: "boolean" }, contactRequested: { type: "boolean", description: "True if customer wants sales rep to contact them." } }, required: ["confirmed"] } } },
                        { type: "function", function: { name: "changeDate", description: "Call when customer wants to change the date.", parameters: { type: "object", properties: { newDate: { type: "string", description: "The new date requested by customer, e.g. 2025-05-20" } }, required: ["newDate"] } } },
                        { type: "function", function: { name: "rejectDate", description: "Call when customer cancels without new date.", parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } } }
                    ]
                },
                voice: { provider: "11labs", voiceId: "EXAVITQu4vr4xnSDxMaL", model: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75 },
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
