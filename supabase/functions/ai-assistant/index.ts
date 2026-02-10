import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System Prompt
const SYSTEM_PROMPT = `
Jesteś **Ekspertem Wsparcia Sprzedaży (World-Class Sales Assistant)** w wiodącej firmie z branży zadaszeń aluminiowych (TGA Metal / Polendach24).
Twoim celem jest nie tylko odpowiadanie na pytania, ale **aktywne wspieranie handlowców** w zamykaniu sprzedaży, optymalizacji ofert i obsłudze klienta.

### Twoja Rola i Osobowość:
- **Ekspert Techniczny**: Znasz wszystkie produkty i ich specyfikacje techniczne
- **Strateg Sprzedaży**: Sugerujesz cross-selling i upselling (np. "Do tej pergoli warto dodać promiennik")
- **Proaktywny**: Sprawdzasz marże (optymalna >25%), przypominasz o follow-upach
- **Ton**: Profesjonalny, zwięzły, pewny siebie, ale przyjazny

### Katalog Produktów:

**PERGOLE BIOKLIMATYCZNE:**
- **TopLine** - Premium, aluminiowa, lamele obrotowe 90°, silniki Somfy
- **TrendLine** - Standard, solidna konstrukcja, dobry stosunek ceny do jakości
- **SkyLine** - Luksusowa, najwyższa jakość, dodatkowe opcje
- **UltraStyle** - Nowoczesny design, minimalistyczna

**ZADASZENIA SZKLANE:**
- **TrendStyle** - Klasyczne zadaszenie szklane
- **SkyStyle** - Premium szklane z dodatkowymi opcjami
- **OrangeStyle** - Ogród zimowy, pełne przeszklenie

**OGRODZENIA:**
- **WPC** - Kompozyt drewna, dostępne wysokości: 1.65m, 1.80m, 1.95m
- **Panele aluminiowe** - Nowoczesne, różne wzory (Moderne, Plasma, Classic)
- **Bramy przesuwne** - Automatyczne, różne wzory

**DODATKI:**
- Markizy (Komfort)
- Oświetlenie LED
- Promienniki podczerwieni
- Rolety ZIP Screen
- Ścianki boczne i frontowe
- Drzwi przesuwne (Schiebetür)

### Twoje Narzędzia:
1. **search_knowledge** - Szukaj w CRM, ofertach, umowach, kalendarzach
2. **check_inventory** - Sprawdź stany magazynowe
3. **calculate_glass** - Oblicz wymiary szkła
4. **generate_visualization** - Generuj wizualizacje (DALL-E 3)
5. **draft_email** - Napisz profesjonalny email do klienta
6. **calculate_margin** - Oblicz marżę na ofercie
7. **suggest_upsell** - Zaproponuj dodatkowe produkty

### Zasady Formatowania Odpowiedzi:

**Używaj Markdown:**
- **Pogrubienia** dla kluczowych liczb, kwot, dat
- *Kursywa* dla uwag i notatek
- Listy numerowane dla kroków/instrukcji
- Listy punktowane dla opcji/wyborów
- Tabele dla porównań produktów
- Bloki kodu dla danych technicznych

**Przykład dobrej odpowiedzi:**

> Dla pergoli TopLine 4x3m w kolorze antracyt:
> 
> **Cena:** 28 500 PLN netto (35 055 PLN brutto)
> **Termin:** 4-6 tygodni
> 
> **Polecam dodać:**
> - Oświetlenie LED (1 200 PLN)
> - Promiennik (2 800 PLN)
> 
> | Produkt | Cena netto | Marża |
> |---------|-----------|-------|
> | TopLine 4x3m | 28 500 PLN | 32% |
> | + LED | 1 200 PLN | 40% |
> | + Promiennik | 2 800 PLN | 35% |
> 
> **Następny krok:** Czy przygotować ofertę dla klienta?

### Pisanie Maili:

Kiedy piszesz email, użyj tego formatu:

**Temat:** [Zwięzły, konkretny]

**Treść:**
- Rozpocznij od imienia klienta
- Krótkie wprowadzenie (1-2 zdania)
- Konkretne informacje (ceny, terminy, specyfikacja)
- Call to action (co klient ma zrobić)
- Profesjonalne zakończenie

**Przykład:**

> Temat: Oferta pergoli TopLine 4x3m - Pan Kowalski
> 
> Dzień dobry Panie Janie,
> 
> Dziękuję za zainteresowanie naszymi pergolami. Zgodnie z naszą rozmową, przesyłam szczegóły oferty:
> 
> **Pergola TopLine 4x3m**
> - Kolor: Antracyt (RAL 7016)
> - Silnik: Somfy IO
> - Cena: 28 500 PLN netto (35 055 PLN brutto)
> - Termin realizacji: 4-6 tygodni
> 
> W cenie:
> ✓ Montaż
> ✓ Transport
> ✓ Gwarancja 5 lat
> 
> Czy mogę umówić się na pomiar w przyszłym tygodniu?
> 
> Pozdrawiam,
> [Imię Handlowca]

### Obliczanie Marży:

Optymalna marża: **25-35%**
- Poniżej 20% - za nisko, negocjuj
- 20-25% - akceptowalne dla dużych zamówień
- 25-35% - optymalne
- Powyżej 35% - świetnie!

Formula: Margin = ((Sale Price - Cost) / Sale Price) * 100

### Kontekst Firmowy:
- Firma: TGA Metal / Polendach24
- Rynek: Polska (głównie południe)
- Silniki: Somfy (IO / RTS)
- Dostawy: 4-6 tygodni standardowo
- Gwarancja: 5 lat na konstrukcję
- Montaż: W cenie (w promieniu 100km)

**ZAWSZE:**
1. Sprawdź kontekst użytkownika (jaka strona, jaki klient)
2. Formatuj odpowiedzi w markdown
3. Podawaj konkretne liczby i daty
4. Sugeruj kolejne kroki
5. Maksymalizuj wartość dla klienta i firmy
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
            description: "Wygeneruj wizualizację (DALL-E 3) zadaszenia na podstawie opisu.",
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
    },
    {
        type: "function",
        function: {
            name: "check_inventory",
            description: "Sprawdź stan magazynowy (dostępność) produktów.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nazwa produktu/komponentu (np. 'Silnik Somfy', 'Profil 120')" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "draft_email",
            description: "Wygeneruj profesjonalny email do klienta na podstawie kontekstu.",
            parameters: {
                type: "object",
                properties: {
                    purpose: {
                        type: "string",
                        enum: ["followup", "offer", "reminder", "thank_you", "technical"],
                        description: "Cel emaila"
                    },
                    customerName: { type: "string", description: "Imię i nazwisko klienta" },
                    context: { type: "string", description: "Dodatkowy kontekst (np. numer oferty, produkt, szczegóły)" }
                },
                required: ["purpose", "customerName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "calculate_margin",
            description: "Oblicz marżę na podstawie ceny sprzedaży i kosztu.",
            parameters: {
                type: "object",
                properties: {
                    salePrice: { type: "number", description: "Cena sprzedaży (netto)" },
                    cost: { type: "number", description: "Koszt zakupu/produkcji (netto)" }
                },
                required: ["salePrice", "cost"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "suggest_upsell",
            description: "Zaproponuj dodatkowe produkty/usługi do sprzedaży krzyżowej.",
            parameters: {
                type: "object",
                properties: {
                    mainProduct: { type: "string", description: "Główny produkt (np. 'TopLine 4x3m')" },
                    budget: { type: "number", description: "Budżet klienta (opcjonalnie)" }
                },
                required: ["mainProduct"]
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

function draftEmail(args: any) {
    const { purpose, customerName, context } = args;

    const templates = {
        followup: {
            subject: `Follow-up - ${customerName}`,
            body: `Dzień dobry ${customerName},\n\nDziękuję za wczorajszą rozmowę. Chciałem się upewnić, czy ma Pan/Pani jakieś dodatkowe pytania dotyczące naszej oferty?\n\n${context || 'Jestem do dyspozycji w razie jakichkolwiek wątpliwości.'}\n\nPozdrawiam,\n[Imię Handlowca]\nTGA Metal / Polendach24`
        },
        offer: {
            subject: `Oferta - ${customerName}`,
            body: `Dzień dobry ${customerName},\n\nPrzesyłam szczegóły oferty zgodnie z naszą rozmową:\n\n${context || '[Szczegóły oferty]'}\n\n**W cenie:**\n✓ Montaż\n✓ Transport\n✓ Gwarancja 5 lat\n\nOferta ważna 30 dni. Czy mogę umówić się na pomiar?\n\nPozdrawiam,\n[Imię Handlowca]`
        },
        reminder: {
            subject: `Przypomnienie - ${customerName}`,
            body: `Dzień dobry ${customerName},\n\nPrzypominam o naszej ofercie z dnia [data]. ${context || 'Oferta ważna jeszcze przez [X] dni.'}\n\nCzy mogę w czymś pomóc w podjęciu decyzji?\n\nPozdrawiam,\n[Imię Handlowca]`
        },
        thank_you: {
            subject: `Dziękujemy - ${customerName}`,
            body: `Dzień dobry ${customerName},\n\nDziękujemy za wybor naszej firmy! ${context || 'Cieszymy się, że możemy zrealizować Twoją inwestycję.'}\n\nW razie jakichkolwiek pytań, jestem do dyspozycji.\n\nPozdrawiam,\n[Imię Handlowca]`
        },
        technical: {
            subject: `Informacje techniczne - ${customerName}`,
            body: `Dzień dobry ${customerName},\n\nW odpowiedzi na Pana/Pani pytanie:\n\n${context || '[Szczegóły techniczne]'}\n\nCzy to wyjaśnia wątpliwości?\n\nPozdrawiam,\n[Imię Handlowca]`
        }
    };

    const template = templates[purpose as keyof typeof templates] || templates.followup;

    return JSON.stringify({
        subject: template.subject,
        body: template.body,
        note: "Szablon emaila - dostosuj według potrzeb przed wysłaniem."
    });
}

function calculateMargin(args: any) {
    const { salePrice, cost } = args;

    if (salePrice <= 0 || cost < 0) {
        return JSON.stringify({ error: "Nieprawidłowe wartości. Cena sprzedaży musi być > 0, koszt >= 0." });
    }

    const marginPercent = ((salePrice - cost) / salePrice) * 100;
    const profit = salePrice - cost;

    let recommendation = "";
    if (marginPercent < 20) {
        recommendation = "⚠️ **Za niska marża!** Rozważ renegocjację ceny lub kosztów.";
    } else if (marginPercent < 25) {
        recommendation = "🟡 **Akceptowalna** - OK dla dużych zamówień.";
    } else if (marginPercent <= 35) {
        recommendation = "✅ **Optymalna marża** - świetnie!";
    } else {
        recommendation = "🎉 **Wyjątkowa marża** - doskonały wynik!";
    }

    return JSON.stringify({
        marginPercent: marginPercent.toFixed(2) + "%",
        profit: profit.toFixed(2) + " PLN",
        recommendation: recommendation,
        breakdown: {
            salePrice: salePrice + " PLN",
            cost: cost + " PLN",
            profit: profit + " PLN"
        }
    });
}

function suggestUpsell(args: any) {
    const { mainProduct, budget } = args;

    const suggestions: any = {
        "TopLine": [
            { product: "Oświetlenie LED", price: "1 200 PLN", reason: "Wydłuża użytkowanie pergoli wieczorami" },
            { product: "Promiennik podczerwieni", price: "2 800 PLN", reason: "Umożliwia korzystanie wiosną/jesienią" },
            { product: "Ścianki boczne", price: "3 500 PLN", reason: "Ochrona przed wiatrem i deszczem" },
            { product: "Rolety ZIP Screen", price: "4 200 PLN", reason: "Ochrona przed słońcem i owadami" }
        ],
        "TrendLine": [
            { product: "Oświetlenie LED", price: "1 000 PLN", reason: "Podstawowe oświetlenie" },
            { product: "Promiennik", price: "2 500 PLN", reason: "Komfort w chłodniejsze dni" },
            { product: "Markiza", price: "2 200 PLN", reason: "Dodatkowa ochrona przed słońcem" }
        ],
        "SkyLine": [
            { product: "System audio", price: "3 500 PLN", reason: "Premium experience" },
            { product: "Inteligentne sterowanie", price: "2 000 PLN", reason: "Automatyzacja przez aplikację" },
            { product: "Promienniki premium", price: "4 500 PLN", reason: "Najwyższa jakość ogrzewania" }
        ],
        "WPC": [
            { product: "Brama przesuwna", price: "8 500 PLN", reason: "Kompletne ogrodzenie" },
            { product: "Furtka", price: "2 200 PLN", reason: "Wygodne wejście" },
            { product: "Oświetlenie ogrodzenia", price: "1 500 PLN", reason: "Bezpieczeństwo i estetyka" }
        ],
        "default": [
            { product: "Oświetlenie LED", price: "1 200 PLN", reason: "Uniwersalny dodatek" },
            { product: "Gwarancja rozszerzona", price: "800 PLN", reason: "Dodatkowy spokój" }
        ]
    };

    // Find matching product category
    let productSuggestions = suggestions.default;
    for (const key in suggestions) {
        if (mainProduct.toLowerCase().includes(key.toLowerCase())) {
            productSuggestions = suggestions[key];
            break;
        }
    }

    // Filter by budget if provided
    if (budget) {
        productSuggestions = productSuggestions.filter((s: any) => {
            const price = parseFloat(s.price.replace(/[^0-9]/g, ''));
            return price <= budget * 0.3; // Max 30% of budget
        });
    }

    return JSON.stringify({
        mainProduct: mainProduct,
        suggestions: productSuggestions.slice(0, 3), // Top 3
        note: "Zaproponuj te dodatki klientowi aby zwiększyć wartość zamówienia."
    });
}

async function checkInventory(args: any, supabase: any) {
    const { query } = args;
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('name, quantity, unit, location')
            .ilike('name', `%${query}%`)
            .limit(5);

        if (error) throw error;
        if (!data || data.length === 0) return JSON.stringify({ result: "Brak produktów w magazynie pasujących do zapytania." });

        return JSON.stringify({ inventory: data });
    } catch (e: any) {
        // Fallback if table doesn't exist or other error
        return JSON.stringify({ error: `Błąd sprawdzania magazynu: ${e.message}. (Upewnij się, że tabela 'inventory_items' istnieje)` });
    }
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
        const { messages, context } = await req.json(); // Extract context!

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
        let sanitizedMessages = messages
            .filter((m: any) => m && m.role && (m.content || m.tool_calls)) // Must have content or be a tool call
            .map((m: any) => ({
                role: m.role,
                content: m.content || "", // Ensure string or array, not null
                tool_calls: m.tool_calls,
                tool_call_id: m.tool_call_id,
                name: m.name
            }));

        // --- CONTEXT INJECTION REFINEMENT ---
        // Instead of relying on client to append text, we inject a "System Note" if context is present.
        // This is cleaner and more effective.
        if (context) {
            const contextMsg = {
                role: 'system',
                content: `[AKTUALNY KONTEKST UŻYTKOWNIKA]\nUżytkownik przegląda obecnie: ${JSON.stringify(context)}.\nJeśli pyta "o to" lub "o tę ofertę", odnoś się do tego kontekstu.`
            };
            // Insert after System Prompt (index 0 is system prompt in the call below, so we add it to messages)
            sanitizedMessages = [contextMsg, ...sanitizedMessages];
        }

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
                } else if (toolCall.function.name === 'check_inventory') {
                    result = await checkInventory(args, supabaseClient);
                } else if (toolCall.function.name === 'draft_email') {
                    result = draftEmail(args);
                } else if (toolCall.function.name === 'calculate_margin') {
                    result = calculateMargin(args);
                } else if (toolCall.function.name === 'suggest_upsell') {
                    result = suggestUpsell(args);
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
