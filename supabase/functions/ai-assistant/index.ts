import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System Prompt
const SYSTEM_PROMPT = `
Jesteś Wirtualnym Asystentem Sprzedaży w firmie zajmującej się zadaszeniami aluminiowymi (tarasowymi), ogrodami zimowymi i systemami osłonowymi (markizy, refleksole).
Twoim celem jest pomaganie pracownikom (Adminom, Managerom, Handlowcom) w ich codziennej pracy.

Twoje kompetencje:
1. WIEDZA O FIRMIE I PRODUKTACH: Masz dostęp do pełnej bazy danych.
   - Klienci: 'search_knowledge' (typ: 'crm')
   - Oferty: 'search_knowledge' (typ: 'offers') - sprawdzaj statusy, kwoty.
   - Umowy: 'search_knowledge' (typ: 'contracts') - terminy, statusy.
   - Montaże/Kalendarz: 'search_knowledge' (typ: 'installations') - planowane montaże.
   - Produkty/Ceny: 'search_knowledge' (typ: 'products').

2. Kalkulacje: Potrafisz przeliczać wymiary szkła dla danego dachu (używając narzędzia 'calculate_glass').
3. Wizualizacje: Generujesz wizualizacje "NanoBanana" (Tool: generate_visualization).

System komunikacji: Profesjonalny, zwięzły, pomocny. W języku polskim.
Wizualizacje: Jeśli użytkownik poprosi o wizualizację dachu, użyj 'generate_visualization'.

KONTEKST UI:
Użytkownik może przesyłać informacje o tym co widzi na ekranie w formacie "[Context: { ... }]".
- "path": ścieżka URL (np. /offers/123).
- "entityId": ID obiektu (np. ID oferty).
Wykorzystuj to! Jeśli użytkownik pisze "zmień cenę w tej ofercie", a w kontekście jest ID oferty, użyj go Domyślnie.
Nie pytaj "o którą ofertę chodzi", jeśli masz ID w kontekście.

FORMATOWANIE (RICH UI):
- Używaj Markdown do formatowania odpowiedzi.
- Najważniejsze dane w **pogrubieniu**.
- Listy punktowane dla wyliczeń.
- TABELE dla zestawień cenowych, kosztorysów i list produktów.
- Jeśli odnosisz się do innego zasobu (oferty, klienta), podawaj linki w formacie '[Tekst](URL)'. Np. '[Oferta #123](/offers/123)'. Nasz frontend zamieni je na aktywne przyciski nawigacji.
`;

// Tools Schema
const tools = [
    {
        type: "function",
        function: {
            name: "calculate_glass",
            description: "Oblicz wymiary i ilość potrzebnych szyb dla zadaszenia.",
            parameters: {
                type: "object",
                properties: {
                    roofWidth: { type: "number", description: "Szerokość całkowita zadaszenia w mm" },
                    roofProjection: { type: "number", description: "Wysięg/Głębokość zadaszenia w mm" },
                    rafterCount: { type: "number", description: "Liczba krokwi (opcjonalne)" }
                },
                required: ["roofWidth", "roofProjection"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_visualization",
            description: "Wygeneruj wizualizację (NanoBanana) zadaszenia na podstawie opisu.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Szczegółowy opis wizualizacji (uwzględnij otoczenie ze zdjęcia jeśli dostępne)" }
                },
                required: ["prompt"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_knowledge",
            description: "Przeszukaj bazę wiedzy firmy (CRM, Oferty, Umowy, Kalendarz, Produkty).",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Fraza wyszukiwania (np. numer oferty, nazwisko, data YYYY-MM-DD)" },
                    category: {
                        type: "string",
                        enum: ["crm", "products", "offers", "contracts", "installations"],
                        description: "Kategoria wiedzy"
                    }
                },
                required: ["query", "category"]
            }
        }
    }
];

// Tool Implementations
function calculateGlass(args: any) {
    const { roofWidth, roofProjection, rafterCount } = args;
    const divisions = rafterCount ? (rafterCount - 1) : Math.ceil(roofWidth / 800);
    const actualRafterCount = divisions + 1;

    return JSON.stringify({
        numberOfPanels: divisions,
        approxPanelWidth: Math.floor((roofWidth - (actualRafterCount * 60)) / divisions),
        length: roofProjection - 50,
        note: "Wymiary orientacyjne. Sprawdź specyfikację."
    });
}

async function searchKnowledge(args: any, supabase: any) {
    const { query, category } = args;

    try {
        if (category === 'crm') {
            let dbQuery = supabase.from('customers').select('id, first_name, last_name, email, city, phone');

            if (query.trim().includes(' ')) {
                // Handle "Hubert Kościów" -> split into parts
                const parts = query.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const p1 = parts[0];
                    const p2 = parts[parts.length - 1]; // Take last part as surname roughly
                    // Try (First=p1 AND Last=p2) OR (First=p2 AND Last=p1)
                    dbQuery = dbQuery.or(`and(first_name.ilike.%${p1}%,last_name.ilike.%${p2}%),and(first_name.ilike.%${p2}%,last_name.ilike.%${p1}%)`);
                } else {
                    dbQuery = dbQuery.or(`last_name.ilike.%${query}%,first_name.ilike.%${query}%,email.ilike.%${query}%`);
                }
            } else {
                dbQuery = dbQuery.or(`last_name.ilike.%${query}%,first_name.ilike.%${query}%,email.ilike.%${query}%`);
            }

            const { data: customers, error } = await dbQuery.limit(5);

            if (error) throw error;
            return JSON.stringify({ customers });
        }

        if (category === 'offers') {
            const { data: offers, error } = await supabase
                .from('offers')
                .select('offer_number, status, pricing, customer_data, created_at')
                .or(`offer_number.ilike.%${query}%,customer_data->>lastName.ilike.%${query}%`) // Basic search
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;
            return JSON.stringify({ offers });
        }

        if (category === 'contracts') {
            const { data: contracts, error } = await supabase
                .from('contracts')
                .select('contract_number, status, total_amount, installation_date, offer_id')
                .or(`contract_number.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;
            return JSON.stringify({ contracts });
        }

        if (category === 'installations') {
            // Calendar search
            let dbQuery = supabase
                .from('installations')
                .select(`
                    id, 
                    scheduled_date, 
                    status, 
                    installer_name,
                    offers (
                        offer_number,
                        customer_data
                    )
                `);

            if (query.match(/^\d{4}-\d{2}/)) {
                dbQuery = dbQuery.gte('scheduled_date', query);
            } else if (query.toLowerCase().includes('upcoming') || query.length < 3) {
                dbQuery = dbQuery.gte('scheduled_date', new Date().toISOString().split('T')[0]);
            } else {
                // Try to filter by installer name or just fetch all and filter in memory (safer for complex joins)
                // Or add filtering for installer_name
                dbQuery = dbQuery.or(`installer_name.ilike.%${query}%`);
            }

            const { data: installations, error } = await dbQuery
                .order('scheduled_date', { ascending: true })
                .limit(5);

            if (error) throw error;

            // Map to cleaner format for AI
            const formatted = installations.map((i: any) => ({
                id: i.id,
                date: i.scheduled_date,
                status: i.status,
                installer: i.installer_name,
                city: i.offers?.customer_data?.city || 'Brak danych',
                client: i.offers?.customer_data?.lastName || 'Brak danych'
            }));

            return JSON.stringify({ installations: formatted });
        }

        if (category === 'products') {
            const { data: costs, error } = await supabase
                .from('supplier_costs')
                .select('*')
                .limit(10);

            if (error) return JSON.stringify({ error: "Błąd dostępu do bazy produktów", details: error.message });

            const filtered = costs.filter((c: any) => JSON.stringify(c).toLowerCase().includes(query.toLowerCase()));
            return JSON.stringify({ products: filtered.slice(0, 5) });
        }

        return JSON.stringify({ result: "Nie znaleziono danych." });
    } catch (e: any) {
        return JSON.stringify({ error: `Search failed: ${e.message}` });
    }
}

async function generateVisualization(args: any, openAiKey: string) {
    // NanoBanana Implementation Wrapper
    // Using DALL-E 3 as the engine but responding as "NanoBanana System"

    try {
        console.log("NanoBanana Request:", args.prompt);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `Architectural visualization, photorealistic 8k, NanoBanana Style: ${args.prompt}`,
                n: 1,
                size: "1024x1024"
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return JSON.stringify({
            url: data.data[0].url,
            note: "Wizualizacja NanoBanana (AI Generated)."
        });
    } catch (e: any) {
        return JSON.stringify({ error: `NanoBanana generation failed: ${e.message}` });
    }
}


Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages } = await req.json();

        // Initialize Supabase Client for Tool Access
        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

        // Sanitize Messages
        const sanitizedMessages = messages
            .filter((m: any) => m && m.role && (m.content || m.tool_calls)) // Must have content or be a tool call
            .map((m: any) => ({
                role: m.role,
                content: m.content || "", // Ensure string or array, not null
                tool_calls: m.tool_calls,
                tool_call_id: m.tool_call_id,
                name: m.name
            }));

        // 1. First Call to LLM
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...sanitizedMessages
                ],
                tools: tools,
                tool_choice: "auto"
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('OpenAI Error:', data.error);
            throw new Error(`OpenAI API Error: ${data.error.message}`);
        }

        if (!data.choices || data.choices.length === 0) {
            console.error('No choices returned:', data);
            throw new Error('OpenAI returned no choices');
        }

        const choice = data.choices[0];
        const message = choice.message;

        // 2. Handle Tool Calls
        if (message.tool_calls) {
            const toolCalls = message.tool_calls;
            const functionResponses = [];

            for (const toolCall of toolCalls) {
                let result = "";
                const args = JSON.parse(toolCall.function.arguments);

                if (toolCall.function.name === 'calculate_glass') {
                    result = calculateGlass(args);
                } else if (toolCall.function.name === 'search_knowledge') {
                    result = await searchKnowledge(args, supabaseClient);
                } else if (toolCall.function.name === 'generate_visualization') {
                    result = await generateVisualization(args, apiKey);
                }

                functionResponses.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: result
                });
            }

            // 3. Second Call to LLM with results
            const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...sanitizedMessages, // CORRECTION: Use sanitized messages here too!
                        message, // Assistant's tool call request
                        ...functionResponses // Tool results
                    ]
                }),
            });

            const secondData = await secondResponse.json();

            if (secondData.error) {
                console.error('OpenAI Error (2nd call):', secondData.error);
                throw new Error(`OpenAI API Error (Tool): ${secondData.error.message}`);
            }

            if (!secondData.choices || secondData.choices.length === 0) {
                throw new Error('OpenAI returned no choices after tool execution');
            }

            return new Response(JSON.stringify(secondData.choices[0].message), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            // No tool call, just return text
            return new Response(JSON.stringify(message), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }


    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
