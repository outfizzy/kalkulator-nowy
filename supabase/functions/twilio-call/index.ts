import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // 2. Parse body
        const { to, fromNumberId } = await req.json()
        if (!to) throw new Error('Missing "to" number')

        // 3. Twilio credentials
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
        const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID')!

        // 4. Get caller ID (from assigned number or default)
        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        let callerId = Deno.env.get('TWILIO_PHONE_NUMBER') || '+4915888649130'

        if (fromNumberId) {
            const { data: phoneNum } = await serviceClient
                .from('phone_numbers')
                .select('phone_number')
                .eq('id', fromNumberId)
                .single()
            if (phoneNum) callerId = phoneNum.phone_number
        } else {
            // Try to find number assigned to this user
            const { data: assignedNum } = await serviceClient
                .from('phone_numbers')
                .select('phone_number')
                .eq('assigned_to', user.id)
                .eq('is_active', true)
                .limit(1)
                .single()
            if (assignedNum) callerId = assignedNum.phone_number
        }

        // 5. Initiate call via Twilio REST API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`

        // TwiML to connect to the caller's browser via <Client>
        const twimlUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/voice-outbound-twiml?to=${encodeURIComponent(to)}&callerId=${encodeURIComponent(callerId)}`

        const formBody = new URLSearchParams({
            To: `client:${user.id}`,
            From: callerId,
            Url: twimlUrl,
        })

        const twilioAuth = btoa(`${accountSid}:${authToken}`)

        const callResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${twilioAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody.toString(),
        })

        const callData = await callResponse.json()

        if (!callResponse.ok) {
            throw new Error(callData.message || 'Twilio API error')
        }

        // 6. Log the call
        // Try to find lead/customer by phone number
        const normalizedTo = to.replace(/[\s\-()]/g, '')

        const { data: lead } = await serviceClient
            .from('leads')
            .select('id')
            .or(`phone.eq.${normalizedTo},phone.eq.${to}`)
            .limit(1)
            .maybeSingle()

        const { data: customer } = await serviceClient
            .from('customers')
            .select('id')
            .or(`phone.eq.${normalizedTo},phone.eq.${to}`)
            .limit(1)
            .maybeSingle()

        await serviceClient.from('call_logs').insert({
            twilio_call_sid: callData.sid,
            direction: 'outbound',
            from_number: callerId,
            to_number: to,
            status: 'initiated',
            user_id: user.id,
            lead_id: lead?.id || null,
            customer_id: customer?.id || null,
            started_at: new Date().toISOString(),
        })

        console.log(`Outbound call initiated: ${callData.sid} to ${to} from ${callerId}`)

        return new Response(JSON.stringify({
            success: true,
            callSid: callData.sid,
            to,
            from: callerId,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Twilio Call Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
