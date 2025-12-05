import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const dateFrom = url.searchParams.get('date_from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const dateTo = url.searchParams.get('date_to') || new Date().toISOString().split('T')[0]

        // Ringostat API credentials
        const projectId = '103713'
        const authKey = '9rHWrjnNdwnHHC1Nz9dwd7x4B9vjfNjX'

        // Fetch calls from Ringostat
        const ringostatUrl = `https://api.ringostat.net/calls/list?date_from=${dateFrom}&date_to=${dateTo}`

        const response = await fetch(ringostatUrl, {
            method: 'GET',
            headers: {
                'Auth-key': authKey,
                'Project-ID': projectId,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Ringostat API error: ${response.status}`)
        }

        const calls = await response.json()

        // Process calls data
        const stats = {
            total: calls.length,
            answered: 0,
            missed: 0,
            byNumber: {} as Record<string, { total: number; answered: number; missed: number }>,
            calls: [] as any[]
        }

        for (const call of calls) {
            // Determine if call was answered
            const isAnswered = call.status === 'answered' || call.billsec > 0 || call.disposition === 'ANSWER'

            if (isAnswered) {
                stats.answered++
            } else {
                stats.missed++
            }

            // Group by phone number
            const phoneNumber = call.caller_id || call.dst || call.src || 'Unknown'
            if (!stats.byNumber[phoneNumber]) {
                stats.byNumber[phoneNumber] = { total: 0, answered: 0, missed: 0 }
            }
            stats.byNumber[phoneNumber].total++
            if (isAnswered) {
                stats.byNumber[phoneNumber].answered++
            } else {
                stats.byNumber[phoneNumber].missed++
            }

            // Add to calls list (limit to 100 most recent)
            if (stats.calls.length < 100) {
                stats.calls.push({
                    id: call.id || call.uniqueid,
                    date: call.calldate || call.start_time,
                    duration: call.billsec || call.duration || 0,
                    caller: call.caller_id || call.src,
                    callee: call.dst,
                    status: isAnswered ? 'answered' : 'missed',
                    direction: call.direction || (call.src?.startsWith('+') ? 'incoming' : 'outgoing'),
                    recording: call.recording_url || call.recordingfile
                })
            }
        }

        return new Response(JSON.stringify(stats), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({
            error: error.message,
            total: 0,
            answered: 0,
            missed: 0,
            byNumber: {},
            calls: []
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
