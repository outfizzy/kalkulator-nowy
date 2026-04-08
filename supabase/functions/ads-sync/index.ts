// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-sync — Google Ads → Supabase data synchronization
// Pattern: 200-OK Payload (always returns 200, error in body)
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_ADS_API_VERSION = "v23";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, details?: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, details: details || null }),
    {
      status: 200, // 200-OK Payload — error is in the body, NOT the HTTP status
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Brak konfiguracji OAuth. Ustaw secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN"
    );
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
    throw new Error(`OAuth token refresh failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function googleAdsQuery(
  accessToken: string,
  customerId: string,
  query: string
): Promise<any[]> {
  const devToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
  const mccId = Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID");

  if (!devToken || !mccId) {
    throw new Error(
      "Brak konfiguracji Google Ads. Ustaw secrets: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_MCC_CUSTOMER_ID"
    );
  }

  const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": devToken,
      "login-customer-id": mccId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Ads API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const results: any[] = [];
  if (Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        results.push(...batch.results);
      }
    }
  }
  return results;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── Auth: simplified ───
    // Accept: service_role key, authenticated user (via anon key + JWT), or CRON_SECRET
    const authHeader = req.headers.get("authorization") || "";
    const url = new URL(req.url);
    const cronKey = url.searchParams.get("key");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if this is a cron call
    const isCron = cronSecret && cronKey === cronSecret;

    // Check if the Authorization header contains the service role key
    const isServiceRole = authHeader.includes(serviceKey);

    // If not cron and not service role, verify the user is authenticated
    if (!isCron && !isServiceRole) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const tempClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const {
          data: { user },
        } = await tempClient.auth.getUser();
        if (!user) {
          return fail("Unauthorized — zaloguj się aby synchronizować dane");
        }
      } catch (authErr: any) {
        console.error("[ads-sync] Auth verification failed:", authErr?.message);
        return fail("Unauthorized — błąd weryfikacji tożsamości");
      }
    }

    // ─── Initialize Supabase service client for DB writes ───
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Get customer ID ───
    let customerId: string | null = null;
    try {
      const { data: config } = await supabase
        .from("ads_business_config")
        .select("allowed_customer_ids")
        .limit(1)
        .single();
      customerId = config?.allowed_customer_ids?.[0] || null;
    } catch (_e) {
      console.warn("[ads-sync] Could not read ads_business_config, falling back to env");
    }

    if (!customerId) {
      customerId = Deno.env.get("GOOGLE_ADS_CLIENT_CUSTOMER_ID") || null;
    }

    if (!customerId) {
      return fail(
        "Brak Customer ID — skonfiguruj ads_business_config.allowed_customer_ids lub ustaw GOOGLE_ADS_CLIENT_CUSTOMER_ID"
      );
    }

    console.log(`[ads-sync] Starting sync for customer ${customerId}`);

    // ─── Step 1: OAuth access token ───
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
      console.log("[ads-sync] OAuth token obtained");
    } catch (oauthErr: any) {
      console.error("[ads-sync] OAuth failed:", oauthErr.message);
      await logAudit(supabase, customerId, false, oauthErr.message, isCron ? "cron" : "manual");
      return fail("OAuth token refresh failed", oauthErr.message);
    }

    // ─── Step 2: Get/create account record ───
    const { data: account } = await supabase
      .from("ads_accounts")
      .select("id")
      .eq("customer_id", customerId)
      .single();

    let accountId = account?.id;
    if (!accountId) {
      const { data: newAccount } = await supabase
        .from("ads_accounts")
        .insert({
          customer_id: customerId,
          mcc_id: Deno.env.get("GOOGLE_ADS_MCC_CUSTOMER_ID"),
          account_name: "zadaszto.pl",
        })
        .select("id")
        .single();
      accountId = newAccount?.id;
    }

    if (!accountId) {
      return fail("Nie udało się utworzyć rekordu konta w bazie danych");
    }

    // ─── Step 3: Sync campaigns ───
    console.log("[ads-sync] Fetching campaigns...");
    let campaignResults: any[] = [];
    try {
      campaignResults = await googleAdsQuery(
        accessToken,
        customerId,
        `SELECT 
          campaign.id, 
          campaign.name, 
          campaign.status, 
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign.campaign_budget
        FROM campaign 
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name`
      );
    } catch (campErr: any) {
      console.error("[ads-sync] Campaign fetch failed:", campErr.message);
      await logAudit(supabase, customerId, false, campErr.message, isCron ? "cron" : "manual");
      return fail("Google Ads API — nie udało się pobrać kampanii", campErr.message);
    }

    console.log(`[ads-sync] Found ${campaignResults.length} campaigns`);

    const campaignMap: Record<string, string> = {};

    for (const row of campaignResults) {
      const c = row.campaign;
      const googleId = c.id?.toString() || c.resourceName?.split("/").pop();

      // Get budget amount
      let dailyBudget = 0;
      if (c.campaignBudget) {
        try {
          const budgetQuery = await googleAdsQuery(
            accessToken,
            customerId,
            `SELECT campaign_budget.amount_micros FROM campaign_budget WHERE campaign_budget.resource_name = '${c.campaignBudget}'`
          );
          if (budgetQuery[0]?.campaignBudget?.amountMicros) {
            dailyBudget = Number(budgetQuery[0].campaignBudget.amountMicros) / 1_000_000;
          }
        } catch (_e) {
          console.warn("[ads-sync] Could not fetch budget for campaign", googleId);
        }
      }

      const { data: upserted } = await supabase
        .from("ads_campaigns")
        .upsert(
          {
            account_id: accountId,
            google_campaign_id: googleId,
            name: c.name || "Unnamed",
            type: c.advertisingChannelType || null,
            status: c.status || "UNKNOWN",
            daily_budget_pln: dailyBudget || null,
            bidding_strategy: c.biddingStrategyType || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id,google_campaign_id" }
        )
        .select("id")
        .single();

      if (upserted?.id) {
        campaignMap[googleId] = upserted.id;
      }
    }

    // ─── Step 4: Sync ad groups (non-critical, catch errors) ───
    let adGroupCount = 0;
    try {
      console.log("[ads-sync] Fetching ad groups...");
      const adGroupResults = await googleAdsQuery(
        accessToken,
        customerId,
        `SELECT 
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.cpc_bid_micros,
          campaign.id
        FROM ad_group
        WHERE ad_group.status != 'REMOVED'`
      );

      adGroupCount = adGroupResults.length;
      console.log(`[ads-sync] Found ${adGroupCount} ad groups`);

      for (const row of adGroupResults) {
        const ag = row.adGroup;
        const campaignGoogleId =
          row.campaign?.id?.toString() || row.campaign?.resourceName?.split("/").pop();
        const campaignId = campaignMap[campaignGoogleId];
        if (!campaignId) continue;

        await supabase.from("ads_ad_groups").upsert(
          {
            campaign_id: campaignId,
            google_ad_group_id: ag.id?.toString() || ag.resourceName?.split("/").pop(),
            name: ag.name || "Unnamed",
            status: ag.status || "UNKNOWN",
            default_cpc: ag.cpcBidMicros ? Number(ag.cpcBidMicros) / 1_000_000 : null,
          },
          { onConflict: "campaign_id,google_ad_group_id" }
        );
      }
    } catch (e: any) {
      console.warn("[ads-sync] Ad groups fetch failed (may be unsupported for PMAX):", e?.message);
    }

    // ─── Step 5: Sync daily metrics (last 30 days) ───
    let metricsCount = 0;
    try {
      console.log("[ads-sync] Fetching daily metrics...");
      const metricsResults = await googleAdsQuery(
        accessToken,
        customerId,
        `SELECT 
          campaign.id,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.search_impression_share
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY segments.date DESC`
      );

      metricsCount = metricsResults.length;
      console.log(`[ads-sync] Found ${metricsCount} metric rows`);

      for (const row of metricsResults) {
        const campaignGoogleId =
          row.campaign?.id?.toString() || row.campaign?.resourceName?.split("/").pop();
        const campaignId = campaignMap[campaignGoogleId];
        if (!campaignId) continue;

        const m = row.metrics;
        const costPln = m.costMicros ? Number(m.costMicros) / 1_000_000 : 0;
        const conversions = Number(m.conversions || 0);
        const convValue = Number(m.conversionsValue || 0);

        await supabase.from("ads_daily_metrics").upsert(
          {
            campaign_id: campaignId,
            date: row.segments.date,
            impressions: Number(m.impressions || 0),
            clicks: Number(m.clicks || 0),
            cost_pln: costPln,
            conversions: conversions,
            conv_value_pln: convValue,
            ctr: Number(m.ctr || 0),
            avg_cpc: m.averageCpc ? Number(m.averageCpc) / 1_000_000 : 0,
            roas: costPln > 0 ? convValue / costPln : 0,
            search_impression_share: m.searchImpressionShare
              ? Number(m.searchImpressionShare)
              : null,
          },
          { onConflict: "campaign_id,date" }
        );
      }
    } catch (metricsErr: any) {
      console.warn("[ads-sync] Metrics fetch failed:", metricsErr?.message);
      // Non-critical — campaigns were already synced
    }

    // ─── Step 6: Update last_sync_at ───
    await supabase
      .from("ads_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", accountId);

    // ─── Step 7: Audit log ───
    await logAudit(supabase, customerId, true, null, isCron ? "cron" : "manual", {
      campaigns: campaignResults.length,
      ad_groups: adGroupCount,
      metrics: metricsCount,
    });

    console.log("[ads-sync] Sync completed successfully");

    return ok({
      campaigns: campaignResults.length,
      ad_groups: adGroupCount,
      metrics: metricsCount,
      customer_id: customerId,
      synced_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[ads-sync] Unhandled error:", error?.message || error);

    // Try to log the error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await logAudit(
        supabase,
        Deno.env.get("GOOGLE_ADS_CLIENT_CUSTOMER_ID") || "unknown",
        false,
        error?.message,
        "manual"
      );
    } catch (_) {}

    // 200-OK Payload — NEVER return 500
    return fail(error?.message || "Nieznany błąd synchronizacji");
  }
});

// ─── Helper: Audit log ───
async function logAudit(
  supabase: any,
  customerId: string,
  success: boolean,
  errorMessage: string | null,
  triggeredBy: string,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from("ads_audit_log").insert({
      operation: "sync",
      customer_id: customerId,
      resource_type: "full_sync",
      payload: payload || null,
      success,
      error_message: errorMessage,
      triggered_by: triggeredBy,
    });
  } catch (_e) {
    console.warn("[ads-sync] Failed to write audit log");
  }
}
