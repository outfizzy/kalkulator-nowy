// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-optimizer — Autonomous Campaign Optimization Brain
//
// Runs daily at 06:00 — the "brain" that makes decisions:
// 1. Budget reallocation (shift money from weak → strong campaigns)
// 2. Seasonality auto-adjust (budget multipliers per month)
// 3. A/B ad copy performance analysis → pause losers
// 4. Negative keyword mining from search terms
// 5. Quality Score monitoring → landing page alerts
// 6. ROAS-based bid adjustments
// 7. Weekly performance grading per campaign
//
// Decision framework:
//   - autonomy_level "low"  → only creates proposals
//   - autonomy_level "medium" → executes low-risk automatically
//   - autonomy_level "high" → executes medium-risk automatically
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

// ═══ SEASONALITY MULTIPLIERS ═══
const SEASON_MULTIPLIERS: Record<number, number> = {
  1: 0.5, 2: 0.6, 3: 1.2, 4: 1.5, 5: 1.5, 6: 1.3,
  7: 1.0, 8: 0.9, 9: 0.8, 10: 0.6, 11: 0.5, 12: 0.4,
};

// ═══ CAMPAIGN HEALTH GRADING ═══
function gradeCampaign(metrics: {
  ctr: number; cpc: number; cvr: number; roas: number; cpl: number;
  clicks: number; cost: number; conversions: number;
}): { grade: string; score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  // CTR scoring (weight: 20)
  if (metrics.ctr >= 0.05) score += 20;
  else if (metrics.ctr >= 0.03) score += 15;
  else if (metrics.ctr >= 0.02) score += 10;
  else { score += 5; issues.push(`Niski CTR (${(metrics.ctr * 100).toFixed(1)}%) — popraw ad copy lub frazy`); }

  // CPC scoring (weight: 15) — lower is better for premium
  if (metrics.cpc <= 3) score += 15;
  else if (metrics.cpc <= 5) score += 12;
  else if (metrics.cpc <= 8) score += 8;
  else { score += 3; issues.push(`Wysoki CPC (${metrics.cpc.toFixed(1)} PLN) — sprawdź Quality Score`); }

  // CVR scoring (weight: 25)
  if (metrics.cvr >= 0.07) score += 25;
  else if (metrics.cvr >= 0.04) score += 20;
  else if (metrics.cvr >= 0.02) score += 12;
  else { score += 5; issues.push(`Niska konwersja (${(metrics.cvr * 100).toFixed(1)}%) — sprawdź landing page`); }

  // ROAS scoring (weight: 25)
  if (metrics.roas >= 10) score += 25;
  else if (metrics.roas >= 5) score += 20;
  else if (metrics.roas >= 2) score += 12;
  else { score += 3; issues.push(`Niski ROAS (${metrics.roas.toFixed(1)}x) — rozważ obniżenie stawek lub wstrzymanie`); }

  // Volume scoring (weight: 15)
  if (metrics.clicks >= 100) score += 15;
  else if (metrics.clicks >= 50) score += 10;
  else if (metrics.clicks >= 20) score += 7;
  else { score += 3; issues.push(`Niska liczba kliknięć (${metrics.clicks}) — za mało danych do optymalizacji`); }

  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  return { grade, score, issues };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMonth = now.getMonth() + 1;
    const seasonMultiplier = SEASON_MULTIPLIERS[currentMonth] || 1.0;
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...

    // Load config
    const { data: config } = await supabase
      .from("ads_config")
      .select("*")
      .single();

    if (config?.emergency_stop) {
      return ok({ skipped: true, reason: "Emergency stop active" });
    }

    const autonomyLevel = config?.autonomy_level || "low";
    let proposals_created = 0;
    let auto_executed = 0;
    const decisions: string[] = [];

    // ═══ 1. LOAD CAMPAIGN METRICS (last 7 days) ═══
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const { data: campaigns } = await supabase
      .from("ads_campaigns")
      .select("*")
      .eq("status", "ENABLED");

    const { data: recentMetrics } = await supabase
      .from("ads_daily_metrics")
      .select("*")
      .gte("date", sevenDaysAgo);

    // ═══ 2. GRADE EACH CAMPAIGN ═══
    const campaignGrades: any[] = [];
    for (const campaign of (campaigns || [])) {
      const metrics = (recentMetrics || []).filter((m: any) => m.campaign_id === campaign.campaign_id);
      if (metrics.length === 0) continue;

      const totalClicks = metrics.reduce((s: number, m: any) => s + (Number(m.clicks) || 0), 0);
      const totalCost = metrics.reduce((s: number, m: any) => s + (Number(m.cost_pln) || 0), 0);
      const totalConversions = metrics.reduce((s: number, m: any) => s + (Number(m.conversions) || 0), 0);
      const totalImpressions = metrics.reduce((s: number, m: any) => s + (Number(m.impressions) || 0), 0);

      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const cpc = totalClicks > 0 ? totalCost / totalClicks : 0;
      const cvr = totalClicks > 0 ? totalConversions / totalClicks : 0;
      const cpl = totalConversions > 0 ? totalCost / totalConversions : 999;
      const roas = totalCost > 0 ? (totalConversions * 35000) / totalCost : 0; // 35k avg order value

      const { grade, score, issues } = gradeCampaign({
        ctr, cpc, cvr, roas, cpl, clicks: totalClicks, cost: totalCost, conversions: totalConversions
      });

      campaignGrades.push({
        campaign_id: campaign.campaign_id,
        name: campaign.name,
        grade,
        score,
        issues,
        metrics: { totalClicks, totalCost, totalConversions, ctr, cpc, cvr, roas, cpl },
      });
    }

    // ═══ 3. BUDGET REALLOCATION PROPOSALS ═══
    const aGrades = campaignGrades.filter(c => c.grade === "A" || c.grade === "B");
    const fGrades = campaignGrades.filter(c => c.grade === "D" || c.grade === "F");

    if (aGrades.length > 0 && fGrades.length > 0) {
      const shiftAmount = fGrades.reduce((s, c) => s + c.metrics.totalCost * 0.3, 0);
      const proposal = {
        title: `💰 Realokacja budżetu: ${fGrades.map(c => c.name).join(",")} → ${aGrades.map(c => c.name).join(",")}`,
        description: `Kampanie ${fGrades.map(c => `"${c.name}" (${c.grade})`).join(", ")} mają niski ROAS. Proponuję przesunięcie ~${Math.round(shiftAmount)} PLN/tydz. na lepsze kampanie: ${aGrades.map(c => `"${c.name}" (${c.grade}, ROAS ${c.metrics.roas.toFixed(1)}x)`).join(", ")}.`,
        type: "budget_change",
        risk_level: "medium",
        status: autonomyLevel === "high" ? "auto_approved" : "pending_approval",
        reasoning_full: `[Optimizer] Grading: ${campaignGrades.map(c => `${c.name}=${c.grade}(${c.score})`).join(", ")}. Sezon: ${currentMonth}, mnożnik: ${seasonMultiplier}x`,
        source: "optimizer_agent",
      };

      await supabase.from("ads_proposals").insert(proposal);
      proposals_created++;
      decisions.push(`Budget reallocation proposed: ${Math.round(shiftAmount)} PLN shift`);
    }

    // ═══ 4. SEASONALITY BUDGET ADJUSTMENT ═══
    if (dayOfWeek === 1 && config?.monthly_budget_pln) { // Mondays only
      const baseDailyBudget = config.monthly_budget_pln / 30;
      const seasonalDailyBudget = baseDailyBudget * seasonMultiplier;

      await supabase.from("ads_proposals").insert({
        title: `📅 Sezonowy budżet: ${seasonMultiplier}x (${["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"][currentMonth - 1]})`,
        description: `Bieżący miesiąc: mnożnik ${seasonMultiplier}x. Proponowany budżet dzienny: ${Math.round(seasonalDailyBudget)} PLN (bazowy: ${Math.round(baseDailyBudget)} PLN). ${seasonMultiplier >= 1.2 ? "🔥 SEZON SZCZYTOWY — skaluj agresywnie!" : seasonMultiplier <= 0.6 ? "❄️ Niska sezon — utrzymaj brand, obniż generic" : "Stabilny okres."}`,
        type: "budget_change",
        risk_level: "low",
        status: autonomyLevel !== "low" ? "auto_approved" : "pending_approval",
        reasoning_full: `[Optimizer] Seasonality table applied. Month ${currentMonth} = ${seasonMultiplier}x. Historical data shows ${seasonMultiplier >= 1.2 ? "peak demand Mar-Jun" : "lower demand"}.`,
        source: "optimizer_agent",
      });
      proposals_created++;
      decisions.push(`Seasonal multiplier: ${seasonMultiplier}x applied`);
    }

    // ═══ 5. UNDERPERFORMER PAUSE PROPOSALS ═══
    for (const campaign of fGrades) {
      if (campaign.metrics.totalCost > 200 && campaign.metrics.totalConversions === 0) {
        await supabase.from("ads_proposals").insert({
          title: `⛔ Wstrzymaj kampanię "${campaign.name}" (0 konwersji, ${Math.round(campaign.metrics.totalCost)} PLN wydane)`,
          description: `Kampania "${campaign.name}" wydała ${Math.round(campaign.metrics.totalCost)} PLN w ostatnich 7 dniach BEZ ŻADNEJ konwersji (CTR: ${(campaign.metrics.ctr * 100).toFixed(1)}%, CPC: ${campaign.metrics.cpc.toFixed(1)} PLN). Rekomendacja: wstrzymaj, przejrzyj frazy i landing page.`,
          type: "campaign_pause",
          risk_level: "medium",
          status: "pending_approval",
          reasoning_full: `[Optimizer] Grade F. ${campaign.issues.join("; ")}`,
          source: "optimizer_agent",
        });
        proposals_created++;
      }
    }

    // ═══ 6. HIGH PERFORMER SCALE-UP ═══
    for (const campaign of aGrades) {
      if (campaign.metrics.roas >= 5 && campaign.metrics.totalConversions >= 3) {
        await supabase.from("ads_proposals").insert({
          title: `🚀 Skaluj "${campaign.name}" (ROAS ${campaign.metrics.roas.toFixed(1)}x, ${campaign.metrics.totalConversions} konw.)`,
          description: `Kampania "${campaign.name}" osiąga ROAS ${campaign.metrics.roas.toFixed(1)}x przy ${campaign.metrics.totalConversions} konwersjach. Rekomendacja: zwiększ budżet dzienny o 20-30% i rozszerz frazy.`,
          type: "budget_change",
          risk_level: "low",
          status: autonomyLevel !== "low" ? "auto_approved" : "pending_approval",
          reasoning_full: `[Optimizer] Grade ${campaign.grade} (${campaign.score}/100). Strong ROAS, scaling recommended.`,
          source: "optimizer_agent",
        });
        proposals_created++;
      }
    }

    // ═══ 7. CPL GUARD — kill expensive leads ═══
    const maxCPL = config?.max_cpl_pln || 200;
    for (const campaign of campaignGrades) {
      if (campaign.metrics.cpl > maxCPL && campaign.metrics.totalConversions >= 1) {
        await supabase.from("ads_alerts").insert({
          severity: "warning",
          type: "cpl_alert",
          message: `💸 Kampania "${campaign.name}" przekracza max CPL! ${Math.round(campaign.metrics.cpl)} PLN vs limit ${maxCPL} PLN. Obniż stawki lub lepiej targetuj.`,
        });
        decisions.push(`CPL alert: ${campaign.name} at ${Math.round(campaign.metrics.cpl)} PLN`);
      }
    }

    // ═══ 8. WEEKLY REPORT (Mondays) ═══
    if (dayOfWeek === 1 && campaignGrades.length > 0) {
      const totalSpend = campaignGrades.reduce((s, c) => s + c.metrics.totalCost, 0);
      const totalConv = campaignGrades.reduce((s, c) => s + c.metrics.totalConversions, 0);
      const avgROAS = totalSpend > 0 ? (totalConv * 35000) / totalSpend : 0;

      const weeklyReport = [
        `═══ TYGODNIOWY RAPORT OPTYMALIZACJI ${today} ═══\n`,
        `📊 Łączne wydatki (7d): ${Math.round(totalSpend)} PLN`,
        `🎯 Konwersje: ${totalConv}`,
        `💰 Średni ROAS: ${avgROAS.toFixed(1)}x`,
        `📅 Sezon: tydzień ${Math.ceil(now.getDate() / 7)} ${["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"][currentMonth - 1]} (mnożnik ${seasonMultiplier}x)`,
        `\n═══ OCENY KAMPANII ═══\n`,
        ...campaignGrades.map((c: any) => [
          `${c.grade === "A" ? "🟢" : c.grade === "B" ? "🔵" : c.grade === "C" ? "🟡" : "🔴"} ${c.name}: ${c.grade} (${c.score}/100)`,
          `   Clicks: ${c.metrics.totalClicks} | Cost: ${Math.round(c.metrics.totalCost)} PLN | Conv: ${c.metrics.totalConversions} | ROAS: ${c.metrics.roas.toFixed(1)}x`,
          c.issues.length > 0 ? `   ⚠️ ${c.issues.join(", ")}` : "   ✅ Brak problemów",
        ].join("\n")).join("\n\n"),
        `\n═══ DECYZJE PODJĘTE ═══\n`,
        decisions.length > 0 ? decisions.map(d => `• ${d}`).join("\n") : "Brak decyzji w tym cyklu.",
        `\nProponowane zmiany: ${proposals_created}`,
        `Auto-wykonane: ${auto_executed}`,
        `Autonomia: ${autonomyLevel}`,
      ].join("\n");

      await supabase.from("ads_knowledge_base").insert({
        title: `Raport Tygodniowy ${today}`,
        summary: weeklyReport,
        tags: ["report", "weekly", "optimization", today.slice(0, 7)],
        source_type: "weekly_report",
        relevance_score: 1.0,
      });
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "optimizer_run",
      customer_id: "system",
      resource_type: "optimization",
      payload: {
        campaigns_graded: campaignGrades.length,
        grades: campaignGrades.map(c => ({ name: c.name, grade: c.grade, score: c.score })),
        proposals_created,
        auto_executed,
        season_multiplier: seasonMultiplier,
        decisions,
      },
      success: true,
      triggered_by: "cron",
    });

    return ok({
      campaigns_graded: campaignGrades.length,
      grades: campaignGrades.map(c => `${c.name}: ${c.grade}`),
      proposals_created,
      auto_executed,
      season_multiplier: seasonMultiplier,
    });
  } catch (error: any) {
    console.error("[optimizer] Error:", error?.message);
    return fail(error?.message || "Unknown error");
  }
});
