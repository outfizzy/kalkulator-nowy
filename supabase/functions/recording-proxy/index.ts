// recording-proxy: Proxy Twilio recording URLs to avoid browser auth prompts
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const recordingUrl = url.searchParams.get('url');

        if (!recordingUrl) {
            return new Response(JSON.stringify({ error: 'Missing url param' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Validate it's a Twilio URL
        if (!recordingUrl.includes('twilio.com') && !recordingUrl.includes('twilio')) {
            return new Response(JSON.stringify({ error: 'Invalid recording URL' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

        const response = await fetch(recordingUrl, {
            headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            },
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `Twilio returned ${response.status}` }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const audioData = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'audio/mpeg';

        return new Response(audioData, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error: any) {
        console.error('[recording-proxy] ERROR:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
