import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ═══════════════════════════════════════════════════════════
// BRAND REMAPPING — Aluxe internal → Our commercial names
// ═══════════════════════════════════════════════════════════
const BRAND_MAP: Record<string, string> = {
    'Trendline': 'Trendstyle', 'Trendline+': 'Trendstyle+',
    'Topline': 'Topstyle', 'Topline XL': 'Topstyle XL',
    'Skyline': 'Skystyle', 'Designline': 'Designstyle',
    'Orangeline': 'Orangestyle', 'Ultraline': 'Ultrastyle',
};
const REVERSE_BRAND_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(BRAND_MAP)) {
    REVERSE_BRAND_MAP[v.toLowerCase()] = k;
    REVERSE_BRAND_MAP[k.toLowerCase()] = k; // also map internal names
}

function resolveModelForDB(input: string): string {
    const lower = input.toLowerCase().replace(/\s+/g, ' ').trim();
    return REVERSE_BRAND_MAP[lower] || input;
}

// ═══════════════════════════════════════════════════════════
// PRODUCT KNOWLEDGE (from aluxe.eu + technical docs)
// ═══════════════════════════════════════════════════════════
const PRODUCT_KNOWLEDGE = `
### Kompletna Wiedza Produktowa (źródło: dokumentacja techniczna)

**UWAGA KRYTYCZNA: NIGDY nie używaj nazw "Trendline", "Topline", "Skyline" itd. w odpowiedzi do użytkownika!**
**Zawsze używaj naszych marek: Trendstyle, Topstyle, Skystyle, Designstyle, Orangestyle, Ultrastyle.**

**ZADASZENIA ALUMINIOWE:**

| Model | Max. wymiary (2 słupy) | Nachylenie | Pokrycie | Cechy |
|-------|----------------------|-----------|---------|-------|
| **Trendstyle** | 6000 × 3000 mm | 5-15° | VSG 8/10mm lub Polikarbonat 16mm | Konstrukcja ze statyką od dołu, 3 warianty stylistyczne (płaski/zaokrąglony/klasyczny), LED spots/strips w krokwiach |
| **Trendstyle+** | 6500 × 3500 mm | 5-15° | VSG 8/10mm lub Polikarbonat 16mm | Jak Trendstyle z wzmocnionym profilem, większe rozpiętości |
| **Topstyle** | 6000 × 4500 mm | 5-15° | VSG 8/10mm lub Polikarbonat 16mm | Mocniejsza konstrukcja, idealna przy dużych obciążeniach wiatrem/śniegiem, LED spots/strips |
| **Topstyle XL** | 7000 × 4000 mm | 5-15° | VSG 8/10mm lub Polikarbonat 16mm | Jak Topstyle z XL słupami i rynnami, specjalne blendy montażowe, panoramiczny widok |
| **Skystyle** | 6000 × 4000 mm | 0-5° | VSG 8/10mm | Smukły, nowoczesny design, profil minimalistyczny, podtynkowa rynna |
| **Designstyle** | 5500 × 3500 mm | 0° (flat) | VSG 8/10mm | Płaski dach, designerski wygląd, kompaktowe profile |
| **Orangestyle** | 6000 × 4000 mm | 5-15° | VSG 8/10mm | Ogród zimowy, pełne przeszklenie boczne, wysoka izolacja |
| **Ultrastyle** | 7000 × 5000 mm | 0-5° | VSG 8/10mm | Najnowszy model, ultra-smukłe profile, premium segment |
| **Carport** | 6000 × 5000 mm | 5-10° | Polikarbonat 16mm | Wiata garażowa, wolnostojąca lub dostawna |

**PERGOLE BIOKLIMATYCZNE:**
| Model | Cechy |
|-------|-------|
| **Pergola Bio** | Lamele obrotowe 0-135°, silnik Somfy, odprowadzanie wody, LED |
| **Pergola Deluxe** | Premium, podwójne lamele, zintegrowane oświetlenie i ogrzewanie |

**OGRODZENIA:**
- **WPC** — Kompozyt drewna, wys. 1.65m / 1.80m / 1.95m
- **Panele aluminiowe** — Moderne, Plasma, Classic, Board
- **Bramy przesuwne** — Automatyczne, różne wzory

**DODATKI / AKCESORIA:**
- Markizy (Komfort) — na dach / pod dach / pionowe
- Oświetlenie LED spots / strips — zintegrowane w krokwiach
- Promienniki podczerwieni — ogrzewanie tarasu
- Rolety ZIP Screen — ochrona przed słońcem i owadami
- Ścianki szklane przesuwne (Panoramaschiebewände) — bezramowe
- Drzwi przesuwne aluminiowe (Schiebetür) — z ramą
- Systemy zacieniania (Sichtschutz) — solar paneele, tkaniny
- Elementy okienne aluminiowe — stałe lub otwierane

**KOLORY STANDARDOWE (RAL):**
RAL 7016 Antracyt • RAL 9007 Szary aluminium • RAL 9010 Biały • RAL 9005 Czarny matowy
Kolory specjalne RAL: dostępne za dopłatą (ok. 15-20% wartości konstrukcji)

**PODSTAWOWE INFORMACJE:**
- Firma: TGA Metal / Polendach24
- Waluta: EUR (netto)
- Dostawa: 4-6 tygodni standardowo
- Gwarancja: 5 lat na konstrukcję, 2 lata na silniki
- Montaż: W cenie (w promieniu 100km)
- Silniki: Somfy IO / RTS
- Rynek: Niemcy + Polska`;

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPTS — ROLE-BASED
// ═══════════════════════════════════════════════════════════
const SALES_REP_PROMPT = `
Jesteś **Ekspertem Wsparcia Sprzedaży** w firmie TGA Metal / Polendach24 — wiodącym dostawcy zadaszeń aluminiowych w Niemczech.

### Twoja Rola:
- **Ekspert Techniczny**: Znasz wszystkie produkty w najdrobniejszych detalach
- **Strateg Sprzedaży**: Aktywnie sugerujesz cross-sell i upsell
- **Pomocnik CRM**: Szukasz klientów, ofert, umów na życzenie
- **Kalkulator Cen**: Wyliczasz ceny z bazy na podstawie modelu i wymiarów
- **Copywriter**: Piszesz profesjonalne emaile do klientów

### Zasady:
1. **ZAWSZE** używaj nazw naszych marek (Trend**style**, Top**style**, Sky**style** itd.), NIGDY nie pisz Trendline/Topline/Skyline
2. Podawaj ceny w EUR netto z bazy danych (użyj narzędzia calculate_price)
3. Sprawdzaj marżę — optymalna >25%. Poniżej 20% — OSTRZEGAJ
4. Sugeruj dodatki (LED, ZIP, promienniki) przy każdej wycenie
5. Formatuj odpowiedzi w markdown z tabelami
6. Zawsze proponuj "następny krok" (pomiar, oferta, spotkanie)

${PRODUCT_KNOWLEDGE}

### Przykład Dobrej Odpowiedzi:

> **Trendstyle 5000 × 3000 mm** (Antracyt RAL 7016)
> 
> | Pozycja | Cena netto |
> |---------|-----------|
> | Konstrukcja Trendstyle 5×3m | 4 850 EUR |
> | Szkło VSG 10mm | w cenie |
> | LED spots (8 szt.) | 420 EUR |
> | Promiennik 2000W | 680 EUR |
> | **SUMA** | **5 950 EUR** |
> 
> *Marża: 28% ✅ — optymalna*
> 
> **Polecam dodać:** ZIP Screen na stronę południową (+890 EUR)
> **Następny krok:** Przygotować ofertę? Umówić pomiar?
`;

const ADMIN_MANAGER_PROMPT = `
Jesteś **Strategicznym Doradcą Biznesowym & Analitykiem** dla właściciela firmy TGA Metal / Polendach24.

### Twoja Rola — NAUCZYCIEL BIZNESOWY:
- **Analityk Danych**: Analizujesz pipeline leadów, konwersję, obroty, marże
- **Strateg Biznesowy**: Identyfikujesz wąskie gardła, proponujesz rozwiązania
- **Doradca Wzrostu**: Sugerujesz jak rozwijać firmę, nowe rynki, optymalizacja procesów
- **Coach**: Myślisz głęboko i strategicznie, jak doświadczony CEO advisor

### Twoje Obszary Ekspertyzy:

**1. Analiza Pipeline'u Leadów:**
- Gdzie leady utykają? (np. za dużo na etapie "nowy", za mało konwersji do "kontakt")
- Czas reakcji handlowców — czy odpowiadają szybko?
- Sezonowość — kiedy jest szczyt zapytań?
- Źródła leadów — które kanały najefektywniejsze?

**2. Analiza Sprzedaży:**
- Konwersja: Lead → Oferta → Umowa (benchmark branżowy: 15-25%)
- Średnia wartość zlecenia — czy rośnie czy maleje?
- Top produkty — co się sprzedaje najlepiej?
- Top handlowcy — kto generuje największy obrót?

**3. Strategia Rozwoju (coaching na wysokim poziomie):**
- Ekspansja geograficzna — nowe regiony w DE
- Dywersyfikacja produktowa — nowe linie (ogrodzenia, carporty)
- Optymalizacja marży — gdzie tracimy, gdzie można podnieść?
- Automatyzacja procesów — co jeszcze zautomatyzować?
- Marketing i branding — jak zwiększyć rozpoznawalność?
- Sezonowość — jak wygładzić przychody w zimie?

**4. Wąskie Gardła (Bottleneck Analysis):**
- Czas od leadu do oferty (cel: <48h)
- Czas od oferty do umowy (cel: <14 dni)
- Czas od umowy do montażu (cel: <6 tygodni)
- Zasoby ludzkie — czy jest dość handlowców/monterów?

### Ton Komunikacji:
- Mów jak doświadczony CEO advisor / mentor biznesowy
- Bądź konkretny — podawaj liczby, procenty, benchmarki
- Proponuj AKCJE — nie tylko diagnozuj, ale mów CO ZROBIĆ
- Myśl długoterminowo — strategia 3-6-12 miesięcy
- Bądź szczery — jeśli coś nie idzie dobrze, powiedz jasno

${PRODUCT_KNOWLEDGE}

### Przykład Analizy:

> ## 📊 Analiza Pipeline'u — Marzec 2026
> 
> **Wąskie gardło:** 67% leadów utyka na statusie "nowy" (>5 dni bez kontaktu)
> 
> **Diagnoza:** 
> - Handlowcy nie reagują wystarczająco szybko
> - Brak automatycznego przypomnienia o nowych leadach
> 
> **Rekomendacje:**
> 1. Wprowadź zasadę "pierwszy kontakt <24h" ⏰
> 2. Włącz automatyczne powiadomienia SMS dla handlowców
> 3. Rozważ zatrudnienie dodatkowego handlowca na sezon (kwiecień-wrzesień)
> 
> **Wpływ:** Skrócenie czasu reakcji o 50% może zwiększyć konwersję o 15-20%
`;

// ═══════════════════════════════════════════════════════════
// TOOLS SCHEMA
// ═══════════════════════════════════════════════════════════
const baseTools = [
    {
        type: "function",
        function: {
            name: "calculate_price",
            description: "Wylicz cenę produktu z bazy danych na podstawie modelu i wymiarów. ZAWSZE użyj tego narzędzia gdy klient pyta o cenę!",
            parameters: {
                type: "object",
                properties: {
                    model: { type: "string", description: "Nazwa modelu (np. 'Trendstyle', 'Topstyle', 'Skystyle')" },
                    width_mm: { type: "number", description: "Szerokość w mm (np. 5000)" },
                    depth_mm: { type: "number", description: "Głębokość/Wysięg w mm (np. 3000)" },
                    cover_type: { type: "string", description: "Typ pokrycia (opcjonalnie): 'glass' lub 'poly'" }
                },
                required: ["model", "width_mm", "depth_mm"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_knowledge",
            description: "Przeszukaj bazę CRM, Oferty, Umowy, Kalendarz montaży, Produkty.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Fraza wyszukiwania (np. numer oferty, nazwisko klienta, data)" },
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
            description: "Sprawdź stan magazynowy produktów.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nazwa produktu/komponentu" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "draft_email",
            description: "Wygeneruj profesjonalny email do klienta.",
            parameters: {
                type: "object",
                properties: {
                    purpose: {
                        type: "string",
                        enum: ["followup", "offer", "reminder", "thank_you", "technical"],
                        description: "Cel emaila"
                    },
                    customerName: { type: "string", description: "Imię i nazwisko klienta" },
                    context: { type: "string", description: "Dodatkowy kontekst" }
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
                    salePrice: { type: "number", description: "Cena sprzedaży netto (EUR)" },
                    cost: { type: "number", description: "Koszt zakupu/produkcji netto (EUR)" }
                },
                required: ["salePrice", "cost"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "suggest_upsell",
            description: "Zaproponuj dodatkowe produkty do sprzedaży krzyżowej.",
            parameters: {
                type: "object",
                properties: {
                    mainProduct: { type: "string", description: "Główny produkt" },
                    budget: { type: "number", description: "Budżet klienta (opcjonalnie)" }
                },
                required: ["mainProduct"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_visualization",
            description: "Wygeneruj wizualizację AI (DALL-E 3) zadaszenia.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Opis wizualizacji" }
                },
                required: ["prompt"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "calculate_glass",
            description: "Oblicz wymiary i ilość szyb dla zadaszenia.",
            parameters: {
                type: "object",
                properties: {
                    roofWidth: { type: "number", description: "Szerokość zadaszenia w mm" },
                    roofProjection: { type: "number", description: "Wysięg zadaszenia w mm" },
                    rafterCount: { type: "number", description: "Liczba krokwi (opcjonalne)" }
                },
                required: ["roofWidth", "roofProjection"]
            }
        }
    }
];

const adminTools = [
    {
        type: "function",
        function: {
            name: "analyze_business",
            description: "Analizuj dane biznesowe: pipeline leadów, obroty z umów, konwersja, wąskie gardła, ranking handlowców.",
            parameters: {
                type: "object",
                properties: {
                    analysis_type: {
                        type: "string",
                        enum: ["leads_pipeline", "monthly_turnover", "conversion", "top_sales_reps", "bottlenecks", "full_report"],
                        description: "Typ analizy do przeprowadzenia"
                    },
                    period_months: { type: "number", description: "Okres analizy w miesiącach wstecz (domyślnie 3)" }
                },
                required: ["analysis_type"]
            }
        }
    }
];

// ═══════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════

async function calculatePrice(args: any, supabase: any) {
    const { model, width_mm, depth_mm, cover_type } = args;
    const dbModel = resolveModelForDB(model);

    try {
        // Try exact match first
        let query = supabase
            .from('pricing_base')
            .select('*')
            .eq('model_family', dbModel)
            .eq('width_mm', width_mm)
            .eq('depth_mm', depth_mm);

        if (cover_type) {
            query = query.eq('cover_type', cover_type === 'glass' ? 'VSG' : 'Polycarbonat');
        }

        const { data, error } = await query.limit(1);
        if (error) throw error;

        if (data && data.length > 0) {
            const row = data[0];
            const brandName = BRAND_MAP[dbModel] || model;
            return JSON.stringify({
                model: brandName,
                dimensions: `${width_mm} × ${depth_mm} mm`,
                base_price_net: row.price_net,
                cover_type: row.cover_type || 'VSG',
                construction_type: row.construction_type || 'Standard',
                currency: 'EUR',
                note: `Cena z bazy danych. Marża docelowa: >25%.`
            });
        }

        // Try closest match
        const { data: closest } = await supabase
            .from('pricing_base')
            .select('*')
            .eq('model_family', dbModel)
            .order('width_mm', { ascending: true })
            .limit(10);

        if (closest && closest.length > 0) {
            // Find closest dimensions
            let best = closest[0];
            let bestDist = Math.abs(closest[0].width_mm - width_mm) + Math.abs(closest[0].depth_mm - depth_mm);
            for (const row of closest) {
                const dist = Math.abs(row.width_mm - width_mm) + Math.abs(row.depth_mm - depth_mm);
                if (dist < bestDist) { best = row; bestDist = dist; }
            }

            const brandName = BRAND_MAP[dbModel] || model;
            const availableSizes = closest.map((r: any) => `${r.width_mm}×${r.depth_mm}mm`).join(', ');

            return JSON.stringify({
                model: brandName,
                requested: `${width_mm} × ${depth_mm} mm`,
                closest_match: `${best.width_mm} × ${best.depth_mm} mm`,
                base_price_net: best.price_net,
                currency: 'EUR',
                available_sizes: availableSizes,
                note: `Dokładny rozmiar nie znaleziony — podaję najbliższy. Dostępne rozmiary: ${availableSizes}`
            });
        }

        // Also try price_tables as fallback
        const { data: ptData } = await supabase
            .from('price_tables')
            .select('name, data')
            .ilike('name', `%${dbModel}%`)
            .limit(3);

        if (ptData && ptData.length > 0) {
            const brandName = BRAND_MAP[dbModel] || model;
            const tables = ptData.map((t: any) => t.name).join(', ');
            return JSON.stringify({
                model: brandName,
                note: `Model znaleziony w cennikach: ${tables}. Skontaktuj się z biurem po dokładną cenę dla wymiarów ${width_mm}×${depth_mm}mm.`
            });
        }

        return JSON.stringify({ error: `Nie znaleziono ceny dla ${BRAND_MAP[dbModel] || model} ${width_mm}×${depth_mm}mm. Sprawdź dostępne modele i wymiary.` });
    } catch (e: any) {
        return JSON.stringify({ error: `Błąd wyszukiwania ceny: ${e.message}` });
    }
}

async function analyzeBusinessData(args: any, supabase: any) {
    const { analysis_type, period_months = 3 } = args;
    const since = new Date();
    since.setMonth(since.getMonth() - period_months);
    const sinceISO = since.toISOString();

    try {
        const results: any = {};

        if (['leads_pipeline', 'bottlenecks', 'full_report'].includes(analysis_type)) {
            const { data: leads } = await supabase
                .from('leads')
                .select('id, status, source, created_at, assigned_to, updated_at')
                .gte('created_at', sinceISO);

            if (leads) {
                const statusCounts: Record<string, number> = {};
                const sourceCounts: Record<string, number> = {};
                let totalAge = 0;
                let staleCount = 0;
                const now = Date.now();

                leads.forEach((l: any) => {
                    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
                    if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
                    const age = (now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
                    totalAge += age;
                    if (l.status === 'new' && age > 3) staleCount++;
                });

                results.leads = {
                    total: leads.length,
                    by_status: statusCounts,
                    by_source: sourceCounts,
                    avg_age_days: Math.round(totalAge / (leads.length || 1)),
                    stale_leads: staleCount,
                    stale_note: staleCount > 0 ? `${staleCount} leadów czeka >3 dni bez kontaktu!` : 'OK'
                };
            }
        }

        if (['monthly_turnover', 'conversion', 'full_report'].includes(analysis_type)) {
            const { data: contracts } = await supabase
                .from('contracts')
                .select('contract_data, status, created_at, sales_rep_id')
                .gte('created_at', sinceISO);

            if (contracts) {
                let totalNetto = 0;
                const monthlyTurnover: Record<string, number> = {};
                const repTurnover: Record<string, number> = {};

                contracts.forEach((c: any) => {
                    const p = c.contract_data?.pricing;
                    const val = p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0;
                    if (['signed', 'completed'].includes(c.status)) {
                        totalNetto += val;
                        const month = c.created_at.substring(0, 7);
                        monthlyTurnover[month] = (monthlyTurnover[month] || 0) + val;
                        if (c.sales_rep_id) {
                            repTurnover[c.sales_rep_id] = (repTurnover[c.sales_rep_id] || 0) + val;
                        }
                    }
                });

                results.contracts = {
                    total_count: contracts.length,
                    signed_completed: contracts.filter((c: any) => ['signed', 'completed'].includes(c.status)).length,
                    total_netto_eur: Math.round(totalNetto),
                    by_month: monthlyTurnover,
                    by_rep_id: repTurnover
                };
            }

            const { data: offers } = await supabase
                .from('offers')
                .select('id, status, created_at')
                .gte('created_at', sinceISO);

            if (offers) {
                const offerStatuses: Record<string, number> = {};
                offers.forEach((o: any) => { offerStatuses[o.status] = (offerStatuses[o.status] || 0) + 1; });

                const totalOffers = offers.length;
                const acceptedOffers = offerStatuses['accepted'] || 0;

                results.offers = {
                    total: totalOffers,
                    by_status: offerStatuses,
                    conversion_rate: totalOffers > 0 ? `${((acceptedOffers / totalOffers) * 100).toFixed(1)}%` : 'N/A'
                };
            }
        }

        if (['top_sales_reps', 'full_report'].includes(analysis_type)) {
            // Get rep profiles
            if (results.contracts?.by_rep_id) {
                const repIds = Object.keys(results.contracts.by_rep_id);
                if (repIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', repIds);

                    if (profiles) {
                        results.top_reps = profiles.map((p: any) => ({
                            name: p.full_name,
                            turnover_eur: results.contracts.by_rep_id[p.id] || 0
                        })).sort((a: any, b: any) => b.turnover_eur - a.turnover_eur);
                    }
                }
            }
        }

        if (['bottlenecks', 'full_report'].includes(analysis_type)) {
            results.bottleneck_analysis = {
                lead_to_first_contact: results.leads?.stale_leads > 3 ? '🔴 PROBLEM — zbyt wolna reakcja' : '🟢 OK',
                lead_conversion_hint: results.offers?.conversion_rate || 'Brak danych',
                recommendation: results.leads?.stale_leads > 5
                    ? 'PRIORYTET: Skontaktuj się z zaległymi leadami DZIŚ. Rozważ automatyczne przypomnienia.'
                    : 'Pipeline wygląda zdrowo. Skup się na konwersji ofert do umów.'
            };
        }

        return JSON.stringify(results);
    } catch (e: any) {
        return JSON.stringify({ error: `Błąd analizy: ${e.message}` });
    }
}

function calculateGlass(args: any) {
    const { roofWidth, roofProjection, rafterCount } = args;
    const divisions = rafterCount ? (rafterCount - 1) : Math.ceil(roofWidth / 800);
    const actualRafterCount = divisions + 1;

    return JSON.stringify({
        numberOfPanels: divisions,
        approxPanelWidth: Math.floor((roofWidth - (actualRafterCount * 60)) / divisions),
        length: roofProjection - 50,
        note: "Wymiary orientacyjne. Sprawdź specyfikację modelu."
    });
}

function draftEmail(args: any) {
    const { purpose, customerName, context } = args;
    const templates: any = {
        followup: {
            subject: `Follow-up — ${customerName}`,
            body: `Sehr geehrte/r ${customerName},\n\nvielen Dank für unser Gespräch. Ich möchte sicherstellen, dass Sie alle Informationen haben, die Sie benötigen.\n\n${context || 'Ich stehe Ihnen gerne für weitere Fragen zur Verfügung.'}\n\nMit freundlichen Grüßen,\n[Ihr Name]\nTGA Metal / Polendach24`
        },
        offer: {
            subject: `Angebot für ${customerName}`,
            body: `Sehr geehrte/r ${customerName},\n\nanbei finden Sie unser Angebot gemäß unserem Gespräch:\n\n${context || '[Angebotsdetails]'}\n\n**Inklusive:**\n✓ Montage\n✓ Lieferung\n✓ 5 Jahre Garantie\n\nDas Angebot ist 30 Tage gültig. Dürfen wir einen Aufmaß-Termin vereinbaren?\n\nMit freundlichen Grüßen,\n[Ihr Name]`
        },
        reminder: {
            subject: `Erinnerung — ${customerName}`,
            body: `Sehr geehrte/r ${customerName},\n\nich möchte Sie an unser Angebot erinnern. ${context || ''}\n\nKann ich Ihnen bei der Entscheidung behilflich sein?\n\nMit freundlichen Grüßen,\n[Ihr Name]`
        },
        thank_you: {
            subject: `Vielen Dank — ${customerName}`,
            body: `Sehr geehrte/r ${customerName},\n\nvielen Dank für Ihren Auftrag! ${context || 'Wir freuen uns auf die Zusammenarbeit.'}\n\nBei Fragen stehe ich Ihnen jederzeit zur Verfügung.\n\nMit freundlichen Grüßen,\n[Ihr Name]`
        },
        technical: {
            subject: `Technische Informationen — ${customerName}`,
            body: `Sehr geehrte/r ${customerName},\n\nbezüglich Ihrer Anfrage:\n\n${context || '[Technische Details]'}\n\nIch hoffe, das klärt Ihre Fragen.\n\nMit freundlichen Grüßen,\n[Ihr Name]`
        }
    };
    const template = templates[purpose] || templates.followup;
    return JSON.stringify({ subject: template.subject, body: template.body, note: "E-Mail-Vorlage — vor dem Senden anpassen." });
}

function calculateMargin(args: any) {
    const { salePrice, cost } = args;
    if (salePrice <= 0 || cost < 0) return JSON.stringify({ error: "Ungültige Werte." });

    const marginPercent = ((salePrice - cost) / salePrice) * 100;
    const profit = salePrice - cost;
    let recommendation = "";
    if (marginPercent < 20) recommendation = "⚠️ Za niska marża! Renegocjuj.";
    else if (marginPercent < 25) recommendation = "🟡 Akceptowalna — OK dla dużych zamówień.";
    else if (marginPercent <= 35) recommendation = "✅ Optymalna marża!";
    else recommendation = "🎉 Wyjątkowa marża!";

    return JSON.stringify({
        marginPercent: marginPercent.toFixed(1) + "%", profit: profit.toFixed(2) + " EUR",
        recommendation, breakdown: { salePrice: salePrice + " EUR", cost: cost + " EUR" }
    });
}

function suggestUpsell(args: any) {
    const { mainProduct, budget } = args;
    const suggestions: any = {
        "trendstyle": [
            { product: "LED spots (8 szt.)", price: "420 EUR", margin: "40%", reason: "Wydłuża użytkowanie wieczorami" },
            { product: "Promiennik IR 2000W", price: "680 EUR", margin: "35%", reason: "Komfort w chłodniejsze dni" },
            { product: "Markiza pod dach", price: "890 EUR", margin: "30%", reason: "Ochrona przed słońcem" },
            { product: "ZIP Screen", price: "1 250 EUR", margin: "28%", reason: "Ochrona przed owadami i wiatrem" }
        ],
        "topstyle": [
            { product: "LED strips zintegrowane", price: "580 EUR", margin: "38%", reason: "Premium oświetlenie" },
            { product: "2× Promiennik IR", price: "1 200 EUR", margin: "32%", reason: "Pełne ogrzewanie tarasu" },
            { product: "Ścianka szklana przesuwna", price: "2 800 EUR", margin: "25%", reason: "Ogród zimowy efekt" },
            { product: "ZIP Screen ×2", price: "2 200 EUR", margin: "28%", reason: "Kompletna ochrona boków" }
        ],
        "default": [
            { product: "LED spots", price: "420 EUR", margin: "40%", reason: "Uniwersalny dodatek" },
            { product: "Promiennik IR", price: "680 EUR", margin: "35%", reason: "Wydłuża sezon" }
        ]
    };

    const key = mainProduct.toLowerCase().replace(/[^a-z]/g, '');
    let productSuggestions = suggestions.default;
    for (const k in suggestions) {
        if (key.includes(k)) { productSuggestions = suggestions[k]; break; }
    }

    if (budget) {
        productSuggestions = productSuggestions.filter((s: any) =>
            parseFloat(s.price.replace(/[^0-9.]/g, '')) <= budget * 0.3
        );
    }

    return JSON.stringify({
        mainProduct, suggestions: productSuggestions.slice(0, 4),
        note: "Zaproponuj te dodatki aby zwiększyć wartość zamówienia i marżę."
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
        if (!data || data.length === 0) return JSON.stringify({ result: "Brak produktów pasujących do zapytania." });
        return JSON.stringify({ inventory: data });
    } catch (e: any) {
        return JSON.stringify({ error: `Błąd magazynu: ${e.message}` });
    }
}

async function searchKnowledge(args: any, supabase: any) {
    const { query, category } = args;
    try {
        if (category === 'crm') {
            let dbQuery = supabase.from('customers').select('id, first_name, last_name, email, city, phone');
            if (query.trim().includes(' ')) {
                const parts = query.trim().split(/\s+/);
                const p1 = parts[0]; const p2 = parts[parts.length - 1];
                dbQuery = dbQuery.or(`and(first_name.ilike.%${p1}%,last_name.ilike.%${p2}%),and(first_name.ilike.%${p2}%,last_name.ilike.%${p1}%)`);
            } else {
                dbQuery = dbQuery.or(`last_name.ilike.%${query}%,first_name.ilike.%${query}%,email.ilike.%${query}%`);
            }
            const { data, error } = await dbQuery.limit(5);
            if (error) throw error;
            return JSON.stringify({ customers: data });
        }
        if (category === 'offers') {
            const { data, error } = await supabase.from('offers')
                .select('offer_number, status, pricing, customer_data, created_at')
                .or(`offer_number.ilike.%${query}%,customer_data->>lastName.ilike.%${query}%`)
                .order('created_at', { ascending: false }).limit(5);
            if (error) throw error;
            return JSON.stringify({ offers: data });
        }
        if (category === 'contracts') {
            const { data, error } = await supabase.from('contracts')
                .select('contract_data, status, created_at, sales_rep_id')
                .or(`contract_data->>contractNumber.ilike.%${query}%`)
                .order('created_at', { ascending: false }).limit(5);
            if (error) throw error;
            return JSON.stringify({
                contracts: data?.map((c: any) => ({
                    number: c.contract_data?.contractNumber,
                    status: c.status,
                    client: c.contract_data?.client?.lastName,
                    price_net: c.contract_data?.pricing?.sellingPriceNet,
                    created: c.created_at
                }))
            });
        }
        if (category === 'installations') {
            let dbQuery = supabase.from('installations')
                .select('id, scheduled_date, status, installer_name, offers(offer_number, customer_data)');
            if (query.match(/^\d{4}-\d{2}/)) dbQuery = dbQuery.gte('scheduled_date', query);
            else dbQuery = dbQuery.gte('scheduled_date', new Date().toISOString().split('T')[0]);
            const { data, error } = await dbQuery.order('scheduled_date', { ascending: true }).limit(5);
            if (error) throw error;
            return JSON.stringify({
                installations: data?.map((i: any) => ({
                    date: i.scheduled_date, status: i.status, installer: i.installer_name,
                    client: i.offers?.customer_data?.lastName || '?'
                }))
            });
        }
        if (category === 'products') {
            const { data } = await supabase.from('pricing_base').select('model_family, width_mm, depth_mm, price_net')
                .ilike('model_family', `%${resolveModelForDB(query)}%`).limit(10);
            return JSON.stringify({
                prices: data?.map((r: any) => ({
                    model: BRAND_MAP[r.model_family] || r.model_family,
                    size: `${r.width_mm}×${r.depth_mm}mm`, price: `${r.price_net} EUR`
                }))
            });
        }
        return JSON.stringify({ result: "Nie znaleziono danych." });
    } catch (e: any) {
        return JSON.stringify({ error: `Błąd wyszukiwania: ${e.message}` });
    }
}

async function generateVisualization(args: any, openAiKey: string) {
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `Architectural visualization, photorealistic 8k: ${args.prompt}`,
                n: 1, size: "1024x1024"
            }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return JSON.stringify({ url: data.data[0].url, note: "Wizualizacja AI." });
    } catch (e: any) {
        return JSON.stringify({ error: `Visualization failed: ${e.message}` });
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages, context } = await req.json();

        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

        // Determine user role from context
        const userRole = context?.userRole || 'sales_rep';
        const isAdminOrManager = ['admin', 'manager'].includes(userRole);

        // Select system prompt based on role
        const systemPrompt = isAdminOrManager ? ADMIN_MANAGER_PROMPT : SALES_REP_PROMPT;

        // Select tools based on role
        const activeTools = isAdminOrManager ? [...baseTools, ...adminTools] : baseTools;

        // Sanitize messages
        let sanitizedMessages = messages
            .filter((m: any) => m && m.role && (m.content || m.tool_calls))
            .map((m: any) => ({
                role: m.role, content: m.content || "",
                tool_calls: m.tool_calls, tool_call_id: m.tool_call_id, name: m.name
            }));

        // Context injection
        if (context) {
            const contextMsg = {
                role: 'system',
                content: `[KONTEKST UŻYTKOWNIKA]\nRola: ${userRole}\nAktualna strona: ${context.currentPage || 'dashboard'}\nDodatkowy kontekst: ${JSON.stringify(context)}`
            };
            sanitizedMessages = [contextMsg, ...sanitizedMessages];
        }

        // 1. First LLM Call
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4.1',
                messages: [{ role: 'system', content: systemPrompt }, ...sanitizedMessages],
                tools: activeTools,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 4000
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);
        if (!data.choices?.length) throw new Error('No choices returned');

        const message = data.choices[0].message;

        // 2. Handle Tool Calls
        if (message.tool_calls) {
            const functionResponses = [];

            for (const toolCall of message.tool_calls) {
                let result = "";
                const args = JSON.parse(toolCall.function.arguments);

                switch (toolCall.function.name) {
                    case 'calculate_price': result = await calculatePrice(args, supabaseClient); break;
                    case 'calculate_glass': result = calculateGlass(args); break;
                    case 'search_knowledge': result = await searchKnowledge(args, supabaseClient); break;
                    case 'check_inventory': result = await checkInventory(args, supabaseClient); break;
                    case 'draft_email': result = draftEmail(args); break;
                    case 'calculate_margin': result = calculateMargin(args); break;
                    case 'suggest_upsell': result = suggestUpsell(args); break;
                    case 'generate_visualization': result = await generateVisualization(args, apiKey); break;
                    case 'analyze_business': result = await analyzeBusinessData(args, supabaseClient); break;
                    default: result = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
                }

                functionResponses.push({
                    tool_call_id: toolCall.id, role: "tool",
                    name: toolCall.function.name, content: result
                });
            }

            // 3. Second LLM Call with tool results
            const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4.1',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...sanitizedMessages,
                        message,
                        ...functionResponses
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                }),
            });

            const secondData = await secondResponse.json();
            if (secondData.error) throw new Error(`OpenAI Tool Error: ${secondData.error.message}`);
            if (!secondData.choices?.length) throw new Error('No choices after tool execution');

            return new Response(JSON.stringify(secondData.choices[0].message), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // No tool call — return text directly
        return new Response(JSON.stringify(message), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
