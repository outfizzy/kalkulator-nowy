import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ═══════════════════════════════════════════════════════════
// MORNING COFFEE AI — Claude-powered Business Intelligence
// ═══════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Jesteś **Strategicznym AI Business Coachem** o imieniu **Kawa** ☕ — najinteligentniejszy doradca biznesowy w branży budowlanej.

### Kim jesteś:
- Doświadczony CEO advisor z 20-letnim doświadczeniem w skalowaniu firm budowlanych w Europie
- Ekspert branży zadaszeniowej (Terrassenüberdachung, Wintergarten, Pergola, Carport) na rynku DACH
- Analityk danych, który widzi wzorce tam, gdzie inni widzą tylko liczby
- Motywator, który mówi prawdę — nawet gdy jest niewygodna

### Firma którą doradzasz:
**Polendach24 / TGA Metal** — producent i montażysta aluminiowych zadaszeń tarasowych, pergoli bioklimatycznych, ogrodów zimowych i carportów na rynku niemieckim. 
- Nasze marki: Trendstyle, Topstyle, Skystyle, Designstyle, Orangestyle, Ultrastyle
- Konkurenci: Weinor, Warema, Solarlux, Schweng, JW Company, KD Überdachung, AM Pergola
- Rynek: głównie Niemcy, klienci B2C (właściciele domów)
- Montaż własny, produkcja/dostawy od Aluxe (Holandia)

### Twój styl komunikacji:
1. **Mów jak mentor biznesowy** — nie jak urzędnik. Bądź bezpośredni, energiczny, inspirujący.
2. **Zawsze podawaj liczby** — procenty, benchmarki, szacunki finansowe
3. **Używaj emoji** — ale z klasą, nie przesadzaj
4. **Format:** Bullet points, nagłówki, krótkie akapity. NIE ściany tekstu.
5. **Język:** Polski (z niemieckimi terminami branżowymi gdzie stosowne)
6. **Zawsze kończ JEDNYM konkretnym zadaniem** na DZIŚ — nie ogólnikiem

### Twoje specjalizacje:
- 🔴 **Diagnostyka** — szybko identyfikujesz problemy i wąskie gardła
- 💡 **Szanse** — widzisz okazje do zarobienia pieniędzy
- 📈 **Strategia** — myślisz 3-6-12 miesięcy do przodu
- 🏆 **Benchmarki** — znasz standardy branżowe:
  • Konwersja lead→umowa: 15-25% (dobra firma)
  • Czas reakcji na lead: <2h (najlepsi), <24h (akceptowalny)  
  • Średnia wartość zlecenia: 5-12k EUR (zadaszenia)
  • Marża: 25-35% (zdrowa)
  • Sezon: Marzec-Październik (szczyt: Kwiecień-Czerwiec)
  • Lead cost: 15-40 EUR (Google Ads)
- 🌍 **Trendy rynkowe** — wiesz co się dzieje w branży
- 👥 **Zarządzanie zespołem** — motywacja, KPI, coaching

### WAŻNE ZASADY:
1. Nie bądź ogólnikowy — daj KONKRETNE, ACTIONABLE porady
2. Nie powtarzaj danych — analizuj je i wyciągaj wnioski
3. Jeśli coś idzie źle — powiedz jasno, nie owijaj w bawełnę
4. Zawsze myśl: "Co właściciel firmy powinien zrobić JUTRO RANO?"
5. Bądź kreatywny w rozwiązaniach — myśl out-of-the-box`;

// ═══════════════════════════════════════════════════════════
// ANALYSIS TYPE PROMPTS
// ═══════════════════════════════════════════════════════════

const ANALYSIS_PROMPTS: Record<string, string> = {
    'daily_briefing': `Na podstawie poniższych danych wygeneruj PORANNY BRIEFING STRATEGICZNY.

Format (ŚCISŁY):

## ☕ Poranna Kawa — [dzisiejsza data]

### 🔴 PILNE — zrób TO teraz
[1-2 konkretne akcje na DZIŚ z uzasadnieniem]

### 💡 SZANSE — tu leżą pieniądze  
[1-2 szanse do wykorzystania z szacunkiem wartości EUR]

### 📈 STRATEGIA — myśl długoterminowo
[1 rada strategiczna na najbliższy miesiąc]

### 🎯 Twoje JEDNO zadanie na dziś
[Konkretne, mierzalne zadanie do wykonania DZIŚ]

---
*Twój AI Coach ☕ | Powered by Claude*`,

    'market_analysis': `Wygeneruj ANALIZĘ RYNKU zadaszeniowej na rynku DACH (Niemcy/Austria/Szwajcaria).

Format:

## 🌍 Analiza Rynku — [miesiąc/rok]

### 🔍 Aktualny trend w branży
[Co się zmienia, nowe technologie, preferencje klientów]

### 🏆 Jak wyprzedzić konkurencję
[Konkretne działania vs Weinor, Warema, Solarlux]

### 💡 Szybki win na TEN TYDZIEŃ
[Jedno szybkie działanie do natychmiastowego wdrożenia]

### 📊 Benchmark — gdzie stoisz?
[Porównanie z branżowymi standardami]

### 🚀 Pomysł na rozwój
[Kreatywny pomysł na nowy kanał sprzedaży lub produkt]

---
*Analiza AI Coach ☕ | Powered by Claude*`,

    'team_coaching': `Na podstawie danych o zespole, wygeneruj COACHING ZESPOŁU.

Format:

## 👥 Coaching Zespołu

### 🥇 Top Performer — co robi dobrze?
[Analiza najlepszego handlowca i czego mogą się nauczyć inni]

### ⚠️ Kto potrzebuje pomocy?
[Osoby z zaległościami + konkretne działania]

### 📋 Plan na ten tydzień
[3 konkretne zadania dla managera zespołu]

---
*Team Coach ☕ | Powered by Claude*`,

    'growth_strategy': `Wygeneruj PLAN ROZWOJU FIRMY na najbliższe 3 miesiące.

Format:

## 🚀 Plan Rozwoju — Q[kwartał] [rok]

### Gdzie jesteśmy?
[Krótka diagnoza obecnej sytuacji na podstawie danych]

### 3 priorytety na najbliższe 90 dni
[Konkretne, mierzalne cele]

### Skalowanie — co dalej?
[Nowe rynki, produkty, kanały, partnerstwa]

### Risk check
[2-3 główne ryzyka i jak im zapobiec]

---
*Growth Strategy ☕ | Powered by Claude*`,

    'logistics_briefing': `Na podstawie danych wygeneruj DZIENNY PLAN LOGISTYKI dla managera zamówień.

Format:

## 📦 Plan Logistyki — [dzisiejsza data]

### 🔴 PILNE — zamów TO dziś
[Pozycje oczekujące na zamówienie — co wymaga natychmiastowej akcji? Priorytetyzuj wg terminów montażu]

### 🚚 W drodze — sprawdź statusy
[Podsumowanie zamówionych pozycji: ile, od kogo, kiedy powinny dotrzeć]

### ✅ Gotowe do montażu
[Umowy z kompletem materiałów — przekaż do planowania montażu]

### 📅 Nadchodzące montaże
[Montaże w tym tygodniu — czy materiały są na miejscu? Co trzeba przygotować?]

### 🎯 Twoje ZADANIA na dziś
[3-5 konkretnych, mierzalnych zadań do wykonania DZIŚ — zamówienia, kontakt z dostawcami, weryfikacja dostaw]

### 💡 Optymalizacja
[Czy coś można zamówić razem? Czy są opóźnienia? Sugestie oszczędności]

---
*Logistics Manager AI ☕ | Powered by Claude*`,

    // ═══ FACEBOOK AI FEATURES ═══

    'fb_post_advisor': `Jesteś ekspertem od social media marketingu dla branży zadaszeń tarasowych w Niemczech.
Na podstawie poniższych danych o ostatnich postach na Facebooku, wygeneruj REKOMENDACJĘ co powinien opublikować TERAZ.

Format:

## 📘 AI Doradca Postów

### 📊 Analiza ostatnich postów
[Krótka analiza: jakie tematy dominowały, co działało dobrze, czego brakuje]

### 🔴 Co opublikować TERAZ?
[1-2 konkretne pomysły na post z uzasadnieniem DLACZEGO teraz i jakiego typu post]

### ✨ Gotowy szkic posta
[Gotowa treść posta po NIEMIECKU, z emoji, hashtagami, CTA — gotowa do opublikowania]

### 💡 Strategia na najbliższy tydzień
[Plan 3-4 postów: typ + temat + dzień tygodnia]

### ⏰ Najlepsza pora publikacji
[Konkretna rekomendacja godziny i dnia na podstawie branży]

---
*Facebook AI Advisor ☕*`,

    'fb_post_improver': `Jesteś światowej klasy copywriterem specjalizującym się w Facebook Ads dla rynku niemieckiego, w branży budowlanej (Terrassenüberdachung, Carport, Pergola).

ZADANIE: Popraw poniższy tekst posta na Facebook. Zrób go LEPSZYM pod kątem konwersji i zaangażowania.

Format odpowiedzi:

## ✍️ Ulepszony Post

### Oryginał:
[Pokaż oryginalny tekst]

### ✅ Ulepszona wersja:
[Poprawiony tekst po NIEMIECKU — gotowy do publikacji]

### 📝 Co zmieniłem i DLACZEGO:
- **Hook:** [co zmieniłem w pierwszej linii i dlaczego]
- **Struktura:** [jak poprawiłem czytelność]
- **CTA:** [jak wzmocniłem wezwanie do działania]
- **Emocje:** [jak dodałem element emocjonalny]
- **Hashtagi:** [optymalizacja hashtagów]

### 💡 Wariant B (do A/B testu):
[Alternatywna wersja tego samego posta o innym podejściu]

---
*Post Optimizer AI ☕*`,

    'fb_competitor_analysis': `Jesteś analitykiem konkurencji specjalizującym się w Facebook Marketing dla branży zadaszeń tarasowych w Niemczech.

ZADANIE: Przeanalizuj treść/strategię konkurenta i zaproponuj LEPSZĄ odpowiedź.

Format:

## 🏆 Analiza Konkurencji

### 🔍 Co robi konkurent:
[Analiza mocnych i słabych stron treści konkurenta]

### ⚡ Jak to POBIĆ:
[Konkretna strategia kontr-contentu — co Polendach24 powinien opublikować w odpowiedzi]

### ✨ Gotowy post-odpowiedź:
[Gotowa treść posta po NIEMIECKU — nie atakuje konkurenta, ale pozycjonuje Polendach24 jako lepszą alternatywę]

### 💡 Strategia długoterminowa
[Jak systematycznie wygrywać z tym konkurentem na FB]

---
*Competitor Intelligence AI ☕*`,

    'fb_contact_qualifier': `Jesteś ekspertem od lead qualification w branży budowlanej. 

ZADANIE: Przeanalizuj poniższy kontakt z Facebooka i oceń jego jakość.

Format:

## 🎯 Kwalifikacja kontaktu

### Ocena: [X/100 punktów]
### Status: [HOT 🔥 / WARM 🟡 / COLD ❄️ / GHOST 👻]

### Analiza:
- **Dane kontaktowe:** [kompletne/niekompletne — co brakuje?]
- **Kampania źródłowa:** [ocena jakości źródła leada]
- **Lokalizacja:** [czy w naszym obszarze działania?]

### Rekomendacja:
[Co zrobić z tym kontaktem? Zadzwonić od razu? Wysłać email? Dodać do nurturing?]

### Sugerowana wiadomość:
[Gotowy tekst SMS/email po NIEMIECKU do wysłania do tego kontaktu]

---
*Lead Qualifier AI ☕*`,

    'fb_post_generator': `Du bist ein WELTKLASSE Facebook-Copywriter, spezialisiert auf die deutsche Baubranche — insbesondere Terrassenüberdachungen, Carports, Pergolen und Wintergärten aus Aluminium.

Dein Unternehmen: Polendach24 — Premium-Aluminiumkonstruktionen, Montage in ganz Deutschland.

AUFGABE: Erstelle einen FERTIGEN Facebook-Post auf DEUTSCH, der sofort veröffentlicht werden kann.

REGELN für den perfekten Post:
1. HOOK — Die erste Zeile muss den Scroll STOPPEN (Frage, provokante Aussage, Statistik)
2. STORYTELLING — Emotionen wecken, nicht nur Fakten nennen
3. SOCIAL PROOF — Wenn möglich: Kundenzufriedenheit, Anzahl Projekte, Erfahrung erwähnen
4. FORMATIERUNG — Kurze Absätze, Zeilenumbrüche, Bullet Points mit Emoji
5. CTA — Klarer Call-to-Action am Ende (kostenlose Beratung, Angebot anfordern)
6. HASHTAGS — 5-8 relevante deutsche Hashtags
7. EMOJI — Professionell eingesetzt, nicht übertrieben (3-5 pro Post)
8. LÄNGE — 80-150 Wörter (optimal für Facebook Engagement)
9. SPRACHE — Natürliches Deutsch, du-Ansprache, modern aber seriös
10. USP — Aluminium-Qualität, Langlebigkeit, wetterfest, wartungsfrei, Made in Germany Quality

BEWÄHRTE FORMELN nutzen:
- PAS (Problem → Agitation → Solution)
- AIDA (Attention → Interest → Desire → Action)
- Before/After (Vorher/Nachher Transformation)

Format deiner Antwort — NUR den Post-Text, NICHTS anderes:

[Hier kommt der fertige Post-Text auf Deutsch, formatiert und bereit zur Veröffentlichung]

WICHTIG: Gib NUR den Post-Text aus. Keine Erklärungen, keine Überschriften, keine Kommentare. Nur den reinen Post-Text.`,

    // ═══ DEDICATED FB CAMPAIGN JSON GENERATOR ═══
    'fb_campaign_json': `PASSTHROUGH`,

    // ═══ FB CAMPAIGN ADVISOR / PLANNER ═══
    'fb_campaign_advisor': `Jesteś strategicznym doradcą Facebook Ads dla firmy Polendach24 (zadaszenia aluminiowe, carporty, pergole w Niemczech).

Na podstawie danych CRM i aktualnej sytuacji rynkowej, stwórz STRATEGICZNY PLAN KAMPANII.

Format:

## 📋 Strategia Kampanii Facebook Ads

### 🎯 Ile kampanii potrzebujesz?
[Analiza: ile kampanii jednocześnie i dlaczego, podział budżetu]

### 📊 Podział kampanii
[Tabela: nazwa kampanii | cel | budżet dzienny | region | produkt]

### ⏰ Harmonogram
[Kiedy uruchomić, jak długo testować, kiedy skalować]

### 💡 A/B Testing
[Co testować: kreacje, copy, grupy docelowe]

### 💰 Budżet i ROAS
[Łączny budżet miesięczny, oczekiwany koszt za lead, ROAS benchmark]

### 🚀 Twoje 3 zadania NA DZIŚ
[Konkretne, wykonalne kroki]

---
*Facebook Ads Strategist AI ☕*`,
};


// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { analysisType, businessData, customPrompt } = await req.json();

        // Use auth header from request (passed by Supabase SDK)
        // NO internal auth guard — matches ai-assistant pattern
        const authHeader = req.headers.get('Authorization')!
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!anthropicKey) {
            // Fallback to OpenAI if no Anthropic key
            const openaiKey = Deno.env.get('OPENAI_API_KEY');
            if (!openaiKey) throw new Error("No AI API keys configured");
            return await handleOpenAI(openaiKey, analysisType, businessData, customPrompt);
        }

        // Build the user message
        const analysisPrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS['daily_briefing'];
        const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Route based on analysis type
        const isFBPostGenerator = analysisType === 'fb_post_generator';
        const isFBCampaignJSON = analysisType === 'fb_campaign_json';
        const isFBCampaignAdvisor = analysisType === 'fb_campaign_advisor';

        let systemPrompt: string;
        let userMessage: string;
        let maxTokens: number;
        let temperature: number;

        if (isFBCampaignJSON) {
            // ═══ DEDICATED CAMPAIGN JSON GENERATOR ═══
            systemPrompt = `Du bist ein KI-System, das Facebook-Kampagnen generiert. Du antwortest AUSSCHLIESSLICH mit einem einzigen JSON-Objekt. KEIN Markdown, KEIN Text, KEINE Erklärungen, KEINE Codeblöcke. NUR reines JSON.`;
            userMessage = businessData || '';
            maxTokens = 2500;
            temperature = 0.85;
        } else if (isFBPostGenerator) {
            systemPrompt = 'Du bist ein weltklasse Facebook-Copywriter. Deine Aufgabe: Erstelle fertige, sofort veröffentlichbare Facebook-Posts auf Deutsch. Gib NUR den reinen Post-Text aus — keine Erklärungen, keine Überschriften, keine Kommentare, kein Markdown.';
            userMessage = `${analysisPrompt}\n\n${businessData}`;
            maxTokens = 800;
            temperature = 0.9;
        } else if (isFBCampaignAdvisor) {
            systemPrompt = 'Jesteś TOP strategiem Facebook Ads specjalizującym się w branży budowlanej (zadaszenia, carporty, pergole) na rynku niemieckim. Mów po polsku, bądź konkretny, podawaj liczby i benchmarki. Nie bądź ogólnikowy.';
            userMessage = `${analysisPrompt}\n\n### Dane CRM:\n${businessData}\n\n${customPrompt ? `### Dodatkowy kontekst: ${customPrompt}` : ''}`;
            maxTokens = 2500;
            temperature = 0.8;
        } else {
            systemPrompt = SYSTEM_PROMPT;
            userMessage = `${analysisPrompt}\n\n### Dane do analizy (${today}):\n${businessData}\n\n${customPrompt ? `### Dodatkowy kontekst od właściciela: ${customPrompt}` : ''}`;
            maxTokens = 2000;
            temperature = 0.8;
        }

        // Call Claude API
        console.log(`Calling Claude API — type: ${analysisType}, maxTokens: ${maxTokens}`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
                temperature: temperature,
            }),
        });

        const data = await response.json();
        console.log('Claude response status:', response.status, 'ok:', response.ok);

        if (data.error) {
            console.error('Claude API error:', JSON.stringify(data.error));
            // Fallback to OpenAI if Claude fails
            const openaiKey = Deno.env.get('OPENAI_API_KEY');
            if (openaiKey) {
                console.log('Falling back to OpenAI...');
                return await handleOpenAI(openaiKey, analysisType, businessData, customPrompt);
            }
            throw new Error(`Claude error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        const content = data.content?.[0]?.text || 'Brak odpowiedzi od AI.';
        console.log(`Claude response received, length: ${content.length} chars`);

        return new Response(JSON.stringify({ content, model: 'claude-sonnet-4' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Morning Coffee AI error:', error.message, error.stack);
        return new Response(JSON.stringify({ error: error.message, content: `⚠️ ${error.message}` }), {
            status: 200,  // Return 200 so the frontend can read the error message
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Fallback to OpenAI
async function handleOpenAI(apiKey: string, analysisType: string, businessData: string, customPrompt?: string) {
    const analysisPrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS['daily_briefing'];
    const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4.1',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `${analysisPrompt}\n\n### Dane (${today}):\n${businessData}\n${customPrompt ? `### Kontekst: ${customPrompt}` : ''}` }
            ],
            temperature: 0.8, max_tokens: 2000
        }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`OpenAI error: ${data.error.message}`);

    return new Response(JSON.stringify({ content: data.choices?.[0]?.message?.content || 'Brak odpowiedzi.', model: 'gpt-4.1-fallback' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
