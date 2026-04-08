// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-trends-sync — Google Trends + Competitor + Market Intelligence
//
// Collects:
// 1. Google Trends data for product keywords (seasonal demand)
// 2. Competitor keyword analysis (via Search Console cross-ref)
// 3. Landing page performance (PageSpeed Insights)
// 4. Market opportunity scoring
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

// ═══ GOOGLE TRENDS (public endpoint, no API key needed) ═══
async function fetchGoogleTrends(keyword: string, geo: string = "PL"): Promise<any> {
  try {
    // Google Trends explore token
    const exploreUrl = `https://trends.google.com/trends/api/explore?hl=pl&tz=-120&req=${encodeURIComponent(JSON.stringify({
      comparisonItem: [{ keyword, geo, time: "today 3-m" }],
      category: 0, property: ""
    }))}&tz=-120`;

    const exploreRes = await fetch(exploreUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" }
    });
    if (!exploreRes.ok) return null;

    const exploreText = await exploreRes.text();
    // Google Trends returns ")]}'," prefix
    const cleanJson = exploreText.replace(/^\)\]\}\',?\n/, "");
    const exploreData = JSON.parse(cleanJson);

    // Get interest over time token
    const timelineWidget = exploreData.widgets?.find((w: any) => w.id === "TIMESERIES");
    if (!timelineWidget?.token) return { keyword, trend: "no_data" };

    const timelineUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=pl&tz=-120&req=${encodeURIComponent(JSON.stringify(timelineWidget.request))}&token=${timelineWidget.token}&tz=-120`;

    const timelineRes = await fetch(timelineUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" }
    });
    if (!timelineRes.ok) return { keyword, trend: "fetch_error" };

    const timelineText = await timelineRes.text();
    const cleanTimeline = timelineText.replace(/^\)\]\}\',?\n/, "");
    const timelineData = JSON.parse(cleanTimeline);

    const points = timelineData.default?.timelineData || [];
    const values = points.map((p: any) => p.value?.[0] || 0);

    if (values.length < 4) return { keyword, trend: "insufficient_data", values };

    // Calculate trend direction
    const recent = values.slice(-4).reduce((a: number, b: number) => a + b, 0) / 4;
    const older = values.slice(0, 4).reduce((a: number, b: number) => a + b, 0) / 4;
    const trendPct = older > 0 ? ((recent - older) / older) * 100 : 0;
    const peak = Math.max(...values);
    const current = values[values.length - 1] || 0;

    return {
      keyword,
      current_interest: current,
      peak_interest: peak,
      peak_pct: peak > 0 ? Math.round((current / peak) * 100) : 0,
      trend_pct: Math.round(trendPct),
      trend_direction: trendPct > 15 ? "rising" : trendPct < -15 ? "falling" : "stable",
      data_points: values.length,
    };
  } catch (err) {
    console.warn(`[trends] Error for "${keyword}":`, err);
    return { keyword, trend: "error", error: String(err) };
  }
}

// ═══ PAGESPEED INSIGHTS (free, no key needed for basic) ═══
async function fetchPageSpeed(url: string): Promise<any> {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;
    const res = await fetch(apiUrl);
    if (!res.ok) return { url, error: "fetch_failed" };
    const data = await res.json();

    const lh = data.lighthouseResult;
    return {
      url,
      performance_score: Math.round((lh?.categories?.performance?.score || 0) * 100),
      fcp: lh?.audits?.["first-contentful-paint"]?.numericValue || 0,
      lcp: lh?.audits?.["largest-contentful-paint"]?.numericValue || 0,
      cls: lh?.audits?.["cumulative-layout-shift"]?.numericValue || 0,
      tbt: lh?.audits?.["total-blocking-time"]?.numericValue || 0,
      speed_index: lh?.audits?.["speed-index"]?.numericValue || 0,
    };
  } catch (err) {
    return { url, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ═══ 1. GOOGLE TRENDS — track demand for our products ═══
    const trendKeywords = [
      // Core products
      "pergola bioklimatyczna",
      "pergola aluminiowa",
      "zadaszenie tarasu",
      "zadaszenie aluminiowe",
      "carport aluminiowy",
      "wiata garażowa",
      // High-value niches
      "zabudowa tarasu szkło",
      "pergola z ogrzewaniem",
      "nowoczesne zadaszenie tarasu",
      "oranżeria aluminiowa",
      // HoReCa segment
      "zabudowa ogródka restauracyjnego",
      "zadaszenie gastronomiczne",
      // Competitor brand monitoring (7 bezpośrednich + 2 nieobecni online)
      "twigo pergola",
      "zabudowy tarasu",
      "ampergola",
      "aplo pergola",
      "aluboss zadaszenie",
      "krajewski pergola",
      "tarasy 4u",
      "alukov",
      "tarason",
    ];

    console.log(`[ads-trends] Fetching trends for ${trendKeywords.length} keywords...`);
    const trendsResults: any[] = [];

    // Fetch sequentially to avoid rate limiting
    for (const kw of trendKeywords) {
      const result = await fetchGoogleTrends(kw);
      if (result) trendsResults.push(result);
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 800));
    }

    // ═══ 2. LANDING PAGE PERFORMANCE ═══
    const landingPages = [
      "https://zadaszto.pl",
      "https://zadaszto.pl/produkty/pergola.html",
      "https://zadaszto.pl/produkty/pergola-deluxe.html",
      "https://zadaszto.pl/produkty/trendstyle.html",
      "https://zadaszto.pl/produkty/carport.html",
      "https://zadaszto.pl/produkty/skystyle.html",
    ];

    console.log(`[ads-trends] Checking PageSpeed for ${landingPages.length} pages...`);
    const pageSpeedResults: any[] = [];
    for (const url of landingPages) {
      const result = await fetchPageSpeed(url);
      if (result) pageSpeedResults.push(result);
      await new Promise(r => setTimeout(r, 1000));
    }

    // ═══ 3. SAVE TO KNOWLEDGE BASE ═══
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let saved = 0;

    // Trends insights
    const risingKeywords = trendsResults.filter(t => t.trend_direction === "rising");
    const fallingKeywords = trendsResults.filter(t => t.trend_direction === "falling");

    if (trendsResults.length > 0) {
      // Save trends summary
      await supabase.from("ads_knowledge_base").insert({
        title: `Google Trends ${today}`,
        summary: trendsResults.map(t =>
          `📊 "${t.keyword}": ${t.current_interest || "?"}/${t.peak_interest || "?"} (${t.trend_pct > 0 ? "+" : ""}${t.trend_pct || 0}% ${t.trend_direction === "rising" ? "📈" : t.trend_direction === "falling" ? "📉" : "➡️"})`
        ).join("\n"),
        tags: ["trends", "google-trends", today.slice(0, 7)],
        source_type: "google_trends",
        full_content: JSON.stringify(trendsResults),
        relevance_score: 0.9,
      });
      saved++;

      // Rising keywords alert
      if (risingKeywords.length > 0) {
        await supabase.from("ads_knowledge_base").insert({
          title: `🔥 Rosnące frazy ${today}`,
          summary: risingKeywords.map(t =>
            `"${t.keyword}" rośnie ${t.trend_pct}% — rozważ zwiększenie budżetu na tę frazę!`
          ).join("\n"),
          tags: ["trends", "rising", "opportunity"],
          source_type: "google_trends",
          relevance_score: 0.95,
        });
        saved++;

        // Auto-generate proposal for rising keywords
        for (const rising of risingKeywords.slice(0, 2)) {
          await supabase.from("ads_proposals").insert({
            title: `📈 Zwiększ budżet na "${rising.keyword}" (+${rising.trend_pct}% trendu)`,
            description: `Google Trends pokazuje wzrost zainteresowania frazą "${rising.keyword}" o ${rising.trend_pct}% w ostatnich 3 miesiącach. Aktualne zainteresowanie: ${rising.current_interest}/${rising.peak_interest} (${rising.peak_pct}% peak). Rekomendacja: zwiększenie stawek CPC o 15-25% i rozszerzenie budżetu dziennego na kampanię zawierającą tę frazę.`,
            type: "budget_change",
            risk_level: "low",
            status: "pending_approval",
            reasoning_full: `[Google Trends Agent] Trend +${rising.trend_pct}%. Kwiecień to szczyt sezonu. Agresywne skalowanie fraz rosnących może dać przewagę nad konkurencją.`,
            source: "trends_agent",
          });
        }
      }

      // Falling keywords warning
      if (fallingKeywords.length > 0) {
        await supabase.from("ads_alerts").insert({
          severity: "info",
          type: "trend_alert",
          message: `📉 Spadające frazy: ${fallingKeywords.map(t => `"${t.keyword}" (${t.trend_pct}%)`).join(", ")}. Rozważ realokację budżetu.`,
        });
      }
    }

    // PageSpeed insights
    if (pageSpeedResults.length > 0) {
      const slowPages = pageSpeedResults.filter(p => p.performance_score && p.performance_score < 50);
      const avgScore = pageSpeedResults
        .filter(p => p.performance_score)
        .reduce((s, p) => s + p.performance_score, 0) / pageSpeedResults.filter(p => p.performance_score).length;

      await supabase.from("ads_knowledge_base").insert({
        title: `PageSpeed ${today}`,
        summary: pageSpeedResults.map(p =>
          `${p.url?.replace("https://zadaszto.pl", "")}: ${p.performance_score || "?"}/100 (LCP: ${p.lcp ? (p.lcp / 1000).toFixed(1) + "s" : "?"})`
        ).join("\n") + `\nŚrednia: ${avgScore.toFixed(0)}/100`,
        tags: ["pagespeed", "landing-pages", "performance"],
        source_type: "pagespeed",
        full_content: JSON.stringify(pageSpeedResults),
        relevance_score: 0.7,
      });
      saved++;

      // Alert for slow pages
      if (slowPages.length > 0) {
        await supabase.from("ads_alerts").insert({
          severity: "warning",
          type: "pagespeed_alert",
          message: `🐌 Wolne landing pages: ${slowPages.map(p => `${p.url?.replace("https://zadaszto.pl", "")} (${p.performance_score}/100)`).join(", ")}. Wolna strona = niższy Quality Score = wyższe CPC!`,
        });

        await supabase.from("ads_proposals").insert({
          title: `⚡ Optymalizacja szybkości landing pages`,
          description: `PageSpeed Insights wykrył wolne strony: ${slowPages.map(p => `${p.url} (${p.performance_score}/100, LCP: ${(p.lcp / 1000).toFixed(1)}s)`).join("; ")}. Cel: >70/100. Wolna strona obniża Quality Score w Google Ads, co podnosi CPC o 15-30%.`,
          type: "landing_page",
          risk_level: "low",
          status: "pending_approval",
          reasoning_full: "[PageSpeed Agent] Google penalizuje wolne strony wyższym CPC. Optymalizacja LCP i CLS poprawia QS i CVR.",
          source: "pagespeed_agent",
        });
      }
    }

    // Competitor brand monitoring
    const competitorTrends = trendsResults.filter(t =>
      ["twigo pergola", "zabudowy tarasu", "ampergola", "aplo pergola", "aluboss zadaszenie", "krajewski pergola", "tarasy 4u", "alukov", "tarason"].includes(t.keyword)
    );
    if (competitorTrends.length > 0) {
      await supabase.from("ads_knowledge_base").insert({
        title: `Monitoring konkurencji ${today}`,
        summary: competitorTrends.map(t =>
          `Marka "${t.keyword}": zainteresowanie ${t.current_interest || "?"}/${t.peak_interest || "?"} (${t.trend_direction === "rising" ? "📈 rośnie" : t.trend_direction === "falling" ? "📉 spada" : "➡️ stabilnie"})`
        ).join("\n"),
        tags: ["competitor", "monitoring", today.slice(0, 7)],
        source_type: "competitor_analysis",
        relevance_score: 0.8,
      });
      saved++;
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "trends_sync",
      customer_id: "system",
      resource_type: "trends",
      payload: {
        trends_fetched: trendsResults.length,
        rising: risingKeywords.length,
        falling: fallingKeywords.length,
        pagespeed_checked: pageSpeedResults.length,
        knowledge_saved: saved,
      },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-trends] Done: ${trendsResults.length} trends, ${pageSpeedResults.length} pages, ${saved} knowledge entries`);

    return ok({
      trends: trendsResults.length,
      rising_keywords: risingKeywords.map(t => t.keyword),
      falling_keywords: fallingKeywords.map(t => t.keyword),
      pagespeed_avg: pageSpeedResults.filter(p => p.performance_score).reduce((s, p) => s + p.performance_score, 0) / Math.max(pageSpeedResults.filter(p => p.performance_score).length, 1),
      knowledge_saved: saved,
    });
  } catch (error: any) {
    console.error("[ads-trends] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
