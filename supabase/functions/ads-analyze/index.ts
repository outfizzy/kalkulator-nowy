// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-analyze — AI Analysis Agent (runs every 6 hours via cron)
// Detects anomalies, generates alerts and proposal drafts
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

    // Load business config
    const { data: config } = await supabase
      .from("ads_business_config")
      .select("*").limit(1).single();

    if (config?.emergency_stop) {
      return ok({ skipped: true, reason: "Emergency stop aktywny" });
    }

    // Load metrics (last 14 days)
    const { data: metrics } = await supabase
      .from("ads_daily_metrics")
      .select("*, ads_campaigns!inner(name, type, status)")
      .order("date", { ascending: false })
      .limit(200);

    // Load campaigns
    const { data: campaigns } = await supabase
      .from("ads_campaigns")
      .select("*").order("name");

    // Load Polish leads (last 30 days)
    const { data: plLeads } = await supabase
      .from("leads")
      .select("id, status, customer_data, created_at")
      .eq("source", "website_pl")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false });

    // === ANOMALY DETECTION (rule-based, before AI) ===
    const alerts: { severity: string; type: string; message: string; campaign_id?: string }[] = [];
    
    if (metrics && metrics.length >= 7) {
      // Group by campaign
      const byCampaign: Record<string, any[]> = {};
      for (const m of metrics) {
        const name = (m as any).ads_campaigns?.name || "?";
        if (!byCampaign[name]) byCampaign[name] = [];
        byCampaign[name].push(m);
      }

      for (const [campaignName, rows] of Object.entries(byCampaign)) {
        if (rows.length < 3) continue;
        const recent3 = rows.slice(0, 3);
        const older4 = rows.slice(3, 7);

        if (older4.length === 0) continue;

        const avgCostRecent = recent3.reduce((s: number, m: any) => s + Number(m.cost_pln || 0), 0) / 3;
        const avgCostOlder = older4.reduce((s: number, m: any) => s + Number(m.cost_pln || 0), 0) / older4.length;

        // CPC spike detection
        const avgCPC_recent = recent3.reduce((s: number, m: any) => s + Number(m.avg_cpc || 0), 0) / 3;
        const avgCPC_older = older4.reduce((s: number, m: any) => s + Number(m.avg_cpc || 0), 0) / older4.length;
        
        if (avgCPC_older > 0 && avgCPC_recent > avgCPC_older * 1.5) {
          alerts.push({
            severity: "warning",
            type: "cpc_spike",
            message: `Wzrost CPC w "${campaignName}" (+${(((avgCPC_recent / avgCPC_older) - 1) * 100).toFixed(0)}% vs średnia 4d)`
          });
        }

        // Budget overspend
        if (avgCostOlder > 0 && avgCostRecent > avgCostOlder * 1.8) {
          alerts.push({
            severity: "warning",
            type: "overspend",
            message: `Kampania "${campaignName}" wydaje ${(((avgCostRecent / avgCostOlder) - 1) * 100).toFixed(0)}% więcej niż zwykle`
          });
        }

        // Zero conversions in 3 days
        const totalConvRecent = recent3.reduce((s: number, m: any) => s + Number(m.conversions || 0), 0);
        if (avgCostRecent > 50 && totalConvRecent === 0) {
          alerts.push({
            severity: "critical",
            type: "zero_conversions",
            message: `"${campaignName}" — 0 konwersji przez 3 dni przy wydatkach ${avgCostRecent.toFixed(0)} PLN/dzień`
          });
        }
      }
    }

    // Monthly budget check
    if (config && metrics) {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlySpend = metrics
        .filter((m: any) => m.date?.startsWith(thisMonth))
        .reduce((s: number, m: any) => s + Number(m.cost_pln || 0), 0);
      
      if (monthlySpend > config.monthly_budget_pln * 0.9) {
        alerts.push({
          severity: "critical",
          type: "budget_warning",
          message: `Wydatki w tym miesiącu (${monthlySpend.toFixed(0)} PLN) zbliżają się do limitu ${config.monthly_budget_pln} PLN (${((monthlySpend / config.monthly_budget_pln) * 100).toFixed(0)}%)`
        });
      }
    }

    // Real CPL check
    if (plLeads && config && metrics) {
      const cost30d = metrics
        .filter((m: any) => {
          const d = new Date(m.date);
          return (Date.now() - d.getTime()) <= 30 * 86400000;
        })
        .reduce((s: number, m: any) => s + Number(m.cost_pln || 0), 0);
      
      const realCPL = plLeads.length > 0 ? cost30d / plLeads.length : 0;
      if (realCPL > 0 && realCPL > config.max_cpl_pln) {
        alerts.push({
          severity: "warning",
          type: "high_cpl",
          message: `Realny CPL (${realCPL.toFixed(0)} PLN) przekracza target (${config.max_cpl_pln} PLN) — ${plLeads.length} leadów za ${cost30d.toFixed(0)} PLN w 30 dni`
        });
      }
    }

    // Save alerts
    if (alerts.length > 0) {
      await supabase.from("ads_alerts").insert(alerts);
    }

    // === AI ANALYSIS (Claude) ===
    let aiInsight = "";
    let proposalsCreated = 0;

    try {
      const analysisPrompt = `Przeanalizuj dane kampanii Google Ads dla zadaszto.pl i zaproponuj konkretne optymalizacje.

DANE:
- Kampanie: ${JSON.stringify(campaigns?.map((c: any) => ({ name: c.name, status: c.status, budget: c.daily_budget_pln, strategy: c.bidding_strategy })))}
- Metryki (14 dni): ${JSON.stringify(metrics?.slice(0, 30).map((m: any) => ({ date: m.date, clicks: m.clicks, cost: Number(m.cost_pln).toFixed(0), conv: m.conversions, ctr: m.ctr })))}
- Leady PL (30d): ${plLeads?.length || 0}
- Budżet miesięczny: ${config?.monthly_budget_pln || "?"} PLN
- Max CPL: ${config?.max_cpl_pln || "?"} PLN
- Target ROAS: ${config?.target_roas || "?"}x
- Alerty: ${JSON.stringify(alerts)}

Odpowiedz w JSON:
{
  "insight": "Główne wnioski z analizy (2-3 zdania)",
  "proposals": [
    {
      "type": "budget_change|bid_adjustment|negative_keyword|pause_campaign|new_ad_copy",
      "title": "Tytuł propozycji",
      "description": "Opis co zmienić",
      "reasoning": "Dlaczego - uzasadnienie danymi",
      "risk_level": "low|medium|high",
      "expected_impact": {"metric": "cpl|roas|ctr", "delta_pct": 15, "confidence": "high|medium|low"}
    }
  ]
}

Daj max 3 propozycje, tylko jeśli dane je uzasadniają. Jeśli nie ma danych — zwróć pustą listę.`;

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
          messages: [{ role: "user", content: analysisPrompt }],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.content?.[0]?.text || "";
        
        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiInsight = parsed.insight || "";
          
          if (parsed.proposals?.length > 0) {
            for (const p of parsed.proposals) {
              await supabase.from("ads_proposals").insert({
                type: p.type || "analysis",
                title: p.title,
                description: p.description,
                reasoning_full: p.reasoning,
                risk_level: p.risk_level || "medium",
                expected_impact: p.expected_impact,
                change_payload: {},
                status: "pending_approval",
              });
              proposalsCreated++;
            }
          }
        }
      }
    } catch (aiErr: any) {
      console.warn("[ads-analyze] AI analysis failed:", aiErr?.message);
    }

    // === A/B EXPERIMENT WINNER DETECTION ===
    let experimentsClosed = 0;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: runningExperiments } = await supabase
        .from("ads_experiments")
        .select("*")
        .eq("status", "running")
        .lte("end_date", today);

      if (runningExperiments && runningExperiments.length > 0) {
        for (const exp of runningExperiments) {
          const campId = exp.campaign_id;
          if (!campId || !exp.start_date || !exp.end_date) continue;

          // Get metrics for the experiment period
          const { data: expMetrics } = await supabase
            .from("ads_daily_metrics")
            .select("date, clicks, cost_pln, conversions, conv_value_pln")
            .eq("campaign_id", campId)
            .gte("date", exp.start_date)
            .lte("date", exp.end_date);

          if (!expMetrics || expMetrics.length < 3) continue;

          // Split experiment period in half (A = first half, B = second half)  
          const mid = Math.floor(expMetrics.length / 2);
          const periodA = expMetrics.slice(0, mid);
          const periodB = expMetrics.slice(mid);

          const sumArr = (arr: any[], key: string) => arr.reduce((s, m) => s + Number(m[key] || 0), 0);
          const cpaA = sumArr(periodA, "conversions") > 0 ? sumArr(periodA, "cost_pln") / sumArr(periodA, "conversions") : 999;
          const cpaB = sumArr(periodB, "conversions") > 0 ? sumArr(periodB, "cost_pln") / sumArr(periodB, "conversions") : 999;

          const improvement = cpaA > 0 ? ((cpaA - cpaB) / cpaA) * 100 : 0;
          const confidence = Math.min(95, 50 + Math.abs(improvement) * 3);

          const winner = improvement > 5 ? "variant_b" : improvement < -5 ? "variant_a" : "no_winner";

          await supabase.from("ads_experiments").update({
            status: "completed",
            winner,
            confidence_pct: confidence,
            learnings: `CPA A: ${cpaA.toFixed(0)} PLN, CPA B: ${cpaB.toFixed(0)} PLN. ${
              winner === "variant_b" ? `Wariant B lepszy o ${improvement.toFixed(0)}%` :
              winner === "variant_a" ? `Wariant A lepszy o ${Math.abs(improvement).toFixed(0)}%` :
              "Brak istotnej różnicy"
            }. Confidence: ${confidence.toFixed(0)}%`,
          }).eq("id", exp.id);

          experimentsClosed++;
        }
      }
    } catch (expErr: any) {
      console.warn("[ads-analyze] Experiment analysis failed:", expErr?.message);
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "analyze",
      customer_id: config?.allowed_customer_ids?.[0] || "?",
      resource_type: "ai_analysis",
      payload: { alerts_created: alerts.length, proposals_created: proposalsCreated, insight: aiInsight },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-analyze] Done: ${alerts.length} alerts, ${proposalsCreated} proposals`);

    return ok({
      alerts_created: alerts.length,
      proposals_created: proposalsCreated,
      insight: aiInsight,
    });
  } catch (error: any) {
    console.error("[ads-analyze] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd analizy");
  }
});
