import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Twilio from "npm:twilio"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
        // The user must be logged in to get a voice token (to receive calls)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // 2. Load Twilio Credentials
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const apiKey = Deno.env.get('TWILIO_API_KEY_SID');
        const apiSecret = Deno.env.get('TWILIO_API_KEY_SECRET');
        const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');

        if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
            throw new Error('Missing Twilio Configuration');
        }

        // 3. Generate Access Token
        const AccessToken = Twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        // Create a "grant" which enables a client to use Voice as a given user
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: true, // Allow incoming calls
        });

        // Create an access token which we will sign and return to the client,
        // containing the grant we just created
        // IDENTITY: We use the Supabase User ID. The incoming call handler must dial <Client>{userId}</Client>
        const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: user.id });
        token.addGrant(voiceGrant);

        console.log(`Generated token for identity: ${user.id}`);

        return new Response(JSON.stringify({
            token: token.toJwt(),
            identity: user.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Voice Token Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
