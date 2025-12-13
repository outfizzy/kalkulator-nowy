import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Wrap entire logic in a try-catch to avoid 500 Function Invocation Error
    // We want to return a 200 OK with { error: ... } so the client can read the JSON body.
    try {
        let payload: any = {};
        try {
            payload = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON body", details: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { phoneNumber, customerName, installationDate, installationTime, productName, installationId, customerId } = payload;

        console.log('Received Payload:', JSON.stringify(payload));

        // Environment variables - Hardcoded fallback for logic, but prefer Env
        const VAPI_PRIVATE_KEY = (Deno.env.get('VAPI_PRIVATE_KEY') || '6e28ccda-fee2-4159-b761-dd1e927d721c').trim();
        const VAPI_ASSISTANT_ID = (Deno.env.get('VAPI_ASSISTANT_ID') || '5c82ce28-73f7-4942-af4e-814b750104d1').trim();
        const VAPI_PHONE_NUMBER_ID = (Deno.env.get('VAPI_PHONE_NUMBER_ID') || 'cdfa66bc-7955-49ce-9b58-0409226a0f5c').trim();

        // Debug Log (Masked)
        console.log('Config Status:', {
            hasKey: !!VAPI_PRIVATE_KEY,
            keyLen: VAPI_PRIVATE_KEY ? VAPI_PRIVATE_KEY.length : 0,
            assistantId: VAPI_ASSISTANT_ID,
            phoneId: VAPI_PHONE_NUMBER_ID
        });

        if (!VAPI_PRIVATE_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
            return new Response(JSON.stringify({ error: "Missing Vapi Configuration on Server" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (!phoneNumber) {
            return new Response(JSON.stringify({ error: "Missing phoneNumber in payload" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Robust E.164 normalization for Poland/Europe
        // ... (normalization code remains the same)
        let clean = phoneNumber.replace(/[^\d+]/g, '');
        if (clean.startsWith('00')) clean = '+' + clean.substring(2);
        if (clean.startsWith('48') && clean.length === 11) clean = '+' + clean;
        if (clean.length === 9 && !clean.startsWith('+')) clean = '+48' + clean;
        if (!clean.startsWith('+')) clean = '+48' + clean;

        const formattedPhone = clean;

        // ... (Date logic remains)
        const getNextBusinessDay = (date: Date, daysToAdd: number = 1) => {
            const result = new Date(date);
            result.setDate(result.getDate() + daysToAdd);
            if (result.getDay() === 6) result.setDate(result.getDate() + 2);
            if (result.getDay() === 0) result.setDate(result.getDate() + 1);
            return result;
        };

        const originalDate = new Date(installationDate);
        if (isNaN(originalDate.getTime())) {
            return new Response(JSON.stringify({ error: "Invalid installationDate format" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const altDate1 = getNextBusinessDay(originalDate, 1);
        // ... (rest of logic)

        const formatDate = (d: Date) => d.toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' });
        const formatDay = (d: Date) => d.toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

        const getGreeting = () => {
            // ... existing greeting logic
            try {
                const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour: 'numeric', hour12: false });
                const hour = parseInt(formatter.format(new Date()));
                return (hour >= 18 || hour < 5) ? "Dobry wieczór" : "Dzień dobry";
            } catch (e) { return "Dzień dobry"; }
        };
        const greeting = getGreeting();

        const systemPrompt = `
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

**SCENARIUSZ GŁÓWNY:**
1. **Ty:** "${greeting}, tu Sasha z Polendach24! Dzwonię potwierdzić montaż na ${formatDate(originalDate)}. Ekipa będzie między 8 a 10 rano. Czy ten termin Państwu odpowiada?"

**OBSŁUGA ODPOWIEDZI:**

**A. KLIENT POTWIERDZA:**
- Ty: "Świetnie! Termin potwierdzony. Mam jeszcze pytanie: czy mogę w czymś jeszcze pomóc, albo czy prosi Pan o kontakt swojego przedstawiciela handlowego?"
    - **Klient: "Nie, dziękuję" / "Wszystko OK":**
      - Ty: "Dobrze. W takim razie do zobaczenia przy montażu! Miłego dnia."
      - **AKCJA:** \`confirmInstallation(confirmed=true, contactRequested=false)\`
    - **Klient: "Tak, poproszę o kontakt" / "Mam pytanie":**
      - Ty: "Oczywiście, przekażę prośbę do opiekuna. Zadzwoni do Pana. Do zobaczenia!"
      - **AKCJA:** \`confirmInstallation(confirmed=true, contactRequested=true)\`

**B. KLIENT PRZEKŁADA:**
- Ty: "Rozumiem. A czy pasuje ${formatDay(altDate1)}?"
    - Jeśli ustalisz nową datę -> "Super, zapisane. Do zobaczenia!" -> \`rescheduleInstallation(newDate)\`

**C. ODMOWA:**
- Ty: "Rozumiem. Poproszę biuro o kontakt. Do usłyszenia." -> \`rejectInstallation("Kontakt")\`
=========================================
`;

        const WEBHOOK_URL = 'https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/vapi-webhook';

        console.log('Sending request to Vapi...');
        const vapiBody = {
            phoneNumberId: VAPI_PHONE_NUMBER_ID,
            customer: {
                number: formattedPhone,
                name: customerName,
            },
            assistant: {
                firstMessage: `${greeting}, tu Sasha z Polendach24! Dzwonię potwierdzić montaż na ${formatDate(originalDate)}. Ekipa będzie między 8 a 10 rano. Czy ten termin Państwu odpowiada?`,
                firstMessageMode: 'assistant-speaks-first',
                transcriber: { provider: "deepgram", model: "nova-2", language: "pl" },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }],
                    tools: [
                        { type: "function", function: { name: "confirmInstallation", description: "Call when customer confirms the date.", parameters: { type: "object", properties: { confirmed: { type: "boolean" }, contactRequested: { type: "boolean", description: "True if customer wants sales rep to contact them." } }, required: ["confirmed"] } } },
                        { type: "function", function: { name: "rescheduleInstallation", description: "Call when customer wants to change the date.", parameters: { type: "object", properties: { newDate: { type: "string", description: "The new date requested by customer, e.g. 2025-05-20" } }, required: ["newDate"] } } },
                        { type: "function", function: { name: "rejectInstallation", description: "Call when customer cancels without new date.", parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } } }
                    ]
                },
                voice: { provider: "11labs", voiceId: "EXAVITQu4vr4xnSDxMaL", model: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75 },
                analysis: {
                    structuredDataSchema: {
                        type: "object",
                        properties: {
                            installationConfirmed: { type: "boolean", description: "Set to true if the customer confirmed the installation date." },
                            contactRequested: { type: "boolean", description: "Set to true if the customer explicitly asked for a sales representative to contact them (e.g. 'poproszę o kontakt', 'mam pytania')." }
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
                installationDate: installationDate
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

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Vapi API Error:', responseData);
            return new Response(JSON.stringify({ error: "Vapi API Error", details: responseData }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error('Function Critical Error:', error);
        return new Response(JSON.stringify({ error: "Critical Function Error", message: error.message, stack: error.stack }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});

