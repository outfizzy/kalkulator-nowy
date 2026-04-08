// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-copy-generator — AI Ad Copy & Strategy Generator
//
// Generates optimized:
// 1. Google Ads headlines (max 30 chars) & descriptions (max 90 chars)
// 2. Responsive Search Ad (RSA) variants
// 3. Sitelink extensions
// 4. New campaign structures based on market data
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
function fail(msg: string) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return fail("Brak ANTHROPIC_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const targetProduct = body.product || "all"; // "pergola", "carport", "zadaszenie", "horeca", "all"
    const targetSegment = body.segment || "b2c"; // "b2c", "horeca", "b2b"

    // Load context
    const { data: campaigns } = await supabase
      .from("ads_campaigns")
      .select("name, type, status")
      .eq("status", "ENABLED");

    const { data: topKeywords } = await supabase
      .from("ads_search_console_metrics")
      .select("query, clicks, ctr, position")
      .order("clicks", { ascending: false })
      .limit(15);

    const { data: trendKnowledge } = await supabase
      .from("ads_knowledge_base")
      .select("title, summary")
      .eq("source_type", "google_trends")
      .order("learned_at", { ascending: false })
      .limit(3);

    const { data: recentLeads } = await supabase
      .from("leads")
      .select("customer_data")
      .eq("source", "website_pl")
      .order("created_at", { ascending: false })
      .limit(50);

    // Analyze what customers actually ask for
    const customerNeeds: string[] = [];
    for (const l of recentLeads || []) {
      const cd = l.customer_data || {};
      if (cd.message) customerNeeds.push(cd.message);
      if (cd.product) customerNeeds.push(`Produkt: ${cd.product}`);
      if (cd.uwagi) customerNeeds.push(cd.uwagi);
    }

    const prompt = `Jesteś ekspertem Google Ads copywriterem specjalizującym się w branży premium zadaszeń aluminiowych w Polsce.

FIRMA: zadaszto.pl
PRODUKTY:
- Trendstyle, Topstyle, Ultrastyle, Designstyle — zadaszenia tarasów aluminiowe (VSG/poliwęglan)
- Pergola, Pergola Deluxe — pergole bioklimatyczne z lamelami, sterowanie SOMFY
- Carport — wiaty aluminiowe, kompatybilne z fotowoltaiką
- Skystyle — zabudowy gastronomiczne HoReCa

USP: Konfigurator 3D online, 10 lat gwarancji, certyfikacja CE DIN EN 1090, montaż w całej Polsce, własne ekipy, doświadczenie z rynku DE

CEL: ${targetProduct === "all" ? "Wszystkie produkty" : targetProduct}
SEGMENT: ${targetSegment === "b2c" ? "Klienci indywidualni (domy, tarasy)" : targetSegment === "horeca" ? "HoReCa (restauracje, hotele, kawiarnie)" : "B2B (deweloperzy, architekci)"}

AKTUALNE FRAZY ORGANICZNE (Search Console):
${topKeywords?.map(k => `"${k.query}" — ${k.clicks} klik, CTR ${(Number(k.ctr) * 100).toFixed(1)}%`).join("\n") || "Brak danych"}

TRENDY GOOGLE:
${trendKnowledge?.map(t => t.summary).join("\n") || "Brak danych"}

CO KLIENCI PISZĄ W FORMULARZACH:
${customerNeeds.slice(0, 10).join("\n") || "Brak danych"}

ISTNIEJĄCE KAMPANIE:
${campaigns?.map(c => c.name).join(", ") || "Brak"}

═══ WYGENERUJ W FORMACIE JSON ═══

{
  "responsive_search_ads": [
    {
      "campaign_name": "nazwa kampanii",
      "ad_group": "nazwa grupy reklam",
      "headlines": ["max 30 znaków każdy", "min 10 nagłówków"],
      "descriptions": ["max 90 znaków każdy", "min 4 opisy"],
      "final_url": "https://zadaszto.pl/produkty/xxx.html",
      "target_keywords": ["fraza1", "fraza2"]
    }
  ],
  "sitelink_extensions": [
    {"text": "max 25 znaków", "description1": "max 35 zn", "description2": "max 35 zn", "final_url": "url"}
  ],
  "new_campaign_ideas": [
    {
      "name": "nazwa kampanii",
      "type": "SEARCH",
      "target_segment": "b2c|horeca|b2b",
      "keywords": ["fraza1", "fraza2"],
      "negative_keywords": ["neg1", "neg2"],
      "estimated_daily_budget_pln": 50,
      "reasoning": "dlaczego ta kampania"
    }
  ],
  "seasonal_adjustments": {
    "current_month_strategy": "co robić w tym miesiącu",
    "budget_recommendation": "opis zmian budżetu",
    "upcoming_opportunities": ["okazja1", "okazja2"]
  }
}

WAŻNE REGUŁY:
- Nagłówki MUSZĄ mieć max 30 znaków (Polski: z polskimi znakami)
- Opisy MUSZĄ mieć max 90 znaków
- Używaj CTA: "Bezpłatna Wycena", "Sprawdź Ceny", "Zaprojektuj Online"
- Zawsze dodawaj cenę psychologiczną lub benefit: "od 15.000 PLN", "10 Lat Gwarancji"
- HoReCa: podkreślaj "ogródek restauracyjny", "zabudowa gastronomiczna", "ROI z dodatkowych miejsc"
- B2C: podkreślaj "na wymiar", "montaż w całej Polsce", "bez pozwolenia (carport)"
- B2B: podkreślaj "certyfikacja CE", "B2B rabaty", "serie deweloperskie"
- Kwiecień = szczyt sezonu — agresywne CTA`;

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
        system: "Jesteś ekspertem Google Ads. Odpowiadaj WYŁĄCZNIE w formacie JSON. Wszystkie teksty reklamowe PO POLSKU.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return fail(`Claude API error (${response.status})`);
    }

    const result = await response.json();
    const aiText = result.content?.[0]?.text || "";

    let adCopy: any = {};
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) adCopy = JSON.parse(jsonMatch[0]);
    } catch { adCopy = { raw: aiText }; }

    // Save generated copy to knowledge base
    await supabase.from("ads_knowledge_base").insert({
      title: `Ad Copy ${targetProduct}/${targetSegment} — ${new Date().toISOString().slice(0, 10)}`,
      summary: `Wygenerowano ${adCopy.responsive_search_ads?.length || 0} RSA, ${adCopy.sitelink_extensions?.length || 0} sitelinks, ${adCopy.new_campaign_ideas?.length || 0} pomysłów na kampanie`,
      tags: ["ad-copy", targetProduct, targetSegment],
      source_type: "ai_copywriter",
      full_content: JSON.stringify(adCopy),
      relevance_score: 0.85,
    });

    // If new campaign ideas generated, create proposals
    if (adCopy.new_campaign_ideas?.length) {
      for (const idea of adCopy.new_campaign_ideas.slice(0, 3)) {
        await supabase.from("ads_proposals").insert({
          title: `🆕 Nowa kampania: ${idea.name}`,
          description: `${idea.reasoning}. Keywords: ${idea.keywords?.join(", ")}. Budżet: ${idea.estimated_daily_budget_pln} PLN/dzień. Segment: ${idea.target_segment}.`,
          type: "new_campaign",
          risk_level: "medium",
          status: "pending_approval",
          reasoning_full: `[AI Copywriter] ${JSON.stringify(idea)}`,
          source: "copy_generator",
        });
      }
    }

    await supabase.from("ads_audit_log").insert({
      operation: "copy_generation",
      customer_id: "system",
      resource_type: "ad_copy",
      payload: {
        product: targetProduct,
        segment: targetSegment,
        rsa_count: adCopy.responsive_search_ads?.length || 0,
        campaign_ideas: adCopy.new_campaign_ideas?.length || 0,
      },
      success: true,
      triggered_by: body.triggered_by || "manual",
    });

    return ok({
      ad_copy: adCopy,
      product: targetProduct,
      segment: targetSegment,
    });
  } catch (error: any) {
    console.error("[ads-copy] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
