// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-chat — AI Chat for Google Ads management (Claude Sonnet)
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return fail("Brak ANTHROPIC_API_KEY — dodaj secret w Supabase Dashboard");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { message, session_id, config, metrics_summary, polish_leads_summary } = body;

    if (!message?.trim()) {
      return fail("Brak wiadomości");
    }

    // Load conversation history (last 20 messages)
    let history: { role: string; content: string }[] = [];
    if (session_id) {
      const { data: msgs } = await supabase
        .from("ads_chat_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (msgs) {
        history = msgs.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }

    // Load campaigns for context
    const { data: campaigns } = await supabase
      .from("ads_campaigns")
      .select("name, type, status, daily_budget_pln, bidding_strategy")
      .order("name")
      .limit(20);

    // Load recent metrics
    const { data: recentMetrics } = await supabase
      .from("ads_daily_metrics")
      .select("date, impressions, clicks, cost_pln, conversions, conv_value_pln, ctr, avg_cpc, roas")
      .order("date", { ascending: false })
      .limit(14);

    // Load recent alerts
    const { data: alerts } = await supabase
      .from("ads_alerts")
      .select("severity, type, message, created_at")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    // Load pending proposals
    const { data: proposals } = await supabase
      .from("ads_proposals")
      .select("title, type, risk_level, status, description")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false })
      .limit(5);

    // Load Polish leads stats
    const { data: plLeads } = await supabase
      .from("leads")
      .select("id, status, customer_data, created_at")
      .eq("source", "website_pl")
      .order("created_at", { ascending: false })
      .limit(100);

    const now = new Date();
    const plToday = (plLeads || []).filter(
      (l: any) => new Date(l.created_at).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
    ).length;
    const pl7d = (plLeads || []).filter(
      (l: any) => (now.getTime() - new Date(l.created_at).getTime()) <= 7 * 86400000
    ).length;
    const pl30d = (plLeads || []).filter(
      (l: any) => (now.getTime() - new Date(l.created_at).getTime()) <= 30 * 86400000
    ).length;

    // Load knowledge base for AI context
    const { data: knowledgeEntries } = await supabase
      .from("ads_knowledge_base")
      .select("title, summary, tags")
      .order("relevance_score", { ascending: false })
      .limit(10);

    // Build system prompt
    const systemPrompt = `Jesteś EKSPERTEM AI Ads Manager dla zadaszto.pl — lidera polskiego rynku premium zadaszeń aluminiowych.

═══ WIEDZA O FIRMIE I PRODUKTACH ═══

**zadaszto.pl** — producent i dystrybutor premium aluminiowych zadaszeń tarasowych, pergol bioklimatycznych, carportów i systemów zabudowy szklanych.
- Marka macierzysta: PolenDach24 (Niemcy, wieloletnia obecność)
- Ekspansja na rynek PL pod marką zadaszto.pl  
- Montaż w całej Polsce (16 województw), własne ekipy montażowe
- Aluminium serii 6000, lakierowanie proszkowe RAL, certyfikacja CE DIN EN 1090
- 10 lat gwarancji na konstrukcję, 5 lat na szkło
- Realizacja: 4-8 tygodni, montaż: 1-2 dni
- Ceny premium: średnia wartość zamówienia 25.000–60.000 PLN
- Tel: +48 533 459 475

**PORTFOLIO PRODUKTÓW:**

1. **Trendstyle** — Bestseller. Minimalistyczne zadaszenie tarasowe. Głębokość do 5m, VSG lub poliwęglan 16mm. 35+ kolorów RAL. Cena entry-level w kategorii premium.
2. **Topstyle** — Masywny profil, zintegrowane odwadnianie. Wersja XL ze wzmocnionymi słupami. Max 7x5m. Dla klientów szukających wytrzymałości.
3. **Ultrastyle** — Optyka płaskiego dachu, zintegrowany spadek. 7m rozpiętości na 2 słupach. Do 120 kg/m² śniegu. 3 warianty: Classic, Compact, Style.
4. **Designstyle** — Przesuwny dach, regulacja światła i wentylacji. Max 7x4m. Unikalne doświadczenie outdoor.
5. **Pergola** — Bioklimatyczna, lamele regulowane 0-120°. Sterowanie ręczne lub pilot SOMFY. Czujnik wiatru/deszczu. Max szer. 3500mm.
6. **Pergola Deluxe** — TOP model. SOMFY + aplikacja iOS/Android. Ogrzewanie podczerwienią (+10-15°C). Zintegrowane oświetlenie LED.
7. **Carport** — Wiata aluminiowa do 50m² (bez pozwolenia). Blacha trapezowa, montaż 1 dzień. Kompatybilna z fotowoltaiką. Filc antykondensacyjny.
8. **Skystyle** — Linia HoReCa. Zabudowa ogródków gastronomicznych. Rozpiętość 8m+, ogrzewanie, automatyczne ściany.

**DODATKI (crossell/upsell 30-50% wartości zamówienia):**
- Markizy pionowe (ZIP + SOMFY) — ochrona boczna
- Markizy naddachowe/poddachowe — cieniowanie
- Ściany panoramiczne — bezramowe przesuwne szklane
- Szyby przesuwne w ramie — pokój ogrodowy
- Panele osłonowe — prywatność  
- Steellook — loft/industrial design
- Oświetlenie LED — spoty + taśmy w profilach

═══ STRATEGIA KAMPANII GOOGLE ADS ═══

**STRUKTURA KAMPANII (rekomendowana):**

1. **[BRAND]** — frazy brandowe: "zadaszto", "zadaszto.pl" — ROAS 10x+, ochrona marki
2. **[PERGOLE]** — pergola bioklimatyczna, pergola aluminiowa, pergola tarasowa — GŁÓWNY driver leadów
3. **[ZADASZENIA]** — zadaszenie tarasu, zadaszenie aluminiowe, nowoczesne zadaszenie — high volume
4. **[CARPORT]** — carport aluminiowy, wiata garażowa, wiata aluminiowa — nowy segment
5. **[ZABUDOWY]** — zabudowa tarasu, zabudowa szklana, oranżeria — high ticket
6. **[COMPETITOR]** — frazy konkurencji: alukov, tarason, zadaszeniatarasowe — awareness
7. **[LOKALNE]** — frazy z miastami: "pergola Warszawa", "zadaszenie Kraków" — wysoki intent

**TOP FRAZY HIGH-INTENT (Exact/Phrase Match):**
- pergola bioklimatyczna cena
- pergola aluminiowa tarasowa
- zadaszenie tarasu aluminiowe cena
- nowoczesne zadaszenie tarasu
- pergole tarasowe na wymiar
- pergola bioklimatyczna z montażem
- aluminiowe zadaszenia tarasów producent
- pergola lamelowa cena
- zabudowa tarasu aluminium
- pergola wolnostojąca aluminiowa
- zadaszenie tarasu cena z montażem
- nowoczesne pergole ogrodowe
- carport aluminiowy bez pozwolenia
- wiata garażowa aluminiowa cena
- pergola z ogrzewaniem podczerwienią
- zadaszenie tarasu szklane

**NEGATYWNE FRAZY (krytyczne, żeby nie marnować budżetu):**
- DIY, jak zrobić, samemu, budowa
- drewniana, drewniane (nie sprzedajemy drewna)
- używane, second hand, tanio
- rysunki, plan, projekt (info queries)
- allegro, OLX, ceneo (e-commerce)
- naprawa, serwis (nie nasz core)

**SEZONOWOŚĆ:**
- 🔥 SZCZYT: marzec–czerwiec (wiosna → decyzja o remoncie tarasu)
- 📈 WYSOKI: lipiec–sierpień (realizacje w toku, zainteresowanie)
- 📉 NISKI: wrzesień–październik (spada, ale leadom brakuje czasu)
- 🍂 NISKA SEZON: listopad–luty (najmniej lead, ale najtańszy CPC!)
- 💡 TAKTYKA: w niskim sezonie obniżaj budżet 30-40%, ale nie wyłączaj — zimowe leady mają wyższą konwersję (świadomi kupujący)

**LANDING PAGE STRATEGY:**
- Pergole → /produkty/pergola.html lub /produkty/pergola-deluxe.html
- Zadaszenia → /produkty/trendstyle.html (entry) lub /produkty/ultrastyle.html (premium)
- Carporty → /produkty/carport.html
- HoReCa → /produkty/skystyle.html
- NIGDY na stronę główną — zawsze na dedykowaną stronę produktu

**KONKURENCJA (7 bezpośrednich graczy):**
1. **TWIGO** (twigo.pl) 🔴 Wrocław — 10 lat, ISO 9001, od 11k PLN, 45 osób, eksport DE/AT/AU. Brak konfiguratora 3D, brak carportów, 1 model lamelowy. 70% z poleceń.
2. **Zabudowy Tarasu / ESKA** (zabudowytarasu.pl) 🔴 Kielce — od 1993, konfigurator, 11 miast SEO, B2B portal (dealer+projektant), Eska Line 120/160/Fabric/Glass, Carport PV. Brak smart home, brak Skystyle HoReCa.
3. **AMPERGOLA** (ampergola.pl) 🟠 Śląsk — 20 lat, anodowane alu (baseny!), realizacja 4 tyg., shutters. Brak carportu, 1 model VR-Solid, stara strona.
4. **APLO** (aplo.com.pl) 🟠 Warszawa — 30 lat, 10 modeli, HoReCa sekcja, kuchnie ogrodowe, cena "14-16k standard". TYLKO Warszawa, gwarancja max 5 lat, brak CE DIN EN.
5. **ALUBOSS** (aluboss.pl) 🟡 Dolnośląskie — 10 lat, CENY JAWNE (13.5-18k za zestaw), sklep online, konfig prosty, drewutnie. Brak bioklimatycznych, niższa półka.
6. **Krajewski** (krajewski.pl) 🟡 Gliwice — od 1993, showroom, 16 kategorii produktów (pergole = marginalny). Duże referencje (Chopin Museum, Mercedes, Leroy).
7. **Tarasy4U** (tarasy4u.pl) 🟢 Jędrzejów — mała firma, deski + zadaszenia, 10 modeli, brak automatyki, przestarzała strona.
- **Nieobecni online:** alukov.pl, tarason.pl, pergole.pl
- **NASZ MOAT vs wszyscy:** (1) Konfigurator 3D prawdziwy, (2) Smart sterowanie z app (Pergola Deluxe), (3) Certyfikat CE DIN EN 1090, (4) 10 lat gwarancji, (5) 8 modeli + 8 dodatków, (6) Doświadczenie DE, (7) Skystyle = jedyna dedykowana linia HoReCa, (8) Designstyle = jedyny przesuwny dach szklany

**PEŁNA STRUKTURA 10 KAMPANII:**
8. **[HORECA]** — zabudowa ogródka restauracyjnego, pergola gastronomiczna, zadaszenie hotelu — segment 60-150k PLN
9. **[DESIGNSTYLE]** — przesuwny dach szklany, otwierany dach, sliding roof — unikatowy niszowy produkt  
10. **[DODATKI]** — markizy ZIP, ściany panoramiczne, panele osłonowe, steellook — cross-sell

**LANDING PAGE ROUTING:**
- "pergola bioklimatyczna" → /produkty/pergola.html
- "pergola smart/deluxe/aplikacja" → /produkty/pergola-deluxe.html
- "zadaszenie" ogólne / "cena" → /produkty/trendstyle.html (entry point)
- "nowoczesne/płaski dach" → /produkty/ultrastyle.html
- "masywne/wzmocnione/XL" → /produkty/topstyle.html
- "przesuwny dach/otwierany" → /produkty/designstyle.html
- "carport/wiata" → /produkty/carport.html
- "restauracja/hotel/HoReCa" → /produkty/skystyle.html
- "zabudowa szklana/pokój ogrodowy" → /dodatki/sciany-panoramiczne.html
- NIGDY na stronę główną

**ROZSZERZENIA REKLAM:**
- Sitelinks: Konfigurator 3D, Bezpłatna Wycena, Realizacje, Pergole, Carport, Zadaszenia
- Callouts: 10 lat gwarancji, Montaż w całej PL, Certyfikat CE, 500+ realizacji, 35+ kolorów RAL, Aluminium 6000
- Structured: Modele (Trendstyle/Topstyle/Ultrastyle/Designstyle/Pergola/Carport/Skystyle)
- Telefon: +48 533 459 475
- Formularz: /kontakt.html

**CONVERSION TRACKING:**
- Formularz kontaktowy → wartość: 35.000 PLN (średnie zamówienie)
- Click-to-call → wartość: 35.000 PLN
- Otwarcie konfiguratora → secondary, 5.000 PLN
- Scroll 75% na produkcie → observation

**REMARKETING:**
- /produkty/ visitors → RLSA +30% bid
- #konfigurator users → RLSA +50% bid
- /kontakt.html bez konwersji → Display remarketing
- Email list → Similar Audiences

**SEZONOWOŚĆ BUDŻETÓW:**
- Sty: 0.5x | Lut: 0.6x | MAR: 1.2x | KWI: 1.5x | MAJ: 1.5x | Cze: 1.3x
- Lip: 1.0x | Sie: 0.9x | Wrz: 0.8x | Paź: 0.6x | Lis: 0.5x | Gru: 0.4x

**KPI BENCHMARKS (branża PL 2026):**
- CPC: 3-8 PLN (pergole), 2-5 PLN (zadaszenia), 1-3 PLN (carporty)
- CTR: 4-8% (brand), 2-4% (generic), 1-2% (competitor)
- CVR (landing page): 3-7% (formularz kontaktowy)
- CPL target: 80-200 PLN (lead z formularza)
- Średnia wartość leada (lifetime): 35.000 PLN zamówienie
- ROAS: 5-15x (kampanie search well-optimized)

═══ TWOJE DANE OPERACYJNE ═══

## Konfiguracja biznesowa
${config ? `
- Budżet miesięczny: ${config.monthly_budget_pln} PLN
- Max CPL: ${config.max_cpl_pln} PLN
- Target ROAS: ${config.target_roas}x
- Regiony: ${config.regions?.join(", ") || "Ogólnopolskie"}
- Autonomia: ${config.autonomy_level}
- Emergency Stop: ${config.emergency_stop ? "AKTYWNY ⚠️" : "wyłączony"}
` : "Brak konfiguracji"}

## Metryki Google Ads (30 dni)
${metrics_summary ? `
- Wydatki 30d: ${metrics_summary.cost_30d?.toFixed(0)} PLN
- Kliknięcia 30d: ${metrics_summary.clicks_30d}
- Konwersje 30d (Google): ${metrics_summary.conversions_30d?.toFixed(0)}
- CPL (Google): ${metrics_summary.cpl_30d?.toFixed(0)} PLN
- ROAS: ${metrics_summary.roas_30d?.toFixed(1)}x
- Kampanie: ${metrics_summary.campaigns_count}
` : "Brak danych — synchronizacja nie wykonana"}

## Leady z zadaszto.pl (website_pl)
- Dziś: ${plToday}
- Ostatnie 7 dni: ${pl7d}
- Ostatnie 30 dni: ${pl30d}
- Łącznie w systemie: ${(plLeads || []).length}
${pl30d > 0 && metrics_summary?.cost_30d ? `- REALNY CPL (wydatki ads / leady z formularza): ${(metrics_summary.cost_30d / pl30d).toFixed(0)} PLN` : ""}

## Kampanie Google Ads
${campaigns?.length ? campaigns.map((c: any) => `- ${c.name} [${c.type}] — ${c.status} — budżet: ${c.daily_budget_pln || "?"} PLN/dzień — strategia: ${c.bidding_strategy || "?"}`).join("\n") : "Brak kampanii"}

## Ostatnie metryki dzienne (7 dni)
${recentMetrics?.slice(0, 7).map((m: any) => `${m.date}: ${m.clicks} klik., ${Number(m.cost_pln).toFixed(0)} PLN, ${m.conversions} konw., CTR ${(Number(m.ctr) * 100).toFixed(1)}%`).join("\n") || "Brak danych"}

## Otwarte alerty
${alerts?.length ? alerts.map((a: any) => `[${a.severity.toUpperCase()}] ${a.message}`).join("\n") : "Brak alertów"}

## Oczekujące propozycje
${proposals?.length ? proposals.map((p: any) => `[${p.risk_level}] ${p.title} — ${p.type}`).join("\n") : "Brak oczekujących propozycji"}

## Ostatnie leady
${(plLeads || []).slice(0, 5).map((l: any) => {
  const cd = l.customer_data || {};
  return `- ${cd.firstName || ""} ${cd.lastName || ""} (${cd.city || "?"}, ${cd.phone || cd.email || "?"}) — ${l.status} — ${new Date(l.created_at).toLocaleDateString("pl-PL")}`;
}).join("\n") || "Brak leadów"}

## Baza wiedzy AI
${knowledgeEntries?.length ? knowledgeEntries.map((k: any) => `- ${k.title}: ${k.summary} [${k.tags?.join(", ")}]`).join("\n") : "Baza wiedzy pusta — dodaj wpisy w zakładce Baza Wiedzy"}

═══ ZASADY ODPOWIEDZI ═══
1. Odpowiadaj PO POLSKU, profesjonalnie ale przystępnie
2. Podawaj konkretne liczby i procenty — NIE ogólniki
3. Porównuj aktualne dane z targetami (budżet, CPL, ROAS) i benchmarkami branżowymi
4. Proponuj KONKRETNE optymalizacje: nowe frazy, wykluczenia, zmiany budżetu, nowe grupy reklam
5. Wyróżniaj REALNY CPL (wydatki / leady z formularza) od CPL Google Ads (często zaniżony)
6. Pamiętaj o sezonowości — kwiecień to szczyt sezonu!
7. Sugeruj crossell/upsell (dodatki) w kontekście wartości koszyka
8. Zawsze pamiętaj o guardrails — maksymalny budżet, dozwolone konta, emergency stop
9. Bądź proaktywny — anomalia lub okazja = natychmiast informuj
10. Myśl jak CM z doświadczeniem 10+ lat w branży home improvement PPC w Polsce`;

    // Build messages array for Claude
    const messages = [
      ...history,
      { role: "user", content: message },
    ];

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[ads-chat] Claude API error:", err);
      return fail(`Claude API error (${response.status})`);
    }

    const result = await response.json();
    const aiResponse = result.content?.[0]?.text || "Przepraszam, nie udało się wygenerować odpowiedzi.";

    return ok({ response: aiResponse });
  } catch (error: any) {
    console.error("[ads-chat] Error:", error?.message || error);
    return fail(error?.message || "Nieznany błąd");
  }
});
