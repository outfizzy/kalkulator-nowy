// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-execute — Execute approved proposals via Google Ads API
// Full write operations with guardrails
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_ADS_API_VERSION = "v23";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

// ═══ GUARDRAILS ═══
const GUARDRAILS = {
  MAX_BUDGET_INCREASE_PCT: 30,      // Max 30% increase per change
  MAX_DAILY_BUDGET_CHANGES: 3,      // Max 3 budget changes per day
  MAX_PROPOSALS_AUTO_EXECUTED_PER_DAY: 10,
  MIN_HOURS_BETWEEN_BID_CHANGES: 48,
  NEW_CAMPAIGN_REQUIRES_APPROVAL: true,
  MAX_SINGLE_BUDGET_PLN: 500,       // Never set daily budget above 500 PLN
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

// ═══ GOOGLE ADS AUTH ═══
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Brak konfiguracji OAuth");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OAuth refresh failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ═══ GOOGLE ADS MUTATE ═══
async function googleAdsMutate(
  accessToken: string,
  customerId: string,
  operations: any[],
  resource: string
): Promise<any> {
  const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID");

  const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/${resource}:mutate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": devToken!,
      "login-customer-id": mccId!.replace(/-/g, ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operations,
      partialFailure: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Ads API error (${response.status}): ${err}`);
  }

  return response.json();
}

// ═══ GOOGLE ADS QUERY (for reading current state) ═══
async function googleAdsQuery(
  accessToken: string,
  customerId: string,
  query: string
): Promise<any[]> {
  const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID");

  const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": devToken!,
      "login-customer-id": mccId!.replace(/-/g, ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data?.[0]?.results || [];
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR FUNCTIONS — one per proposal type
// ═══════════════════════════════════════════════════════════════

async function executeBudgetChange(
  accessToken: string,
  customerId: string,
  proposal: any,
  config: any
): Promise<{ success: boolean; detail: string; rollback_payload?: any }> {
  const payload = proposal.change_payload || {};
  const campaignId = payload.campaign_id || proposal.campaign_id;
  const newBudgetPLN = payload.new_daily_budget_pln;

  if (!campaignId || !newBudgetPLN) {
    return { success: false, detail: "Brak campaign_id lub new_daily_budget_pln w payload" };
  }

  // GUARDRAIL: Max single budget
  if (newBudgetPLN > GUARDRAILS.MAX_SINGLE_BUDGET_PLN) {
    return { success: false, detail: `Budżet ${newBudgetPLN} PLN przekracza max ${GUARDRAILS.MAX_SINGLE_BUDGET_PLN} PLN` };
  }

  // Read current budget for guardrail check + rollback
  const rows = await googleAdsQuery(accessToken, customerId,
    `SELECT campaign.id, campaign.name, campaign_budget.amount_micros, campaign_budget.resource_name
     FROM campaign WHERE campaign.id = ${campaignId}`
  );

  if (!rows.length) {
    return { success: false, detail: `Kampania ${campaignId} nie znaleziona` };
  }

  const currentBudgetMicros = Number(rows[0].campaignBudget?.amountMicros || 0);
  const currentBudgetPLN = currentBudgetMicros / 1_000_000;
  const budgetResourceName = rows[0].campaignBudget?.resourceName;

  // GUARDRAIL: Max increase percentage
  if (currentBudgetPLN > 0) {
    const increasePct = ((newBudgetPLN - currentBudgetPLN) / currentBudgetPLN) * 100;
    if (increasePct > GUARDRAILS.MAX_BUDGET_INCREASE_PCT) {
      return {
        success: false,
        detail: `Zmiana budżetu +${increasePct.toFixed(0)}% przekracza max ${GUARDRAILS.MAX_BUDGET_INCREASE_PCT}%. Obecny: ${currentBudgetPLN} PLN → proponowany: ${newBudgetPLN} PLN`
      };
    }
  }

  // Monthly budget guardrail
  if (config?.monthly_budget_pln && newBudgetPLN * 30 > config.monthly_budget_pln * 1.1) {
    return {
      success: false,
      detail: `Nowy budżet (${newBudgetPLN} × 30 = ${newBudgetPLN * 30} PLN/mies.) przekracza limit ${config.monthly_budget_pln} PLN`
    };
  }

  // Execute via Google Ads API
  const newBudgetMicros = Math.round(newBudgetPLN * 1_000_000);
  const result = await googleAdsMutate(accessToken, customerId, [{
    update: {
      resourceName: budgetResourceName,
      amountMicros: String(newBudgetMicros),
    },
    updateMask: "amount_micros",
  }], "campaignBudgets");

  return {
    success: true,
    detail: `Budżet zmieniony: ${currentBudgetPLN} PLN → ${newBudgetPLN} PLN (kampania ${rows[0].campaign?.name})`,
    rollback_payload: {
      type: "budget_change",
      campaign_id: campaignId,
      budget_resource_name: budgetResourceName,
      original_budget_micros: currentBudgetMicros,
      original_budget_pln: currentBudgetPLN,
    }
  };
}

async function executePauseCampaign(
  accessToken: string,
  customerId: string,
  proposal: any
): Promise<{ success: boolean; detail: string; rollback_payload?: any }> {
  const campaignId = proposal.change_payload?.campaign_id || proposal.campaign_id;
  if (!campaignId) {
    return { success: false, detail: "Brak campaign_id" };
  }

  // Read current status for rollback
  const rows = await googleAdsQuery(accessToken, customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.resource_name
     FROM campaign WHERE campaign.id = ${campaignId}`
  );

  if (!rows.length) {
    return { success: false, detail: `Kampania ${campaignId} nie znaleziona` };
  }

  const currentStatus = rows[0].campaign?.status;
  const resourceName = rows[0].campaign?.resourceName;

  const result = await googleAdsMutate(accessToken, customerId, [{
    update: {
      resourceName,
      status: "PAUSED",
    },
    updateMask: "status",
  }], "campaigns");

  return {
    success: true,
    detail: `Kampania "${rows[0].campaign?.name}" wstrzymana (była: ${currentStatus})`,
    rollback_payload: {
      type: "resume_campaign",
      campaign_id: campaignId,
      resource_name: resourceName,
      original_status: currentStatus,
    }
  };
}

async function executeResumeCampaign(
  accessToken: string,
  customerId: string,
  proposal: any
): Promise<{ success: boolean; detail: string; rollback_payload?: any }> {
  const campaignId = proposal.change_payload?.campaign_id || proposal.campaign_id;
  if (!campaignId) {
    return { success: false, detail: "Brak campaign_id" };
  }

  const rows = await googleAdsQuery(accessToken, customerId,
    `SELECT campaign.id, campaign.name, campaign.resource_name
     FROM campaign WHERE campaign.id = ${campaignId}`
  );

  if (!rows.length) {
    return { success: false, detail: `Kampania ${campaignId} nie znaleziona` };
  }

  const resourceName = rows[0].campaign?.resourceName;

  await googleAdsMutate(accessToken, customerId, [{
    update: {
      resourceName,
      status: "ENABLED",
    },
    updateMask: "status",
  }], "campaigns");

  return {
    success: true,
    detail: `Kampania "${rows[0].campaign?.name}" wznowiona`,
    rollback_payload: {
      type: "pause_campaign",
      campaign_id: campaignId,
      resource_name: resourceName,
    }
  };
}

async function executeNegativeKeyword(
  accessToken: string,
  customerId: string,
  proposal: any
): Promise<{ success: boolean; detail: string }> {
  const payload = proposal.change_payload || {};
  const campaignId = payload.campaign_id || proposal.campaign_id;
  const keyword = payload.keyword;
  const matchType = payload.match_type || "BROAD";

  if (!campaignId || !keyword) {
    return { success: false, detail: "Brak campaign_id lub keyword" };
  }

  await googleAdsMutate(accessToken, customerId, [{
    create: {
      campaignCriterion: {
        campaign: `customers/${customerId}/campaigns/${campaignId}`,
        negative: true,
        keyword: {
          text: keyword,
          matchType: matchType,
        },
      },
    },
  }], "campaignCriteria");

  return {
    success: true,
    detail: `Negative keyword "${keyword}" (${matchType}) dodane do kampanii ${campaignId}`
  };
}

async function executeBidAdjustment(
  accessToken: string,
  customerId: string,
  proposal: any,
  config: any
): Promise<{ success: boolean; detail: string; rollback_payload?: any }> {
  const payload = proposal.change_payload || {};
  const campaignId = payload.campaign_id || proposal.campaign_id;
  const newTargetCPA = payload.new_target_cpa_pln;
  const newTargetROAS = payload.new_target_roas;

  if (!campaignId) {
    return { success: false, detail: "Brak campaign_id" };
  }

  // Read current campaign
  const rows = await googleAdsQuery(accessToken, customerId,
    `SELECT campaign.id, campaign.name, campaign.resource_name, campaign.bidding_strategy_type
     FROM campaign WHERE campaign.id = ${campaignId}`
  );

  if (!rows.length) {
    return { success: false, detail: `Kampania ${campaignId} nie znaleziona` };
  }

  const resourceName = rows[0].campaign?.resourceName;
  const strategyType = rows[0].campaign?.biddingStrategyType;

  // Build update based on strategy
  const updateObj: any = { resourceName };
  const updateFields: string[] = [];

  if (newTargetCPA && (strategyType === "TARGET_CPA" || strategyType === "MAXIMIZE_CONVERSIONS")) {
    updateObj.targetCpa = {
      targetCpaMicros: String(Math.round(newTargetCPA * 1_000_000)),
    };
    updateFields.push("target_cpa.target_cpa_micros");
  } else if (newTargetROAS && (strategyType === "TARGET_ROAS" || strategyType === "MAXIMIZE_CONVERSION_VALUE")) {
    updateObj.targetRoas = {
      targetRoas: newTargetROAS,
    };
    updateFields.push("target_roas.target_roas");
  } else {
    return { success: false, detail: `Nieobsługiwana strategia: ${strategyType}` };
  }

  await googleAdsMutate(accessToken, customerId, [{
    update: updateObj,
    updateMask: updateFields.join(","),
  }], "campaigns");

  return {
    success: true,
    detail: `Bid adjustment dla "${rows[0].campaign?.name}": ${newTargetCPA ? `Target CPA → ${newTargetCPA} PLN` : `Target ROAS → ${newTargetROAS}x`}`,
    rollback_payload: {
      type: "bid_adjustment",
      campaign_id: campaignId,
      resource_name: resourceName,
      original_strategy_type: strategyType,
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load business config
    const { data: config } = await supabase
      .from("ads_business_config")
      .select("*").limit(1).single();

    // Emergency stop check
    if (config?.emergency_stop) {
      return ok({ executed: 0, skipped: true, reason: "Emergency stop AKTYWNY — żadne zmiany nie będą wdrażane" });
    }

    // Load approved proposals
    const { data: proposals } = await supabase
      .from("ads_proposals")
      .select("*")
      .in("status", ["approved", "auto_approved"])
      .order("created_at", { ascending: true })
      .limit(GUARDRAILS.MAX_PROPOSALS_AUTO_EXECUTED_PER_DAY);

    if (!proposals || proposals.length === 0) {
      return ok({ executed: 0, message: "Brak zatwierdzonych propozycji do wdrożenia" });
    }

    // Check daily execution rate limit
    const todayStr = new Date().toISOString().slice(0, 10);
    const { count: executedToday } = await supabase
      .from("ads_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("operation", "execute_proposal")
      .gte("created_at", `${todayStr}T00:00:00Z`);

    if ((executedToday || 0) >= GUARDRAILS.MAX_PROPOSALS_AUTO_EXECUTED_PER_DAY) {
      return ok({ executed: 0, skipped: true, reason: `Limit dzienny (${GUARDRAILS.MAX_PROPOSALS_AUTO_EXECUTED_PER_DAY}) osiągnięty` });
    }

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (authErr: any) {
      return fail(`OAuth error: ${authErr.message}`);
    }

    const customerId = config?.allowed_customer_ids?.[0]?.replace(/-/g, "") || "";
    if (!customerId) {
      return fail("Brak allowed_customer_ids w konfiguracji");
    }

    let executed = 0;
    let failed = 0;
    const results: { id: string; title: string; status: string; detail?: string; error?: string }[] = [];

    for (const proposal of proposals) {
      try {
        // === GUARDRAIL: Risk assessment ===
        if (proposal.risk_level === "high" && proposal.status !== "approved") {
          results.push({ id: proposal.id, title: proposal.title, status: "skipped", error: "High risk wymaga ręcznego zatwierdzenia" });
          continue;
        }

        // === GUARDRAIL: Budget change daily limits ===
        if (proposal.type === "budget_change") {
          const { count: budgetChangesToday } = await supabase
            .from("ads_audit_log")
            .select("*", { count: "exact", head: true })
            .eq("operation", "execute_proposal")
            .contains("payload", { type: "budget_change" })
            .gte("created_at", `${todayStr}T00:00:00Z`);

          if ((budgetChangesToday || 0) >= GUARDRAILS.MAX_DAILY_BUDGET_CHANGES) {
            results.push({ id: proposal.id, title: proposal.title, status: "skipped", error: "Max zmiany budżetu dziennie" });
            continue;
          }
        }

        // === GUARDRAIL: Bid change cooldown ===
        if (proposal.type === "bid_adjustment") {
          const since = new Date(Date.now() - GUARDRAILS.MIN_HOURS_BETWEEN_BID_CHANGES * 3600000).toISOString();
          const { count: recentBidChanges } = await supabase
            .from("ads_audit_log")
            .select("*", { count: "exact", head: true })
            .eq("operation", "execute_proposal")
            .contains("payload", { type: "bid_adjustment" })
            .gte("created_at", since);

          if ((recentBidChanges || 0) > 0) {
            results.push({ id: proposal.id, title: proposal.title, status: "skipped", error: `Cooldown ${GUARDRAILS.MIN_HOURS_BETWEEN_BID_CHANGES}h` });
            continue;
          }
        }

        // === EXECUTE via Google Ads API ===
        let execResult: { success: boolean; detail: string; rollback_payload?: any };

        switch (proposal.type) {
          case "budget_change":
            execResult = await executeBudgetChange(accessToken, customerId, proposal, config);
            break;
          case "pause_campaign":
            execResult = await executePauseCampaign(accessToken, customerId, proposal);
            break;
          case "resume_campaign":
            execResult = await executeResumeCampaign(accessToken, customerId, proposal);
            break;
          case "negative_keyword":
            execResult = await executeNegativeKeyword(accessToken, customerId, proposal);
            break;
          case "bid_adjustment":
            execResult = await executeBidAdjustment(accessToken, customerId, proposal, config);
            break;
          default:
            execResult = { success: false, detail: `Nieobsługiwany typ: ${proposal.type}. Wymaga ręcznej implementacji.` };
        }

        if (!execResult.success) {
          results.push({ id: proposal.id, title: proposal.title, status: "failed", error: execResult.detail });
          await supabase.from("ads_proposals").update({ status: "failed" }).eq("id", proposal.id);
          failed++;
          continue;
        }

        // Mark as executed
        await supabase.from("ads_proposals").update({
          status: "executed",
          executed_at: new Date().toISOString(),
          rollback_payload: execResult.rollback_payload || null,
        }).eq("id", proposal.id);

        // Audit log
        await supabase.from("ads_audit_log").insert({
          operation: "execute_proposal",
          customer_id: customerId,
          resource_type: proposal.type,
          resource_id: proposal.id,
          payload: {
            type: proposal.type,
            detail: execResult.detail,
            change_payload: proposal.change_payload,
            rollback_payload: execResult.rollback_payload,
          },
          success: true,
          triggered_by: proposal.status === "auto_approved" ? "ai_auto" : "ai_approved",
        });

        executed++;
        results.push({ id: proposal.id, title: proposal.title, status: "executed", detail: execResult.detail });

      } catch (propError: any) {
        failed++;
        results.push({ id: proposal.id, title: proposal.title, status: "failed", error: propError?.message });

        await supabase.from("ads_proposals").update({ status: "failed" }).eq("id", proposal.id);
        await supabase.from("ads_audit_log").insert({
          operation: "execute_proposal",
          customer_id: customerId,
          resource_type: proposal.type,
          resource_id: proposal.id,
          payload: { error: propError?.message },
          success: false,
          triggered_by: "ai_approved",
        });
      }
    }

    console.log(`[ads-execute] Done: ${executed} executed, ${failed} failed`);
    return ok({ executed, failed, results });
  } catch (error: any) {
    console.error("[ads-execute] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd executora");
  }
});
