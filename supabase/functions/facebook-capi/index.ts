import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

// ═══════════════════════════════════════════
// FACEBOOK CONVERSIONS API (CAPI)
// Server-side event tracking for Meta Pixel
// ═══════════════════════════════════════════

const FB_PIXEL_ID = Deno.env.get("FB_PIXEL_ID") || "";
const FB_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN") || "";
const GRAPH_API = "https://graph.facebook.com/v25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SHA-256 hash for PII data (required by Meta)
async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      event_name,    // e.g. "PageView", "Lead", "ViewContent", "Contact", "InitiateCheckout"
      event_id,      // unique dedup ID (optional, generated if missing)
      source_url,    // page URL where event happened
      user_data,     // { email?, phone?, first_name?, last_name?, city?, country?, client_ip?, user_agent?, fbc?, fbp? }
      custom_data,   // { value?, currency?, content_name?, content_category?, content_ids?, content_type? }
    } = body;

    if (!event_name) {
      return new Response(JSON.stringify({ error: "event_name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "FB_PIXEL_ID or FB_ACCESS_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user_data with hashed PII
    const userData: Record<string, any> = {};
    
    if (user_data?.email) userData.em = [await sha256(user_data.email)];
    if (user_data?.phone) userData.ph = [await sha256(user_data.phone)];
    if (user_data?.first_name) userData.fn = [await sha256(user_data.first_name)];
    if (user_data?.last_name) userData.ln = [await sha256(user_data.last_name)];
    if (user_data?.city) userData.ct = [await sha256(user_data.city)];
    if (user_data?.country) userData.country = [await sha256(user_data.country)];
    
    // Non-hashed fields
    if (user_data?.client_ip) userData.client_ip_address = user_data.client_ip;
    if (user_data?.user_agent) userData.client_user_agent = user_data.user_agent;
    if (user_data?.fbc) userData.fbc = user_data.fbc;  // Facebook Click ID (from URL param)
    if (user_data?.fbp) userData.fbp = user_data.fbp;  // Facebook Browser ID (from cookie)

    // Build event
    const eventData: Record<string, any> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action_source: "website",
      user_data: userData,
    };

    if (source_url) eventData.event_source_url = source_url;

    // Custom data (for purchase/lead events)
    if (custom_data) {
      const cd: Record<string, any> = {};
      if (custom_data.value) cd.value = custom_data.value;
      if (custom_data.currency) cd.currency = custom_data.currency;
      if (custom_data.content_name) cd.content_name = custom_data.content_name;
      if (custom_data.content_category) cd.content_category = custom_data.content_category;
      if (custom_data.content_ids) cd.content_ids = custom_data.content_ids;
      if (custom_data.content_type) cd.content_type = custom_data.content_type;
      eventData.custom_data = cd;
    }

    // Send to Facebook Conversions API
    const url = `${GRAPH_API}/${FB_PIXEL_ID}/events`;
    const payload = {
      data: [eventData],
      access_token: FB_ACCESS_TOKEN,
    };

    const fbRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const fbData = await fbRes.json();

    if (fbData.error) {
      console.error("CAPI Error:", fbData.error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: fbData.error.message,
        code: fbData.error.code 
      }), {
        status: 200, // Return 200 so client doesn't break
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      events_received: fbData.events_received,
      event_id: eventData.event_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("CAPI handler error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
