import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Base64URL encode helper
function base64urlEncode(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64url(text: string): string {
    return base64urlEncode(new TextEncoder().encode(text));
}

async function createTwilioAccessToken(
    accountSid: string,
    apiKey: string,
    apiSecret: string,
    identity: string,
    twimlAppSid: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = 3600; // 1 hour

    const header = {
        typ: 'JWT',
        alg: 'HS256',
        cty: 'twilio-fpa;v=1'
    };

    const payload = {
        jti: `${apiKey}-${now}`,
        iss: apiKey,
        sub: accountSid,
        nbf: now,
        exp: now + ttl,
        grants: {
            identity: identity,
            voice: {
                outgoing: {
                    application_sid: twimlAppSid
                },
                incoming: {
                    allow: true
                }
            }
        }
    };

    const headerB64 = textToBase64url(JSON.stringify(header));
    const payloadB64 = textToBase64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    // Sign with HMAC-SHA256
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(signingInput)
    );

    const signatureB64 = base64urlEncode(new Uint8Array(signature));

    return `${signingInput}.${signatureB64}`;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
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
            throw new Error('Missing Twilio Configuration: ' +
                [!accountSid && 'ACCOUNT_SID', !apiKey && 'API_KEY_SID', !apiSecret && 'API_KEY_SECRET', !twimlAppSid && 'TWIML_APP_SID'].filter(Boolean).join(', '));
        }

        // 3. Generate Access Token using Web Crypto API (no npm:twilio needed)
        const token = await createTwilioAccessToken(
            accountSid,
            apiKey,
            apiSecret,
            user.id,
            twimlAppSid
        );

        console.log(`Generated token for identity: ${user.id}`);

        return new Response(JSON.stringify({
            token: token,
            identity: user.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Voice Token Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
