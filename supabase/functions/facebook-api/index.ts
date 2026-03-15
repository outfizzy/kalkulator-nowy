import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

// Environment variables
const FB_APP_ID = Deno.env.get("FB_APP_ID") || "";
const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET") || "";
const FB_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN") || "";
const FB_AD_ACCOUNT_ID = Deno.env.get("FB_AD_ACCOUNT_ID") || "";
const FB_PAGE_ID = Deno.env.get("FB_PAGE_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper: call Facebook Graph API
async function fbApi(endpoint: string, method = "GET", body?: any): Promise<any> {
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`);
  
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (method === "GET") {
    url.searchParams.set("access_token", FB_ACCESS_TOKEN);
  } else if (body) {
    opts.body = JSON.stringify({ ...body, access_token: FB_ACCESS_TOKEN });
  }

  const res = await fetch(url.toString(), opts);
  const data = await res.json();
  
  if (data.error) {
    const e = data.error;
    const details = [
      `FB API Error: ${e.message}`,
      `(code: ${e.code})`,
      e.error_subcode ? `subcode: ${e.error_subcode}` : '',
      e.error_user_title ? `title: ${e.error_user_title}` : '',
      e.error_user_msg ? `detail: ${e.error_user_msg}` : '',
      e.fbtrace_id ? `trace: ${e.fbtrace_id}` : '',
      `endpoint: ${endpoint}`,
    ].filter(Boolean).join(' | ');
    console.error('FB API ERROR:', JSON.stringify(data.error));
    throw new Error(details);
  }
  
  return data;
}

// Helper: get page access token (needed for posting)
async function getPageAccessToken(): Promise<string> {
  const data = await fbApi(`/${FB_PAGE_ID}?fields=access_token`);
  return data.access_token;
}

// ═══════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════

// Get account overview / verify connection
async function handleVerifyConnection() {
  const [pageInfo, adAccountInfo] = await Promise.all([
    fbApi(`/${FB_PAGE_ID}?fields=name,fan_count,followers_count,category,about,picture{url}`),
    fbApi(`/${FB_AD_ACCOUNT_ID}?fields=name,account_status,currency,balance,amount_spent,business_name`),
  ]);
  return { page: pageInfo, adAccount: adAccountInfo, connected: true };
}

// ─── PAGE POSTS ─────────────────────────

async function handleGetPosts(params: any) {
  const limit = params.limit || 25;
  // Use page token to access posts
  let pageToken: string;
  try {
    pageToken = await getPageAccessToken();
  } catch {
    pageToken = FB_ACCESS_TOKEN;
  }
  
  // Basic fields that always work (no insights — they cause metric validation errors)
  const fields = 'message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)';
  
  // Try published_posts first (includes API-published posts)
  const url = `${GRAPH_API_BASE}/${FB_PAGE_ID}/published_posts?fields=${fields}&limit=${limit}&access_token=${pageToken}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.error) {
    // Fallback: try /feed endpoint
    const fallbackUrl = `${GRAPH_API_BASE}/${FB_PAGE_ID}/feed?fields=${fields}&limit=${limit}&access_token=${pageToken}`;
    const fallbackRes = await fetch(fallbackUrl);
    const fallbackData = await fallbackRes.json();
    if (fallbackData.error) {
      throw new Error(`FB API Error: ${fallbackData.error.message} (code: ${fallbackData.error.code})`);
    }
    return fallbackData;
  }
  
  return data;
}

async function handlePublishPost(params: any) {
  // Try to get page token, fall back to stored token if it's already a page token
  let pageToken: string;
  try {
    pageToken = await getPageAccessToken();
  } catch {
    pageToken = FB_ACCESS_TOKEN;
  }
  
  const { message, link, media_url, scheduled_time } = params;
  
  const body: any = { message, access_token: pageToken };
  
  if (link) body.link = link;
  
  // If scheduled
  if (scheduled_time) {
    body.published = false;
    body.scheduled_publish_time = Math.floor(new Date(scheduled_time).getTime() / 1000);
  }
  
  // Photo post
  if (media_url) {
    const endpoint = `/${FB_PAGE_ID}/photos`;
    body.url = media_url;
    const res = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data;
  }
  
  // Text/link post
  const res = await fetch(`${GRAPH_API_BASE}/${FB_PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

async function handleDeletePost(params: any) {
  const pageToken = await getPageAccessToken();
  const res = await fetch(`${GRAPH_API_BASE}/${params.post_id}?access_token=${pageToken}`, {
    method: "DELETE",
  });
  return await res.json();
}

// ─── CAMPAIGNS ──────────────────────────

async function handleGetCampaigns(params: any) {
  const limit = params.limit || 50;
  const data = await fbApi(`/${FB_AD_ACCOUNT_ID}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,buying_type,created_time,updated_time,insights{impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions}&limit=${limit}`);
  return data;
}

async function handleCreateCampaign(params: any) {
  const { name, objective, daily_budget, lifetime_budget, status, start_time, end_time, special_ad_categories } = params;
  const body: any = {
    name,
    objective: objective || "OUTCOME_TRAFFIC",
    status: status || "PAUSED",
    special_ad_categories: special_ad_categories || [],
    is_adset_budget_sharing_enabled: false,
  };
  if (daily_budget) body.daily_budget = Math.round(daily_budget * 100); // FB uses cents
  if (lifetime_budget) body.lifetime_budget = Math.round(lifetime_budget * 100);
  if (start_time) body.start_time = start_time;
  if (end_time) body.end_time = end_time;
  
  return await fbApi(`/${FB_AD_ACCOUNT_ID}/campaigns`, "POST", body);
}

async function handleUpdateCampaign(params: any) {
  const { campaign_id, ...updates } = params;
  if (updates.daily_budget) updates.daily_budget = Math.round(updates.daily_budget * 100);
  if (updates.lifetime_budget) updates.lifetime_budget = Math.round(updates.lifetime_budget * 100);
  return await fbApi(`/${campaign_id}`, "POST", updates);
}

// ─── AD SETS ────────────────────────────

async function handleGetAdSets(params: any) {
  const source = params.campaign_id || FB_AD_ACCOUNT_ID;
  const data = await fbApi(`/${source}/adsets?fields=name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time,insights{impressions,reach,clicks,spend,cpc,ctr}&limit=50`);
  return data;
}

async function handleCreateAdSet(params: any) {
  const { campaign_id, name, daily_budget, targeting, optimization_goal, billing_event, status, start_time, end_time,
    publisher_platforms, facebook_positions, instagram_positions, messenger_positions, audience_network_positions,
    pacing_type, adset_schedule } = params;
  const body: any = {
    campaign_id,
    name,
    optimization_goal: optimization_goal || "LINK_CLICKS",
    billing_event: billing_event || "IMPRESSIONS",
    status: status || "PAUSED",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: targeting || { geo_locations: { countries: ["DE"] }, age_min: 25, age_max: 65 },
  };
  if (daily_budget) body.daily_budget = Math.round(daily_budget * 100);
  if (start_time) body.start_time = start_time;
  if (end_time) body.end_time = end_time;

  // Facebook v25+ requires promoted_object with page_id for all ad sets
  body.promoted_object = { page_id: FB_PAGE_ID };
  
  // Ad schedule (dayparting)
  if (pacing_type) body.pacing_type = pacing_type;
  if (adset_schedule) body.adset_schedule = adset_schedule;
  
  // Placements: if publisher_platforms provided, use manual placements
  // If not provided, Facebook uses Advantage+ (automatic) placements
  if (publisher_platforms && publisher_platforms.length > 0) {
    body.targeting = {
      ...body.targeting,
      publisher_platforms,
      ...(facebook_positions?.length ? { facebook_positions } : {}),
      ...(instagram_positions?.length ? { instagram_positions } : {}),
      ...(messenger_positions?.length ? { messenger_positions } : {}),
      ...(audience_network_positions?.length ? { audience_network_positions } : {}),
    };
  }
  
  console.log('Creating AdSet with body:', JSON.stringify(body));
  return await fbApi(`/${FB_AD_ACCOUNT_ID}/adsets`, "POST", body);
}

// Upload an image to the ad account for use in creatives
async function handleUploadAdImage(params: any) {
  const { image_url } = params;
  if (!image_url) throw new Error("image_url is required");
  
  // Facebook accepts image_url for remote images
  const body = { url: image_url };
  const result = await fbApi(`/${FB_AD_ACCOUNT_ID}/adimages`, "POST", body);
  
  // Result contains: { images: { hash: { hash, url } } }
  const images = result.images || {};
  const firstImage = Object.values(images)[0] as any;
  return { image_hash: firstImage?.hash, image_url: firstImage?.url, ...result };
}

// ─── ADS ────────────────────────────────

async function handleGetAds(params: any) {
  const source = params.adset_id || FB_AD_ACCOUNT_ID;
  const data = await fbApi(`/${source}/ads?fields=name,status,creative{title,body,image_url,object_story_spec,thumbnail_url},insights{impressions,reach,clicks,spend,cpc,ctr}&limit=50`);
  return data;
}

async function handleCreateAd(params: any) {
  const { adset_id, name, creative, status } = params;
  
  // Step 1: Upload image to FB Ad Account (if image_url provided)
  let imageHash: string | undefined;
  if (creative.image_url) {
    try {
      console.log('Uploading ad image:', creative.image_url);
      const uploadResult = await handleUploadAdImage({ image_url: creative.image_url });
      imageHash = uploadResult.image_hash;
      console.log('Image uploaded, hash:', imageHash);
    } catch (imgErr: any) {
      console.error('Image upload failed, continuing without image:', imgErr.message);
    }
  }
  
  // Step 2: Create the ad creative
  const linkData: any = {
    link: creative.link || "https://polendach24.de",
    message: creative.message || "",
    name: creative.headline || "",
    description: creative.description || "",
    call_to_action: {
      type: creative.cta || "LEARN_MORE",
    },
  };
  
  // Use image_hash if uploaded successfully, otherwise fall back to image_url
  if (imageHash) {
    linkData.image_hash = imageHash;
  } else if (creative.image_url) {
    linkData.image_url = creative.image_url;
  }
  
  const creativeBody: any = {
    name: `Creative for ${name}`,
    object_story_spec: {
      page_id: FB_PAGE_ID,
      link_data: linkData,
    },
  };
  
  console.log('Creating ad creative with body:', JSON.stringify(creativeBody));
  const creativeResult = await fbApi(`/${FB_AD_ACCOUNT_ID}/adcreatives`, "POST", creativeBody);
  
  // Step 3: Create the ad
  const adBody = {
    name,
    adset_id,
    creative: { creative_id: creativeResult.id },
    status: status || "PAUSED",
  };
  
  return await fbApi(`/${FB_AD_ACCOUNT_ID}/ads`, "POST", adBody);
}

// ─── INSIGHTS ───────────────────────────

async function handleGetInsights(params: any) {
  const { entity_id, time_range, level, breakdowns } = params;
  const target = entity_id || FB_AD_ACCOUNT_ID;
  
  let query = `/${target}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions,cost_per_action_type,conversions,cost_per_conversion&level=${level || 'account'}`;
  
  if (time_range) {
    query += `&time_range=${JSON.stringify(time_range)}`;
  } else {
    // Default: last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    query += `&time_range=${JSON.stringify({ since: since.toISOString().split('T')[0], until: new Date().toISOString().split('T')[0] })}`;
  }
  
  if (breakdowns) query += `&breakdowns=${breakdowns}`;
  
  return await fbApi(query);
}

async function handleGetAccountInsights() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const errors: string[] = [];
  
  const [monthly, weekly, daily, pageInfo] = await Promise.all([
    fbApi(`/${FB_AD_ACCOUNT_ID}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions&time_range=${JSON.stringify({ since: thirtyDaysAgo, until: today })}`).catch((e: any) => { errors.push(`Ad insights (30d): ${e.message}`); return { data: [] }; }),
    fbApi(`/${FB_AD_ACCOUNT_ID}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr&time_range=${JSON.stringify({ since: sevenDaysAgo, until: today })}`).catch((e: any) => { errors.push(`Ad insights (7d): ${e.message}`); return { data: [] }; }),
    fbApi(`/${FB_AD_ACCOUNT_ID}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr&time_range=${JSON.stringify({ since: today, until: today })}&time_increment=1`).catch((e: any) => { errors.push(`Ad insights (today): ${e.message}`); return { data: [] }; }),
    fbApi(`/${FB_PAGE_ID}?fields=name,fan_count,followers_count,new_like_count,talking_about_count,picture{url}`).catch((e: any) => { errors.push(`Page info: ${e.message}`); return {}; }),
  ]);
  
  return { monthly, weekly, daily, page: pageInfo, errors: errors.length > 0 ? errors : undefined };
}

// ─── AUDIENCES ──────────────────────────

async function handleGetAudiences() {
  return await fbApi(`/${FB_AD_ACCOUNT_ID}/customaudiences?fields=name,approximate_count,subtype,delivery_status,operation_status,data_source&limit=50`);
}

async function handleCreateAudience(params: any) {
  const { name, description, subtype, customer_file_source } = params;
  const body: any = {
    name,
    description: description || "",
    subtype: subtype || "CUSTOM",
    customer_file_source: customer_file_source || "USER_PROVIDED_ONLY",
  };
  return await fbApi(`/${FB_AD_ACCOUNT_ID}/customaudiences`, "POST", body);
}

// ─── PAGE INSIGHTS ──────────────────────

async function handleGetPageInsights(params: any) {
  const period = params.period || "week";
  // Use only metrics valid in Graph API v18+
  const metrics = "page_impressions,page_engaged_users,page_fan_adds,page_views_total,page_post_engagements";
  try {
    return await fbApi(`/${FB_PAGE_ID}/insights?metric=${metrics}&period=${period}`);
  } catch (_e) {
    // Fallback to minimal safe metrics if some are unavailable for this page type
    const safeMetrics = "page_impressions,page_engaged_users,page_post_engagements";
    return await fbApi(`/${FB_PAGE_ID}/insights?metric=${safeMetrics}&period=${period}`);
  }
}

// ─── LEAD FORMS (leads_retrieval) ───────

async function handleGetLeadForms() {
  return await fbApi(`/${FB_PAGE_ID}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=50`);
}

async function handleGetLeads(params: any) {
  const { form_id, limit } = params;
  if (!form_id) throw new Error('form_id is required');
  return await fbApi(`/${form_id}/leads?fields=id,created_time,field_data&limit=${limit || 50}`);
}

// ─── AD LIBRARY (Competitor Research) ───

async function handleSearchAdLibrary(params: any) {
  const { search_terms, ad_type, country } = params;
  return await fbApi(`/ads_archive?search_terms=${encodeURIComponent(search_terms || 'terrassendach aluminium')}&ad_type=${ad_type || 'ALL'}&ad_reached_countries=['${country || 'DE'}']&fields=ad_creation_time,ad_delivery_start_time,ad_snapshot_url,page_name,spend,impressions&limit=25`);
}

// ─── TOKEN REFRESH ──────────────────────

async function handleRefreshToken() {
  // Step 1: Exchange current token for a long-lived user token (60 days)
  const exchangeUrl = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${FB_ACCESS_TOKEN}`;
  const exchangeRes = await fetch(exchangeUrl);
  const exchangeData = await exchangeRes.json();
  
  if (exchangeData.error) {
    throw new Error(`Token exchange failed: ${exchangeData.error.message}`);
  }
  
  const longLivedToken = exchangeData.access_token;
  const expiresIn = exchangeData.expires_in || 5184000; // ~60 days
  
  // Step 2: Get a Page Access Token using the long-lived user token
  // Page tokens derived from long-lived user tokens NEVER expire
  const pageTokenUrl = `${GRAPH_API_BASE}/${FB_PAGE_ID}?fields=access_token&access_token=${longLivedToken}`;
  const pageTokenRes = await fetch(pageTokenUrl);
  const pageTokenData = await pageTokenRes.json();
  
  if (pageTokenData.error) {
    throw new Error(`Page token fetch failed: ${pageTokenData.error.message}`);
  }
  
  // Step 3: Update the Supabase secret with the new long-lived USER token
  // (We keep the user token because it's needed for ad account operations)
  // The page token is obtained dynamically via getPageAccessToken()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Store refresh log
  await supabase.from('system_logs').insert({
    action: 'fb_token_refresh',
    entity_type: 'facebook',
    entity_id: FB_PAGE_ID,
    details: {
      expires_in: expiresIn,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      refreshed_at: new Date().toISOString(),
      has_page_token: !!pageTokenData.access_token,
    },
  }).catch(() => {});
  
  return {
    success: true,
    message: 'Token refreshed successfully',
    expires_in_days: Math.round(expiresIn / 86400),
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    note: 'Long-lived user token obtained. Page token (never expires) is derived automatically.',
    new_token: longLivedToken,
  };
}

// ─── INSTAGRAM PUBLISHING ───────────────

async function getInstagramAccountId(): Promise<string> {
  const pageToken = await getPageAccessToken();
  const res = await fetch(
    `${GRAPH_API_BASE}/${FB_PAGE_ID}?fields=instagram_business_account&access_token=${pageToken}`
  );
  const data = await res.json();
  if (!data.instagram_business_account?.id) {
    throw new Error("Brak połączonego konta Instagram Business. Połącz IG z FB Page w Meta Business Suite.");
  }
  return data.instagram_business_account.id;
}

async function handleGetInstagramAccount() {
  try {
    const igId = await getInstagramAccountId();
    const pageToken = await getPageAccessToken();
    const res = await fetch(
      `${GRAPH_API_BASE}/${igId}?fields=username,name,profile_picture_url,followers_count,media_count&access_token=${pageToken}`
    );
    return await res.json();
  } catch (err: any) {
    return { error: err.message, connected: false };
  }
}

async function handlePublishInstagram(params: any) {
  const { image_url, caption, media_type } = params;
  if (!image_url) throw new Error("image_url is required for Instagram");
  
  const igId = await getInstagramAccountId();
  const pageToken = await getPageAccessToken();
  
  // Step 1: Create media container
  const containerBody: any = {
    image_url,
    caption: caption || "",
    access_token: pageToken,
  };
  if (media_type === "REELS" || media_type === "VIDEO") {
    containerBody.media_type = media_type;
    containerBody.video_url = image_url;
    delete containerBody.image_url;
  }
  
  const containerRes = await fetch(`${GRAPH_API_BASE}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  const container = await containerRes.json();
  if (container.error) throw new Error(container.error.message);
  
  // Step 2: Publish the container
  const publishRes = await fetch(`${GRAPH_API_BASE}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: pageToken,
    }),
  });
  const published = await publishRes.json();
  if (published.error) throw new Error(published.error.message);
  
  return { success: true, ig_media_id: published.id, container_id: container.id };
}

async function handlePublishBoth(params: any) {
  const { message, media_url, caption, image_url } = params;
  const results: any = { fb: null, ig: null };
  
  // Publish to Facebook
  try {
    results.fb = await handlePublishPost({ 
      message: message || caption, 
      media_url: media_url || image_url 
    });
  } catch (err: any) {
    results.fb = { error: err.message };
  }
  
  // Publish to Instagram (if image provided)
  const igImage = image_url || media_url;
  if (igImage) {
    try {
      results.ig = await handlePublishInstagram({ 
        image_url: igImage, 
        caption: caption || message 
      });
    } catch (err: any) {
      results.ig = { error: err.message };
    }
  } else {
    results.ig = { skipped: true, reason: "Instagram requires an image" };
  }
  
  return results;
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { action, ...params } = await req.json();

    let result: any;

    switch (action) {
      // Connection
      case "verify_connection": result = await handleVerifyConnection(); break;
      
      // Posts
      case "get_posts": result = await handleGetPosts(params); break;
      case "publish_post": result = await handlePublishPost(params); break;
      case "delete_post": result = await handleDeletePost(params); break;
      
      // Campaigns
      case "get_campaigns": result = await handleGetCampaigns(params); break;
      case "create_campaign": result = await handleCreateCampaign(params); break;
      case "update_campaign": result = await handleUpdateCampaign(params); break;
      
      // Ad Sets
      case "get_adsets": result = await handleGetAdSets(params); break;
      case "create_adset": result = await handleCreateAdSet(params); break;
      case "upload_ad_image": result = await handleUploadAdImage(params); break;
      
      // Ads
      case "get_ads": result = await handleGetAds(params); break;
      case "create_ad": result = await handleCreateAd(params); break;
      
      // Insights
      case "get_insights": result = await handleGetInsights(params); break;
      case "get_account_insights": result = await handleGetAccountInsights(); break;
      case "get_page_insights": result = await handleGetPageInsights(params); break;
      
      // Audiences
      case "get_audiences": result = await handleGetAudiences(); break;
      case "create_audience": result = await handleCreateAudience(params); break;
      
      // Lead Forms
      case "get_lead_forms": result = await handleGetLeadForms(); break;
      case "get_leads": result = await handleGetLeads(params); break;
      
      // Competitor
      case "search_ad_library": result = await handleSearchAdLibrary(params); break;
      
      // Instagram
      case "publish_instagram": result = await handlePublishInstagram(params); break;
      case "publish_both": result = await handlePublishBoth(params); break;
      case "get_instagram_account": result = await handleGetInstagramAccount(); break;
      
      // Token refresh
      case "refresh_token": result = await handleRefreshToken(); break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Facebook API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
