// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-daily-briefing — Morning report sent to chat + email
// Runs daily at 7:30 via cron
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
      .from("ads_business_config").select("*").limit(1).single();

    // Yesterday's and day-before metrics
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const { data: metricsYesterday } = await supabase
      .from("ads_daily_metrics")
      .select("*, ads_campaigns!inner(name)")
      .eq("date", yesterday);

    const { data: metricsDayBefore } = await supabase
      .from("ads_daily_metrics")
      .select("*, ads_campaigns!inner(name)")
      .eq("date", dayBefore);

    // 7d average
    const { data: metrics7d } = await supabase
      .from("ads_daily_metrics")
      .select("cost_pln, clicks, conversions, conv_value_pln")
      .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

    // Polish leads
    const { data: plLeadsYesterday } = await supabase
      .from("leads")
      .select("id, customer_data, status")
      .eq("source", "website_pl")
      .gte("created_at", `${yesterday}T00:00:00Z`)
      .lt("created_at", `${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

    const { data: plLeads7d } = await supabase
      .from("leads")
      .select("id")
      .eq("source", "website_pl")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

    // Aggregate
    const ySum = (arr: any[], key: string) => (arr || []).reduce((s, m) => s + Number(m[key] || 0), 0);
    const yCost = ySum(metricsYesterday, "cost_pln");
    const yClicks = ySum(metricsYesterday, "clicks");
    const yConv = ySum(metricsYesterday, "conversions");
    const yConvVal = ySum(metricsYesterday, "conv_value_pln");
    const dbCost = ySum(metricsDayBefore, "cost_pln");
    const dbClicks = ySum(metricsDayBefore, "clicks");

    const avg7dCost = ySum(metrics7d, "cost_pln") / 7;
    const avg7dConv = ySum(metrics7d, "conversions") / 7;
    const plYesterday = plLeadsYesterday?.length || 0;
    const plTotal7d = plLeads7d?.length || 0;

    // Pending proposals
    const { count: pendingCount } = await supabase
      .from("ads_proposals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval");

    // Active alerts
    const { count: alertCount } = await supabase
      .from("ads_alerts")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null);

    // Generate briefing with Claude
    const prompt = `Wygeneruj zwięzły raport poranny (max 500 słów) dla AI Ads Managera zadaszto.pl.

DANE WCZORAJ (${yesterday}):
- Wydatki: ${yCost.toFixed(0)} PLN (przedwczoraj: ${dbCost.toFixed(0)} PLN, średnia 7d: ${avg7dCost.toFixed(0)} PLN)
- Kliknięcia: ${yClicks} (przedwczoraj: ${dbClicks})
- Konwersje Google: ${yConv.toFixed(0)} (średnia 7d: ${avg7dConv.toFixed(1)})
- Wartość konwersji: ${yConvVal.toFixed(0)} PLN
- ROAS: ${yCost > 0 ? (yConvVal / yCost).toFixed(1) : 0}x
- Leady z zadaszto.pl: ${plYesterday} (7d: ${plTotal7d})
- Realny CPL: ${plYesterday > 0 ? (yCost / plYesterday).toFixed(0) : "brak leadów"} PLN

${(metricsYesterday || []).map((m: any) => `  Kampania "${(m as any).ads_campaigns?.name}": ${Number(m.cost_pln).toFixed(0)} PLN, ${m.clicks} klik., ${m.conversions} konw.`).join("\n")}

KONTEKST:
- Budżet: ${config?.monthly_budget_pln || "?"} PLN/mies.
- Target CPL: ${config?.max_cpl_pln || "?"} PLN
- Target ROAS: ${config?.target_roas || "?"}x
- Oczekujące propozycje: ${pendingCount || 0}
- Aktywne alerty: ${alertCount || 0}

FORMAT:
📊 **Raport poranny — ${yesterday}**
1. Podsumowanie wydatków (vs przedwczoraj, vs średnia 7d)
2. Leady (ile, skąd, CPL realny)
3. Najważniejsze obserwacje
4. Rekomendacja na dziś (1 zdanie)

Bądź konkretny, podawaj liczby i procenty.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    let briefingText = `📊 Raport: ${yesterday}\nWydatki: ${yCost.toFixed(0)} PLN | Kliknięcia: ${yClicks} | Konwersje: ${yConv.toFixed(0)} | Leady PL: ${plYesterday}`;
    
    if (response.ok) {
      const result = await response.json();
      briefingText = result.content?.[0]?.text || briefingText;
    }

    // Save briefing as a system chat message
    await supabase.from("ads_chat_messages").insert({
      session_id: "00000000-0000-0000-0000-000000000000", // system session
      role: "system",
      content: briefingText,
    });

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "daily_briefing",
      customer_id: config?.allowed_customer_ids?.[0] || "?",
      resource_type: "report",
      payload: {
        date: yesterday,
        cost: yCost,
        clicks: yClicks,
        conversions: yConv,
        pl_leads: plYesterday,
      },
      success: true,
      triggered_by: "cron",
    });

    return ok({ date: yesterday, briefing_length: briefingText.length });
  } catch (error: any) {
    console.error("[ads-daily-briefing] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
