// voice-hold-music: Returns TwiML that plays hold music in a loop
// Used as waitUrl for Twilio Queue
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    const musicUrl = 'https://whgjsppyuvglhbdgdark.supabase.co/storage/v1/object/public/audio/umilacz.mp3';

    // TwiML: Play the music in a loop while caller waits in queue
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play loop="0">${musicUrl}</Play>
</Response>`;

    return new Response(twiml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
    });
});
