// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-ga4-sync — Google Analytics 4 Data API → Supabase
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GA4_PROPERTY_ID = "341691255";

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, details?: string) {
  return new Response(JSON.stringify({ success: false, error: message, details }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (e: any) {
      return fail("OAuth failed", e.message);
    }

    // ─── GA4 Data API: Run Report ───
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86400000);

    const reportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;

    // Report 1: Daily overview by source/medium
    const overviewResponse = await fetch(reportUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }],
        dimensions: [
          { name: "date" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "screenPageViews" },
          { name: "conversions" },
        ],
        limit: 1000,
        orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
      }),
    });

    if (!overviewResponse.ok) {
      const err = await overviewResponse.text();
      console.error("[ads-ga4-sync] GA4 API error:", err);
      return fail(`GA4 API error (${overviewResponse.status})`, err);
    }

    const overviewData = await overviewResponse.json();
    const rows = overviewData.rows || [];
    console.log(`[ads-ga4-sync] Received ${rows.length} rows from GA4`);

    let upsertCount = 0;
    for (const row of rows) {
      const dims = row.dimensionValues || [];
      const mets = row.metricValues || [];

      // GA4 date format: YYYYMMDD
      const dateRaw = dims[0]?.value || "";
      const dateFormatted = dateRaw.length === 8
        ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
        : dateRaw;

      const source = dims[1]?.value || "unknown";
      const medium = dims[2]?.value || "unknown";

      const { error } = await supabase.from("ads_ga4_metrics").upsert({
        date: dateFormatted,
        source,
        medium,
        sessions: Number(mets[0]?.value || 0),
        users: Number(mets[1]?.value || 0),
        new_users: Number(mets[2]?.value || 0),
        bounce_rate: Number(mets[3]?.value || 0),
        avg_session_duration: Number(mets[4]?.value || 0),
        page_views: Number(mets[5]?.value || 0),
        conversions: Number(mets[6]?.value || 0),
        landing_page: null,
      }, { onConflict: "date,source,medium,landing_page" });

      if (!error) upsertCount++;
    }

    // Report 2: Top landing pages
    const pagesResponse = await fetch(reportUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }],
        dimensions: [
          { name: "landingPage" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "conversions" },
          { name: "bounceRate" },
        ],
        limit: 20,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
    });

    let topPages: { page: string; sessions: number; conversions: number }[] = [];
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      topPages = (pagesData.rows || []).map((r: any) => ({
        page: r.dimensionValues?.[0]?.value || "?",
        sessions: Number(r.metricValues?.[0]?.value || 0),
        conversions: Number(r.metricValues?.[1]?.value || 0),
      }));
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "ga4_sync",
      customer_id: GA4_PROPERTY_ID,
      resource_type: "ga4",
      payload: { rows_synced: upsertCount, top_pages: topPages.length },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-ga4-sync] Done: ${upsertCount} rows synced`);

    return ok({
      rows_synced: upsertCount,
      top_pages: topPages.slice(0, 10),
    });
  } catch (error: any) {
    console.error("[ads-ga4-sync] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
