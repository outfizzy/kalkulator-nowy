// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-measure-impact — 7-day impact measurement for executed proposals
// Compares metrics BEFORE vs AFTER proposal execution
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find proposals executed > 7 days ago that haven't been measured yet
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: proposals } = await supabase
      .from("ads_proposals")
      .select("*, ads_campaigns:campaign_id(id, name, google_campaign_id)")
      .eq("status", "executed")
      .is("impact_measured_at", null)
      .lt("executed_at", sevenDaysAgo)
      .limit(10);

    if (!proposals || proposals.length === 0) {
      return ok({ measured: 0, message: "Brak propozycji do pomiaru" });
    }

    let measured = 0;
    const results: { id: string; title: string; verdict: string; delta: Record<string, number> }[] = [];

    for (const proposal of proposals) {
      try {
        const executedAt = new Date(proposal.executed_at);
        const campaignId = proposal.campaign_id;

        if (!campaignId) {
          // No campaign linked — skip
          await supabase.from("ads_proposals").update({
            impact_measured_at: new Date().toISOString(),
            impact_verdict: "unmeasurable",
            result_after_7d: { reason: "Brak powiązanej kampanii" },
          }).eq("id", proposal.id);
          continue;
        }

        // 7 days BEFORE execution
        const beforeStart = new Date(executedAt.getTime() - 7 * 86400000).toISOString().slice(0, 10);
        const beforeEnd = new Date(executedAt.getTime() - 86400000).toISOString().slice(0, 10);

        // 7 days AFTER execution
        const afterStart = new Date(executedAt.getTime() + 86400000).toISOString().slice(0, 10);
        const afterEnd = new Date(executedAt.getTime() + 8 * 86400000).toISOString().slice(0, 10);

        const { data: beforeMetrics } = await supabase
          .from("ads_daily_metrics")
          .select("cost_pln, clicks, conversions, conv_value_pln, impressions")
          .eq("campaign_id", campaignId)
          .gte("date", beforeStart)
          .lte("date", beforeEnd);

        const { data: afterMetrics } = await supabase
          .from("ads_daily_metrics")
          .select("cost_pln, clicks, conversions, conv_value_pln, impressions")
          .eq("campaign_id", campaignId)
          .gte("date", afterStart)
          .lte("date", afterEnd);

        if (!beforeMetrics?.length || !afterMetrics?.length) {
          await supabase.from("ads_proposals").update({
            impact_measured_at: new Date().toISOString(),
            impact_verdict: "insufficient_data",
            result_after_7d: { reason: "Za mało danych do porównania", before_days: beforeMetrics?.length || 0, after_days: afterMetrics?.length || 0 },
          }).eq("id", proposal.id);
          continue;
        }

        // Calculate averages
        const avg = (arr: any[], key: string) => arr.reduce((s, m) => s + Number(m[key] || 0), 0) / arr.length;

        const beforeAvg = {
          cost: avg(beforeMetrics, "cost_pln"),
          clicks: avg(beforeMetrics, "clicks"),
          conversions: avg(beforeMetrics, "conversions"),
          conv_value: avg(beforeMetrics, "conv_value_pln"),
          impressions: avg(beforeMetrics, "impressions"),
        };

        const afterAvg = {
          cost: avg(afterMetrics, "cost_pln"),
          clicks: avg(afterMetrics, "clicks"),
          conversions: avg(afterMetrics, "conversions"),
          conv_value: avg(afterMetrics, "conv_value_pln"),
          impressions: avg(afterMetrics, "impressions"),
        };

        // Calculate deltas (%)
        const delta = (before: number, after: number) => before > 0 ? ((after - before) / before) * 100 : 0;

        const deltas = {
          cost_pct: delta(beforeAvg.cost, afterAvg.cost),
          clicks_pct: delta(beforeAvg.clicks, afterAvg.clicks),
          conversions_pct: delta(beforeAvg.conversions, afterAvg.conversions),
          conv_value_pct: delta(beforeAvg.conv_value, afterAvg.conv_value),
          impressions_pct: delta(beforeAvg.impressions, afterAvg.impressions),
        };

        // CPA delta (lower is better)
        const beforeCPA = beforeAvg.conversions > 0 ? beforeAvg.cost / beforeAvg.conversions : 0;
        const afterCPA = afterAvg.conversions > 0 ? afterAvg.cost / afterAvg.conversions : 0;
        const cpaDelta = beforeCPA > 0 ? ((afterCPA - beforeCPA) / beforeCPA) * 100 : 0;

        // ROAS delta (higher is better)
        const beforeROAS = beforeAvg.cost > 0 ? beforeAvg.conv_value / beforeAvg.cost : 0;
        const afterROAS = afterAvg.cost > 0 ? afterAvg.conv_value / afterAvg.cost : 0;

        // Determine verdict
        let verdict = "neutral";
        const convImprovement = deltas.conversions_pct;
        const costChange = deltas.cost_pct;

        if (convImprovement > 10 && cpaDelta < 5) {
          verdict = "positive";
        } else if (convImprovement > 5 || (costChange < -5 && convImprovement >= -2)) {
          verdict = "positive";
        } else if (convImprovement < -15 || cpaDelta > 30) {
          verdict = "negative";
        } else if (costChange > 20 && convImprovement < 5) {
          verdict = "negative";
        }

        const resultData = {
          before: beforeAvg,
          after: afterAvg,
          deltas,
          cpa: { before: beforeCPA, after: afterCPA, delta_pct: cpaDelta },
          roas: { before: beforeROAS, after: afterROAS },
          verdict,
          days_measured: { before: beforeMetrics.length, after: afterMetrics.length },
        };

        await supabase.from("ads_proposals").update({
          impact_measured_at: new Date().toISOString(),
          impact_verdict: verdict,
          result_after_7d: resultData,
        }).eq("id", proposal.id);

        measured++;
        results.push({
          id: proposal.id,
          title: proposal.title,
          verdict,
          delta: {
            conversions: Math.round(deltas.conversions_pct),
            cost: Math.round(deltas.cost_pct),
            cpa: Math.round(cpaDelta),
          },
        });

        // Create alert if negative
        if (verdict === "negative") {
          await supabase.from("ads_alerts").insert({
            severity: "warning",
            type: "negative_impact",
            message: `Propozycja "${proposal.title}" miała negatywny wpływ: konwersje ${deltas.conversions_pct.toFixed(0)}%, CPA ${cpaDelta > 0 ? "+" : ""}${cpaDelta.toFixed(0)}%. Rozważ rollback.`,
            campaign_id: campaignId,
          });
        }
      } catch (propErr: any) {
        console.warn(`[ads-measure-impact] Error measuring proposal ${proposal.id}:`, propErr?.message);
      }
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "measure_impact",
      customer_id: "system",
      resource_type: "impact",
      payload: { measured, results },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-measure-impact] Done: ${measured} proposals measured`);

    return ok({ measured, results });
  } catch (error: any) {
    console.error("[ads-measure-impact] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
