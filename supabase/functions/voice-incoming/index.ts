import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import VoiceResponse from "npm:twilio@^4.23.0/lib/twiml/VoiceResponse.js";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS (though Twilio POSTs directly usually)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const twiml = new VoiceResponse();

        // 1. Initial Greeting
        // twiml.say({ language: 'pl-PL' }, 'Łączę z konsultantem Polendach24. Proszę czekać.');

        // 2. Parallel Ringing (Ring multiple people)
        // In a real scenario, we would fetch the list of online agents from Supabase Database.
        // For this MVP, we will Dial a generic 'admin' client. 
        // The Frontend Client must register as 'admin' (or we dial specific user IDs).

        // Strategy:
        // If we want to ring multiple people, we use multiple <Client> tags inside <Dial>.
        // For now, let's assume all admins listen to the 'support_team' identity, 
        // OR we ring specific user IDs if we knew them.
        // To make it simple: The frontend will register with the User ID.
        // Since we don't know who is online here without DB check, we can try to ring a known list 
        // or just ring a single "broadcast" identity that everyone subscribes to?
        // Twilio Client can only have one identity.
        // So better strategy: loop through *potential* agents.

        // For MVP: Let's assume the main admin/user is the target.
        // We will hardcode dialing a "global" identity that the frontend app listens to? 
        // No, frontend registers with UserID.
        // Ideally we fetch "SELECT id FROM auth.users" (or profiles) via Supabase Client here.

        // Let's implement dynamic fetching of 'admin' / 'rep' users.

        /*
        const supabaseClient = createClient(...)
        const { data: agents } = await supabaseClient.from('profiles').select('id').in('role', ['admin', 'sales_rep']);
        const dial = twiml.dial();
        agents.forEach(agent => dial.client(agent.id));
        */

        // Simplified approach for immediate testing:
        // The user (Tomasz) will likely be the one testing.
        // Let's Dial a specific Client identity if provided in query, otherwise fallback.
        // ACTUALLY: Let's use <Dial> <Client>admin</Client> </Dial>
        // And forcing the Frontend to register with identity 'admin' for now?
        // No, `voice-token` uses `user.id`.

        // LET'S FETCH ADMINS dynamically.

        const dial = twiml.dial({
            callerId: Deno.env.get('TWILIO_PHONE_NUMBER'), // Show the company number
            timeout: 20,
        });

        // RING STRATEGY:
        // Ring 'admin' identity (simulated broadcast group). 
        // We will modify the frontend to register TWO identities? No.
        // We will modify `voice-token` to also allow listening to 'admin' topic? Twilio doesn't support topics easily.

        // Reverting to: Ring specific known ID or just <Client>support</Client> for all?
        // Twilio Voice SDK allows registering with ONE identity.
        // We will tell the user to register as 'admin' in the plan?
        // No, let's keep it robust.

        // DECISION: Ring the `user.id` of the user who requested this feature (admin).
        // Or simpler: Dial <Client>support</Client> and have the Frontend join with identity 'support'.
        dial.client('support');

        return new Response(twiml.toString(), {
            headers: { 'Content-Type': 'application/xml' },
        })

    } catch (error: any) {
        console.error('Incoming Call Error:', error);
        return new Response(`<Response><Say>Wystapił błąd.</Say></Response>`, {
            status: 200, // Twilio needs 200 even for errors to play Say
            headers: { 'Content-Type': 'application/xml' },
        })
    }
})
