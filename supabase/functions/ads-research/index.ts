// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-research — Autonomous AI Research & Self-Learning Agent
// 
// This agent runs daily and:
// 1. Analyzes own campaign performance trends (self-reflection)
// 2. Researches industry trends & competitor moves
// 3. Discovers new keyword opportunities
// 4. Identifies untapped customer segments (B2C, HoReCa, B2B)
// 5. Seeds the knowledge base with learnings
// 6. Generates improvement proposals
//
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return fail("Brak ANTHROPIC_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ═══ GATHER ALL CONTEXT FOR AI SELF-REFLECTION ═══

    // 1. Campaign performance (last 30 days)
    const { data: metrics30d } = await supabase
      .from("ads_daily_metrics")
      .select("date, campaign_id, impressions, clicks, cost_pln, conversions, conv_value_pln, ctr, avg_cpc, roas")
      .order("date", { ascending: false })
      .limit(200);

    // 2. Campaigns list
    const { data: campaigns } = await supabase
      .from("ads_campaigns")
      .select("id, name, type, status, daily_budget_pln, bidding_strategy")
      .order("name");

    // 3. Recent Polish leads (for conversion quality analysis)
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("id, status, customer_data, source, created_at")
      .eq("source", "website_pl")
      .order("created_at", { ascending: false })
      .limit(200);

    // 4. Past proposals (to learn what worked)
    const { data: pastProposals } = await supabase
      .from("ads_proposals")
      .select("title, type, status, impact_verdict, result_after_7d, reasoning_full, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    // 5. Existing knowledge base (to avoid duplicates)
    const { data: existingKnowledge } = await supabase
      .from("ads_knowledge_base")
      .select("title, summary, tags, learned_at")
      .order("learned_at", { ascending: false })
      .limit(20);

    // 6. Active experiments
    const { data: experiments } = await supabase
      .from("ads_experiments")
      .select("hypothesis, status, winner, learnings")
      .limit(10);

    // 7. GA4 data for website behavior insights
    const { data: ga4Data } = await supabase
      .from("ads_ga4_metrics")
      .select("date, sessions, users, bounce_rate, conversions, source, medium")
      .order("date", { ascending: false })
      .limit(60);

    // 8. Search Console data for organic keyword insights
    const { data: gscData } = await supabase
      .from("ads_search_console_metrics")
      .select("query, clicks, impressions, ctr, position")
      .order("clicks", { ascending: false })
      .limit(30);

    // 9. Business config
    const { data: config } = await supabase
      .from("ads_business_config")
      .select("*")
      .limit(1)
      .single();

    // ═══ COMPUTE SELF-REFLECTION METRICS ═══
    const now = new Date();
    const leadsToday = (recentLeads || []).filter(
      (l: any) => new Date(l.created_at).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
    ).length;
    const leads7d = (recentLeads || []).filter(
      (l: any) => (now.getTime() - new Date(l.created_at).getTime()) <= 7 * 86400000
    ).length;
    const leads30d = (recentLeads || []).filter(
      (l: any) => (now.getTime() - new Date(l.created_at).getTime()) <= 30 * 86400000
    ).length;

    const cost30d = (metrics30d || []).reduce((s, m) => s + Number(m.cost_pln || 0), 0);
    const clicks30d = (metrics30d || []).reduce((s, m) => s + Number(m.clicks || 0), 0);
    const conversions30d = (metrics30d || []).reduce((s, m) => s + Number(m.conversions || 0), 0);
    const realCPL = leads30d > 0 ? cost30d / leads30d : 0;

    // Trend: compare last 7 days vs previous 7 days
    const last7d = (metrics30d || []).filter(m => {
      const d = new Date(m.date);
      return (now.getTime() - d.getTime()) <= 7 * 86400000;
    });
    const prev7d = (metrics30d || []).filter(m => {
      const d = new Date(m.date);
      const diff = now.getTime() - d.getTime();
      return diff > 7 * 86400000 && diff <= 14 * 86400000;
    });

    const costLast7 = last7d.reduce((s, m) => s + Number(m.cost_pln || 0), 0);
    const costPrev7 = prev7d.reduce((s, m) => s + Number(m.cost_pln || 0), 0);
    const clicksLast7 = last7d.reduce((s, m) => s + Number(m.clicks || 0), 0);
    const clicksPrev7 = prev7d.reduce((s, m) => s + Number(m.clicks || 0), 0);

    // Lead city analysis (understand geographic demand)
    const cityCount: Record<string, number> = {};
    for (const l of recentLeads || []) {
      const city = l.customer_data?.city || l.customer_data?.miasto || "unknown";
      cityCount[city] = (cityCount[city] || 0) + 1;
    }
    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => `${city}: ${count}`)
      .join(", ");

    // Lead product interest analysis
    const productInterest: Record<string, number> = {};
    for (const l of recentLeads || []) {
      const product = l.customer_data?.product || l.customer_data?.produkt || l.customer_data?.model || "unknown";
      if (product && product !== "unknown") {
        productInterest[product] = (productInterest[product] || 0) + 1;
      }
    }

    // Positive/negative proposal tracking
    const positiveProposals = (pastProposals || []).filter(p => p.impact_verdict === "positive");
    const negativeProposals = (pastProposals || []).filter(p => p.impact_verdict === "negative");

    // ═══ AUTONOMOUS AI RESEARCH PROMPT ═══
    const researchPrompt = `Jesteś autonomicznym AI Research Agentem dla zadaszto.pl — firmy sprzedającej premium aluminiowe zadaszenia tarasowe, pergole bioklimatyczne, carporty i systemy zabudowy szklanych w Polsce.

TWOJA MISJA: Ciągłe doskonalenie kampanii Google Ads, odkrywanie nowych segmentów klientów, uczenie się z własnych błędów i sukcesów, generowanie innowacyjnych strategii dotarcia do klienta.

═══ KONTEKST PRODUKTOWY ═══
Produkty: Trendstyle, Topstyle, Ultrastyle, Designstyle (zadaszenia), Pergola, Pergola Deluxe (bioklimatyczne), Carport (wiaty aluminiowe), Skystyle (HoReCa).
Dodatki: markizy ZIP, ściany panoramiczne, szyby przesuwne, panele osłonowe, Steellook, LED.
USP: Konfigurator 3D online, doświadczenie z DE, własne ekipy montażowe, certyfikacja CE DIN EN 1090.
Średnia wartość zamówienia: 25.000–60.000 PLN.
Strona: zadaszto.pl

═══ AKTUALNE DANE OPERACYJNE ═══
- Wydatki 30d: ${cost30d.toFixed(0)} PLN
- Kliknięcia 30d: ${clicks30d}
- Konwersje Google 30d: ${conversions30d}
- Leady z formularza 30d: ${leads30d}
- REALNY CPL: ${realCPL.toFixed(0)} PLN
- Trend kosztu (tydzień do tygodnia): ${costPrev7 > 0 ? ((costLast7 - costPrev7) / costPrev7 * 100).toFixed(0) : "?"} %
- Trend kliknięć (tydzień do tygodnia): ${clicksPrev7 > 0 ? ((clicksLast7 - clicksPrev7) / clicksPrev7 * 100).toFixed(0) : "?"}%
- Top miasta leadów: ${topCities || "brak danych"}
- Produkty w leadach: ${Object.entries(productInterest).map(([p, c]) => `${p}:${c}`).join(", ") || "brak danych"}

Kampanie:
${campaigns?.map(c => `- ${c.name} [${c.type}] ${c.status} — ${c.daily_budget_pln || "?"} PLN/dzień`).join("\n") || "Brak kampanii"}

Wcześniejsze propozycje, które zadziałały (positive impact):
${positiveProposals.length > 0 ? positiveProposals.map(p => `✅ ${p.title}: ${p.result_after_7d ? JSON.stringify(p.result_after_7d) : "brak danych"}`).join("\n") : "Brak danych"}

Propozycje, które NIE zadziałały (negative impact):
${negativeProposals.length > 0 ? negativeProposals.map(p => `❌ ${p.title}: ${p.result_after_7d ? JSON.stringify(p.result_after_7d) : "brak danych"}`).join("\n") : "Brak danych"}

Organiczne frazy (Search Console):
${gscData?.slice(0, 15).map(g => `"${g.query}" — ${g.clicks} klik, CTR ${(Number(g.ctr) * 100).toFixed(1)}%, poz. ${Number(g.position).toFixed(1)}`).join("\n") || "Brak danych GSC"}

GA4 źródła ruchu (30d):
${(() => {
  const sources: Record<string, number> = {};
  for (const g of ga4Data || []) sources[`${g.source}/${g.medium}`] = (sources[`${g.source}/${g.medium}`] || 0) + g.sessions;
  return Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, n]) => `${s}: ${n} sesji`).join(", ") || "Brak GA4";
})()}

Istniejąca baza wiedzy:
${existingKnowledge?.map(k => `- ${k.title} [${k.tags?.join(",")}]`).join("\n") || "Pusta"}

Eksperymenty:
${experiments?.map(e => `- ${e.hypothesis} → ${e.status} ${e.winner ? `(🏆 ${e.winner})` : ""} ${e.learnings || ""}`).join("\n") || "Brak"}

═══ TERAZ WYGENERUJ RAPORT RESEARCH ═══

Odpowiedz w formacie JSON z 5 sekcjami:

{
  "self_reflection": {
    "what_worked": "Co zadziałało w ostatnich dniach — konkretne kampanie, frazy, segmenty",
    "what_failed": "Co nie zadziałało i dlaczego — analiza porażek",
    "trends": "Trendy w danych — rosnące/malejące metryki, sezonowość",
    "blind_spots": "Czego NIE robimy, a powinniśmy — niewykorzystane okazje"
  },
  "new_keywords": [
    {"keyword": "fraza", "match_type": "exact|phrase", "expected_cpc": 5, "reasoning": "dlaczego ta fraza"}
  ],
  "customer_segments": [
    {"segment": "nazwa segmentu", "description": "opis", "approach": "jak dotrzeć", "expected_value": "szacunkowa wartość"}
  ],
  "knowledge_entries": [
    {"title": "tytuł", "summary": "treść wiedzy", "tags": ["tag1","tag2"], "source_type": "ai_research"}
  ],
  "proposals": [
    {"title": "tytuł propozycji", "description": "opis zmian", "type": "budget_change|keyword_add|new_campaign|targeting|ad_copy", "risk_level": "low|medium|high", "expected_impact": "opis oczekiwanego efektu"}
  ]
}

WAŻNE WYTYCZNE:
- Myśl o NOWYCH segmentach: hotele, restauracje, kawiarnie, centra handlowe, deweloperzy, architekci
- Myśl o sezonowości: kwiecień to SZCZYT sezonu — agresywnie skaluj
- Analizuj jakie frazy organiczne (GSC) mogą być dobrymi frazami PPC
- Uczs się z przeszłych propozycji — powtarzaj to co zadziałało, unikaj tego co nie zadziałało
- Szukaj nisz: "pergola z ogrzewaniem", "zabudowa ogródka restauracyjnego", "carport z fotowoltaiką"
- Generuj 3-5 wpisów do bazy wiedzy z aktualnymi obserwacjami
- Generuj 2-4 propozycje optymalizacji (konkretne, mierzalne)
- NIE powtarzaj tego co już jest w bazie wiedzy`;

    // ═══ CALL CLAUDE ═══
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: "Jesteś autonomicznym AI Research Agent specjalizującym się w Google Ads dla branży premium zadaszeń aluminiowych w Polsce. Odpowiadaj WYŁĄCZNIE w formacie JSON.",
        messages: [{ role: "user", content: researchPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[ads-research] Claude API error:", err);
      return fail(`Claude API error (${response.status})`);
    }

    const result = await response.json();
    const aiText = result.content?.[0]?.text || "";

    // Parse JSON from AI response
    let research: any = {};
    try {
      // Extract JSON block if wrapped in ```json ... ```
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn("[ads-research] JSON parse error, using raw text");
      research = { raw_output: aiText };
    }

    // ═══ AUTONOMOUS ACTIONS ═══
    let knowledgeSaved = 0;
    let proposalsSaved = 0;

    // 1. Save knowledge entries to database
    if (research.knowledge_entries?.length) {
      for (const entry of research.knowledge_entries) {
        const { error } = await supabase.from("ads_knowledge_base").insert({
          title: entry.title,
          summary: entry.summary,
          tags: entry.tags || [],
          source_type: entry.source_type || "ai_research",
          source_url: null,
          full_content: JSON.stringify(entry),
          relevance_score: 0.8,
        });
        if (!error) knowledgeSaved++;
      }
    }

    // 2. Save proposals to database
    if (research.proposals?.length) {
      for (const proposal of research.proposals) {
        const { error } = await supabase.from("ads_proposals").insert({
          title: proposal.title,
          description: proposal.description,
          type: proposal.type || "optimization",
          risk_level: proposal.risk_level || "medium",
          reasoning_full: `[AI Research Agent] ${proposal.expected_impact || ""}. Frazy: ${JSON.stringify(research.new_keywords?.slice(0, 3) || [])}`,
          status: "pending_approval",
          source: "ai_research",
        });
        if (!error) proposalsSaved++;
      }
    }

    // 3. Log self-reflection data
    if (research.self_reflection) {
      await supabase.from("ads_knowledge_base").insert({
        title: `Self-Reflection ${now.toISOString().slice(0, 10)}`,
        summary: `Co zadziałało: ${research.self_reflection.what_worked || "?"}. Co nie: ${research.self_reflection.what_failed || "?"}. Blind spots: ${research.self_reflection.blind_spots || "?"}`,
        tags: ["self-reflection", "performance", now.toISOString().slice(0, 7)],
        source_type: "ai_reflection",
        relevance_score: 0.9,
      });
      knowledgeSaved++;
    }

    // 4. Save new keyword discoveries
    if (research.new_keywords?.length) {
      await supabase.from("ads_knowledge_base").insert({
        title: `Nowe frazy kluczowe ${now.toISOString().slice(0, 10)}`,
        summary: research.new_keywords.map((k: any) => `"${k.keyword}" (${k.match_type}, ~${k.expected_cpc} PLN CPC) — ${k.reasoning}`).join("\n"),
        tags: ["keywords", "discovery", now.toISOString().slice(0, 7)],
        source_type: "ai_research",
        relevance_score: 0.85,
      });
      knowledgeSaved++;
    }

    // 5. Save customer segment insights
    if (research.customer_segments?.length) {
      await supabase.from("ads_knowledge_base").insert({
        title: `Segmenty klientów ${now.toISOString().slice(0, 10)}`,
        summary: research.customer_segments.map((s: any) => `🎯 ${s.segment}: ${s.description}. Dotarcie: ${s.approach}. Wartość: ${s.expected_value}`).join("\n"),
        tags: ["segments", "strategy", now.toISOString().slice(0, 7)],
        source_type: "ai_research",
        relevance_score: 0.85,
      });
      knowledgeSaved++;
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "ai_research",
      customer_id: "system",
      resource_type: "research",
      payload: {
        knowledge_saved: knowledgeSaved,
        proposals_saved: proposalsSaved,
        new_keywords: research.new_keywords?.length || 0,
        customer_segments: research.customer_segments?.length || 0,
        self_reflection: !!research.self_reflection,
      },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-research] Done: ${knowledgeSaved} knowledge entries, ${proposalsSaved} proposals`);

    return ok({
      knowledge_saved: knowledgeSaved,
      proposals_saved: proposalsSaved,
      research_summary: research.self_reflection || {},
      new_keywords: research.new_keywords?.length || 0,
      customer_segments: research.customer_segments?.length || 0,
    });
  } catch (error: any) {
    console.error("[ads-research] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
