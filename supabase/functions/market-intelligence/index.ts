import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Competitor URLs ────────────────────────────────────────
const COMPETITORS = [
    { name: "Schweng", url: "https://www.schweng.de", category: "terrassenüberdachung" },
    { name: "JW Company", url: "https://www.jw-company.de", category: "überdachung" },
    { name: "KD Überdachung", url: "https://www.kd-ueberdachung.de", category: "terrassenüberdachung" },
    { name: "AM Pergola", url: "https://www.am-pergola.de", category: "pergola" },
    { name: "Heroal", url: "https://www.heroal.de", category: "aluminium systeme" },
    { name: "Weinor", url: "https://www.weinor.de", category: "terrassendach" },
    { name: "warema", url: "https://www.warema.de", category: "sonnenschutz" },
    { name: "Solarlux", url: "https://www.solarlux.de", category: "wintergarten" },
];

// ─── Industry Keywords ──────────────────────────────────────
const INDUSTRY_KEYWORDS = [
    "terrassenüberdachung",
    "kalt wintergarten",
    "wintergarten",
    "carport",
    "carports",
    "terrassendach",
    "lamellendach",
    "pergola aluminium",
    "glasdach terrasse",
    "überdachung nach maß",
    "sonnenschutz terrasse",
    "aluminium überdachung",
    "freistehende überdachung",
];

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing auth" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { action, competitor_name, keywords } = await req.json();
        const openaiKey = Deno.env.get("OPENAI_API_KEY");

        if (!openaiKey) {
            return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ─── ACTION: Analyze Market ─────────────────────────────
        if (action === "analyze_market") {
            const targetKeywords = keywords || INDUSTRY_KEYWORDS;

            const prompt = `Du bist ein Senior Digital Marketing Analyst, spezialisiert auf die Aluminium-Überdachungsbranche in Deutschland.

BRANCHENKEYWORDS: ${targetKeywords.join(", ")}

WETTBEWERBER:
${COMPETITORS.map(c => `- ${c.name} (${c.url}) — Kategorie: ${c.category}`).join("\n")}

UNSER UNTERNEHMEN: Polendach24 (polendach24.app) — Aluminium-Terrassenüberdachungen, Wintergärten, Carports, Pergolen

Erstelle eine umfassende Marktanalyse auf POLNISCH:

## 📊 SYTUACJA RYNKOWA
- Trendy w branży zadaszeń aluminiowych w Niemczech (marzec 2026)
- Sezonowość — kiedy peak season, kiedy slow
- Jakie produkty rosną, jakie spadają

## 🔍 ANALIZA KONKURENCJI
Dla każdego konkurenta (${COMPETITORS.map(c => c.name).join(", ")}):
- Co oferują (produkty, usługi)
- Ich mocne strony vs nasze
- Ich strategia cenowa (premium/budget)
- Ich content marketing / SEO strategy

## 🗝️ SŁOWA KLUCZOWE — REKOMENDACJE
- Top 10 słów kluczowych do pozycjonowania (z szacowanym wolumenem)
- Które frazy mają niską konkurencję = quick wins
- Long-tail keywords do content marketingu
- Frazy lokalne (mit PLZ / Stadt)

## 💡 STRATEGIA DLA POLENDACH24
- 3 Quick Wins (efekt w 2 tygodnie)
- 3 Medium-term (efekt w 1-3 miesiące)
- 3 Long-term (efekt w 6+ miesięcy)
- Rekomendowany budżet Google Ads (EUR/miesiąc)
- Content marketing plan (blog topics)

## ⚠️ ZAGROŻENIA I RYZYKA
- Nowi gracze na rynku
- Zmiany regulacyjne
- Ryzyko cenowe

Bądź BARDZO konkretny. Podawaj liczby, benchmarki, szacunki. Formatuj w markdown z emoji.`;

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 4000,
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || "Brak odpowiedzi";

            return new Response(JSON.stringify({ content, type: "market_analysis" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ─── ACTION: Analyze Competitor ─────────────────────────
        if (action === "analyze_competitor") {
            const comp = COMPETITORS.find(c => c.name.toLowerCase() === competitor_name?.toLowerCase());
            if (!comp) {
                return new Response(JSON.stringify({ error: "Competitor not found" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Try to fetch competitor's page
            let pageContent = "";
            try {
                const pageRes = await fetch(comp.url, {
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketBot/1.0)" },
                });
                const html = await pageRes.text();
                // Extract text content (strip HTML tags)
                pageContent = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 3000);
            } catch {
                pageContent = "Nie udało się pobrać strony";
            }

            const prompt = `Przeanalizuj konkurenta w branży zadaszeń aluminiowych w Niemczech.

KONKURENT: ${comp.name}
URL: ${comp.url}
KATEGORIA: ${comp.category}

TREŚĆ STRONY (fragment):
${pageContent}

NASZE PRODUKTY (Polendach24): Terrassenüberdachung, Kalt Wintergarten, Carport, Pergola, Lamellendach

Przygotuj analizę na POLNISCH:

## 🏢 ${comp.name} — Profil
- Czym się zajmują
- Główne produkty i usługi
- Grupa docelowa
- Zasięg geograficzny

## 💪 Mocne strony
- Co robią dobrze
- Unikalne cechy (USP)

## 🔻 Słabe strony  
- Gdzie mają braki
- Co my robimy lepiej

## 🎯 Jak ich pokonać
- 3 konkretne działania
- Content gap — czego oni nie mają a my możemy
- Cenowo — jak się pozycjonować

## 📈 Ich SEO / Marketing
- Główne słowa kluczowe
- Strategia content
- Social media presence

Bądź konkretny i podawaj actionable insights.`;

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 3000,
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || "Brak odpowiedzi";

            return new Response(JSON.stringify({ content, type: "competitor_analysis", competitor: comp.name }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ─── ACTION: Keyword Intelligence ───────────────────────
        if (action === "keyword_intelligence") {
            const targetKeywords = keywords || INDUSTRY_KEYWORDS;

            const prompt = `Jesteś ekspertem SEO specjalizującym się w branży zadaszeń aluminiowych na rynku niemieckim.

GŁÓWNE FRAZY: ${targetKeywords.join(", ")}

NASZE PRODUKTY: Terrassenüberdachung, Kalt Wintergarten, Wintergarten, Carport, Pergola, Lamellendach, Glasdach

Przygotuj KOMPLEKSOWĄ analizę słów kluczowych na POLNISCH:

## 🗝️ TOP 15 SŁÓW KLUCZOWYCH
Tabela: | Słowo kluczowe | Szacowany wolumen/msc | Trudność | CPC (EUR) | Priorytet |

## 🎯 QUICK WINS — Niska konkurencja
- 5 long-tail fraz z niską trudnością
- Dlaczego warto na nie celować
- Sugerowane treści (blog/landing page)

## 🔥 HIGH VALUE — Wysoki wolumen
- 5 fraz z wysokim wolumenem
- Strategia na pozycjonowanie
- Szacowany budżet Google Ads

## 📍 LOKALNE FRAZY
- 5 fraz z modyfikatorami lokalnymi (np. "terrassenüberdachung NRW")
- Jak targetować lokalniesię

## 📝 CONTENT PLAN
- 10 tematów blogowych z frazami kluczowymi
- Format treści (poradnik, porównanie, case study)
- Szacowana trudność i wolumen

## 💡 REKOMENDACJA BUDŻETOWA
- Google Ads: sugerowany budżet dziennie/miesięcznie
- Podział budżetu per kategoria produktowa
- Oczekiwany ROI

Podawaj konkretne liczby i szacunki oparte na branżowych benchmarkach.`;

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 4000,
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || "Brak odpowiedzi";

            return new Response(JSON.stringify({ content, type: "keyword_intelligence" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Unknown action. Use: analyze_market, analyze_competitor, keyword_intelligence" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
