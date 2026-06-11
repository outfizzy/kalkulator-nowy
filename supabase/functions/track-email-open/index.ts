import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const rid = url.searchParams.get('rid');

  if (!rid) {
    // Return 1x1 transparent pixel
    return new Response(Uint8Array.from([71,73,70,56,57,97,1,0,1,0,0,0,0,59]), {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Update recipient opened_at
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .select('campaign_id, opened_at')
      .eq('id', rid)
      .single();

    if (recipient && !recipient.opened_at) {
      await supabase.from('campaign_recipients')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', rid);

      // Increment campaign opened_count
      const { data: campaign } = await supabase
        .from('email_campaigns')
        .select('opened_count')
        .eq('id', recipient.campaign_id)
        .single();

      if (campaign) {
        await supabase.from('email_campaigns')
          .update({ opened_count: (campaign.opened_count || 0) + 1 })
          .eq('id', recipient.campaign_id);
      }
    }
  } catch (err) {
    console.error('Track open error:', err);
  }

  // Always return transparent pixel
  return new Response(Uint8Array.from([71,73,70,56,57,97,1,0,1,0,0,0,0,59]), {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' }
  });
});
