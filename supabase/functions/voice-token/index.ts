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

// Validate Twilio credential formats
function validateCredentials(accountSid: string, apiKey: string, apiSecret: string, twimlAppSid: string): string | null {
    if (!accountSid.startsWith('AC')) {
        return `TWILIO_ACCOUNT_SID format invalid (should start with "AC", got "${accountSid.substring(0, 4)}...")`;
    }
    if (!apiKey.startsWith('SK')) {
        return `TWILIO_API_KEY_SID format invalid (should start with "SK", got "${apiKey.substring(0, 4)}...")`;
    }
    if (apiSecret.length < 20) {
        return `TWILIO_API_KEY_SECRET too short (${apiSecret.length} chars, expected 32+)`;
    }
    if (!twimlAppSid.startsWith('AP')) {
        return `TWILIO_TWIML_APP_SID format invalid (should start with "AP", got "${twimlAppSid.substring(0, 4)}...")`;
    }
    return null;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // ─── GET: Diagnostic / health check endpoint ───
    if (req.method === 'GET') {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const apiKey = Deno.env.get('TWILIO_API_KEY_SID') || '';
        const apiSecret = Deno.env.get('TWILIO_API_KEY_SECRET') || '';
        const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID') || '';

        const configured = !!(accountSid && apiKey && apiSecret && twimlAppSid);
        const validationError = configured ? validateCredentials(accountSid, apiKey, apiSecret, twimlAppSid) : null;

        return new Response(JSON.stringify({
            status: 'voice-token v51 (diagnostics)',
            configured,
            credentials: {
                TWILIO_ACCOUNT_SID: accountSid ? `${accountSid.substring(0, 6)}...` : '❌ MISSING',
                TWILIO_API_KEY_SID: apiKey ? `${apiKey.substring(0, 6)}...` : '❌ MISSING',
                TWILIO_API_KEY_SECRET: apiSecret ? `✅ SET (${apiSecret.length} chars)` : '❌ MISSING',
                TWILIO_TWIML_APP_SID: twimlAppSid ? `${twimlAppSid.substring(0, 6)}...` : '❌ MISSING',
            },
            validationError,
            ts: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
            console.error('[voice-token] Auth failed:', userError?.message || 'No user');
            // Return 200 with error payload (200-OK Payload pattern) so client can read details
            return new Response(JSON.stringify({
                error: 'Nieautoryzowany — zaloguj się ponownie',
                code: 'AUTH_FAILED',
                details: userError?.message || 'Session expired',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Load Twilio Credentials
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const apiKey = Deno.env.get('TWILIO_API_KEY_SID') || '';
        const apiSecret = Deno.env.get('TWILIO_API_KEY_SECRET') || '';
        const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID') || '';

        // Check if all vars are present
        const missing = [
            !accountSid && 'TWILIO_ACCOUNT_SID',
            !apiKey && 'TWILIO_API_KEY_SID',
            !apiSecret && 'TWILIO_API_KEY_SECRET',
            !twimlAppSid && 'TWILIO_TWIML_APP_SID'
        ].filter(Boolean);

        if (missing.length > 0) {
            console.error(`[voice-token] Missing env vars: ${missing.join(', ')}`);
            return new Response(JSON.stringify({
                error: `Brak konfiguracji Twilio: ${missing.join(', ')}`,
                code: 'TWILIO_CONFIG_MISSING',
                details: `Ustaw zmienne środowiskowe w Supabase Edge Functions: ${missing.join(', ')}`,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Validate credential formats
        const formatError = validateCredentials(accountSid, apiKey, apiSecret, twimlAppSid);
        if (formatError) {
            console.error(`[voice-token] Credential format error: ${formatError}`);
            return new Response(JSON.stringify({
                error: `Nieprawidłowy format kluczy Twilio`,
                code: 'TWILIO_CONFIG_INVALID',
                details: formatError,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 4. Generate Access Token using Web Crypto API (no npm:twilio needed)
        const token = await createTwilioAccessToken(
            accountSid,
            apiKey,
            apiSecret,
            user.id,
            twimlAppSid
        );

        console.log(`[voice-token] ✅ Token generated for identity: ${user.id} (${user.email})`);

        return new Response(JSON.stringify({
            token: token,
            identity: user.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('[voice-token] Unexpected error:', error.message);
        // 200-OK Payload pattern — always return 200 so client can read the error
        return new Response(JSON.stringify({
            error: error.message || 'Nieznany błąd generowania tokenu',
            code: 'TOKEN_GENERATION_FAILED',
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
