// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-weekly-report — Executive Summary Generator
//
// Runs every Monday at 08:00 — generates a comprehensive weekly
// report combining data from ALL agents:
// - Campaign performance (from ads-sync)
// - Google Trends (from ads-trends-sync)
// - Competitor changes (from ads-competitor-intel)
// - Optimization decisions (from ads-optimizer)
// - AI-generated insights & recommendations (from ads-research)
// - Lead flow (from website_pl tracking)
//
// Output: Saves to knowledge base + creates dashboard-readable entry
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    // ═══ 1. CAMPAIGN METRICS ═══
    const { data: thisWeekMetrics } = await supabase
      .from("ads_daily_metrics")
      .select("*")
      .gte("date", sevenDaysAgo);

    const { data: lastWeekMetrics } = await supabase
      .from("ads_daily_metrics")
      .select("*")
      .gte("date", fourteenDaysAgo)
      .lt("date", sevenDaysAgo);

    const sum = (arr: any[], field: string) => (arr || []).reduce((s, m) => s + (Number(m[field]) || 0), 0);

    const thisWeek = {
      cost: sum(thisWeekMetrics, "cost_pln"),
      clicks: sum(thisWeekMetrics, "clicks"),
      impressions: sum(thisWeekMetrics, "impressions"),
      conversions: sum(thisWeekMetrics, "conversions"),
    };
    const lastWeek = {
      cost: sum(lastWeekMetrics, "cost_pln"),
      clicks: sum(lastWeekMetrics, "clicks"),
      impressions: sum(lastWeekMetrics, "impressions"),
      conversions: sum(lastWeekMetrics, "conversions"),
    };

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+∞%" : "0%";
      const change = ((curr - prev) / prev) * 100;
      return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
    };

    // ═══ 2. LEADS FROM WEBSITE ═══
    const { count: leadsThisWeek } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("source", "website_pl")
      .gte("created_at", sevenDaysAgo);

    const { count: leadsLastWeek } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("source", "website_pl")
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo);

    // ═══ 3. PROPOSALS STATUS ═══
    const { data: proposals } = await supabase
      .from("ads_proposals")
      .select("status, type")
      .gte("created_at", sevenDaysAgo);

    const proposalStats = {
      total: proposals?.length || 0,
      pending: proposals?.filter((p: any) => p.status === "pending_approval").length || 0,
      approved: proposals?.filter((p: any) => p.status === "approved" || p.status === "auto_approved").length || 0,
      rejected: proposals?.filter((p: any) => p.status === "rejected").length || 0,
    };

    // ═══ 4. ALERTS ═══
    const { data: alerts } = await supabase
      .from("ads_alerts")
      .select("*")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });

    // ═══ 5. COMPETITOR INTEL ═══
    const { data: competitorReports } = await supabase
      .from("ads_knowledge_base")
      .select("summary")
      .eq("source_type", "competitor_scrape")
      .gte("created_at", sevenDaysAgo);

    // ═══ 6. TRENDS ═══
    const { data: trendsData } = await supabase
      .from("ads_knowledge_base")
      .select("summary")
      .eq("source_type", "google_trends")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    // ═══ 7. BUILD EXECUTIVE REPORT ═══
    const ctr = thisWeek.impressions > 0 ? (thisWeek.clicks / thisWeek.impressions * 100).toFixed(1) : "0";
    const cpc = thisWeek.clicks > 0 ? (thisWeek.cost / thisWeek.clicks).toFixed(1) : "0";
    const cpl = thisWeek.conversions > 0 ? Math.round(thisWeek.cost / thisWeek.conversions) : 0;
    const roas = thisWeek.cost > 0 ? ((thisWeek.conversions * 35000) / thisWeek.cost).toFixed(1) : "0";
    const realCPL = (leadsThisWeek || 0) > 0 && thisWeek.cost > 0 ? Math.round(thisWeek.cost / (leadsThisWeek || 1)) : 0;

    const report = `
╔══════════════════════════════════════════════════════════════╗
║   📊 TYGODNIOWY RAPORT AI ADS MANAGER — zadaszto.pl        ║
║   Okres: ${sevenDaysAgo} → ${today}                      ║
╚══════════════════════════════════════════════════════════════╝

═══ 💰 WYDATKI I WYNIKI ═══

| Metryka | Ten tydzień | Ub. tydzień | Zmiana |
|---------|------------|------------|--------|
| Wydatki | ${Math.round(thisWeek.cost)} PLN | ${Math.round(lastWeek.cost)} PLN | ${pctChange(thisWeek.cost, lastWeek.cost)} |
| Kliknięcia | ${thisWeek.clicks} | ${lastWeek.clicks} | ${pctChange(thisWeek.clicks, lastWeek.clicks)} |
| Wyświetlenia | ${thisWeek.impressions} | ${lastWeek.impressions} | ${pctChange(thisWeek.impressions, lastWeek.impressions)} |
| Konwersje (Google) | ${thisWeek.conversions} | ${lastWeek.conversions} | ${pctChange(thisWeek.conversions, lastWeek.conversions)} |
| Leady (zadaszto.pl) | ${leadsThisWeek || 0} | ${leadsLastWeek || 0} | ${pctChange(leadsThisWeek || 0, leadsLastWeek || 0)} |

═══ 📈 KPI ═══

| Wskaźnik | Wartość | Benchmark |
|----------|--------|-----------|
| CTR | ${ctr}% | 2-4% (generic) |
| CPC | ${cpc} PLN | 3-8 PLN (pergole) |
| CPL (Google) | ${cpl} PLN | <200 PLN |
| CPL (Real - leady/wydatki) | ${realCPL} PLN | <200 PLN |
| ROAS | ${roas}x | >5x |

═══ 🤖 AUTONOMICZNY AGENT — AKTYWNOŚĆ ═══

• Propozycje wygenerowane: ${proposalStats.total}
  - Oczekujące: ${proposalStats.pending}
  - Zatwierdzone: ${proposalStats.approved}
  - Odrzucone: ${proposalStats.rejected}
• Alerty: ${alerts?.length || 0}
${(alerts || []).slice(0, 5).map((a: any) => `  ${a.severity === "warning" ? "⚠️" : "ℹ️"} ${a.message?.slice(0, 100)}`).join("\n")}

═══ 📊 GOOGLE TRENDS ═══

${trendsData?.[0]?.summary || "Brak danych trendów w tym tygodniu"}

═══ 🕵️ COMPETITOR INTEL ═══

Przeanalizowano ${competitorReports?.length || 0} konkurentów
${(competitorReports || []).slice(0, 3).map((r: any) => r.summary?.split("\n")[0]).join("\n") || "Brak danych"}

═══ ✅ REKOMENDACJE NA PRZYSZŁY TYDZIEŃ ═══

${thisWeek.conversions > lastWeek.conversions ? "📈 Konwersje rosną — kontynuuj obecną strategię" : thisWeek.conversions < lastWeek.conversions ? "📉 Konwersje spadły — sprawdź propozycje optymalizacji w dashboardzie" : "➡️ Stabilne wyniki — szukaj nowych fraz i segmentów"}
${Number(ctr) < 2 ? "⚠️ CTR poniżej 2% — przejrzyj ad copy i frazy" : ""}
${Number(cpc) > 8 ? "⚠️ CPC powyżej 8 PLN — sprawdź Quality Score" : ""}
${cpl > 200 ? "⚠️ CPL przekracza 200 PLN — optymalizuj bidding lub landing page" : ""}
${proposalStats.pending > 0 ? `🔔 ${proposalStats.pending} propozycji oczekuje na Twoją decyzję w dashboardzie` : ""}

───────────────────────────────────────────────
Raport wygenerowany automatycznie przez
AI Ads Manager (zadaszto.pl) v6.0
Następny raport: ${new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)}
───────────────────────────────────────────────
`.trim();

    // Save to knowledge base
    await supabase.from("ads_knowledge_base").insert({
      title: `📊 Executive Report ${today}`,
      summary: report,
      tags: ["report", "weekly", "executive", today.slice(0, 7)],
      source_type: "executive_report",
      relevance_score: 1.0,
    });

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "weekly_report",
      customer_id: "system",
      resource_type: "report",
      payload: {
        period: `${sevenDaysAgo} to ${today}`,
        total_cost: thisWeek.cost,
        total_leads: leadsThisWeek || 0,
        proposals: proposalStats,
      },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[weekly-report] Generated for ${sevenDaysAgo} → ${today}`);

    return ok({
      period: `${sevenDaysAgo} → ${today}`,
      cost: Math.round(thisWeek.cost),
      leads: leadsThisWeek || 0,
      conversions: thisWeek.conversions,
      proposals: proposalStats,
      report_length: report.length,
    });
  } catch (error: any) {
    console.error("[weekly-report] Error:", error?.message);
    return fail(error?.message || "Unknown error");
  }
});
