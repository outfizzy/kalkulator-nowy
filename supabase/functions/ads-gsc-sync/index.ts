// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-gsc-sync — Google Search Console API → Supabase
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GSC_SITE_URL = "https://zadaszto.pl";

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

    // ─── Search Console: Search Analytics ───
    const endDate = new Date(Date.now() - 2 * 86400000); // GSC data is delayed 2 days
    const startDate = new Date(Date.now() - 30 * 86400000);

    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;

    // Query 1: Top queries by date
    const queryResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ["date", "query"],
        rowLimit: 500,
        startRow: 0,
      }),
    });

    if (!queryResponse.ok) {
      const err = await queryResponse.text();
      console.error("[ads-gsc-sync] GSC API error:", err);

      // If 403 — scope not authorized, log and return gracefully
      if (queryResponse.status === 403) {
        return fail(
          "Search Console API: brak uprawnień",
          "Refresh token nie ma scope 'webmasters.readonly'. Dodaj scope i ponownie autoryzuj: https://www.googleapis.com/auth/webmasters.readonly"
        );
      }

      return fail(`GSC API error (${queryResponse.status})`, err);
    }

    const queryData = await queryResponse.json();
    const rows = queryData.rows || [];
    console.log(`[ads-gsc-sync] Received ${rows.length} rows from Search Console`);

    let upsertCount = 0;
    for (const row of rows) {
      const keys = row.keys || [];
      const date = keys[0];
      const query = keys[1];

      const { error } = await supabase.from("ads_search_console_metrics").upsert({
        date,
        query,
        page: null,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0),
      }, { onConflict: "date,query,coalesce_page" });

      // Fallback: try without onConflict name if constraint name differs
      if (error) {
        await supabase.from("ads_search_console_metrics").upsert({
          date,
          query,
          page: null,
          clicks: Number(row.clicks || 0),
          impressions: Number(row.impressions || 0),
          ctr: Number(row.ctr || 0),
          position: Number(row.position || 0),
        });
      }

      upsertCount++;
    }

    // Query 2: Top pages
    const pageResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ["page"],
        rowLimit: 20,
      }),
    });

    let topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[] = [];
    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      topPages = (pageData.rows || []).map((r: any) => ({
        page: r.keys?.[0] || "?",
        clicks: Number(r.clicks || 0),
        impressions: Number(r.impressions || 0),
        ctr: Number(r.ctr || 0),
        position: Number(r.position || 0),
      }));
    }

    // Audit log
    await supabase.from("ads_audit_log").insert({
      operation: "gsc_sync",
      customer_id: GSC_SITE_URL,
      resource_type: "search_console",
      payload: { rows_synced: upsertCount, top_pages: topPages.length },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[ads-gsc-sync] Done: ${upsertCount} rows synced`);

    return ok({
      rows_synced: upsertCount,
      top_pages: topPages.slice(0, 10),
    });
  } catch (error: any) {
    console.error("[ads-gsc-sync] Error:", error?.message);
    return fail(error?.message || "Nieznany błąd");
  }
});
