import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// GCAL PARSE EVENT — Claude AI extracts structured CRM data from Google Calendar event text
// Used during import to convert freeform event text → { firstName, lastName, city, address, phone, contractNumber, productSummary, eventType }

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    try {
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!anthropicKey) {
            return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const { events } = await req.json();

        if (!events || !Array.isArray(events) || events.length === 0) {
            return new Response(JSON.stringify({ error: 'No events provided' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // Batch all events into a single Claude call for efficiency
        const eventsText = events.map((e: any, i: number) => {
            const parts = [
                `[EVENT ${i + 1}]`,
                `Title: ${e.summary || '(no title)'}`,
                e.description ? `Description: ${e.description}` : null,
                e.location ? `Location: ${e.location}` : null,
                e.start?.date ? `Date: ${e.start.date}` : e.start?.dateTime ? `DateTime: ${e.start.dateTime}` : null,
                e.end?.date ? `End: ${e.end.date}` : e.end?.dateTime ? `End: ${e.end.dateTime}` : null,
            ].filter(Boolean).join('\n');
            return parts;
        }).join('\n\n');

        const systemPrompt = `You are a data extraction assistant for a German construction/roofing company (Polendach24). 
Your job is to extract structured CRM data from Google Calendar event text.

The company does:
- Montaż (installation/assembly) of aluminum patio covers, pergolas, carports
- Serwis (service/repair visits)  
- Dokończenie (follow-up/completion visits)

Extract the following fields for EACH event. Return ONLY a JSON array (one object per event):
{
  "firstName": string or null,
  "lastName": string or null,
  "city": string or null,
  "address": string or null (street + house number),
  "postalCode": string or null,
  "phone": string or null,
  "email": string or null,
  "contractNumber": string or null (format like UM/YYYY/MM/NNN or KS/NNN/DD/MM/YYYY),
  "productSummary": string or null (product type + dimensions if found),
  "eventType": "montaz" | "serwis" | "dokończenie" | "unknown",
  "notes": string or null (any remaining useful info),
  "durationDays": number (default 1)
}

Rules:
- German names: "Müller" is lastName, "Hans" is firstName
- Polish names: "Kowalski" is lastName, "Jan" is firstName  
- If the title has format "LastName, FirstName" → parse accordingly
- If you see "Montage", "Montaż", "Installation" → eventType = "montaz"
- If you see "Service", "Serwis", "Reparatur" → eventType = "serwis"
- If you see "Nacharbeit", "Dokończenie", "Fertigstellung" → eventType = "dokończenie"
- Extract postal codes (German 5-digit like 10115, or Polish like 00-000)
- Return null for fields you can't determine, NEVER make up data
- Always return a JSON array with exactly ${events.length} objects, in the same order as the input events`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `Parse these ${events.length} Google Calendar events:\n\n${eventsText}`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errData = await response.text();
            console.error('Claude API error:', errData);
            return new Response(JSON.stringify({ error: 'AI parsing failed', details: errData }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '[]';

        // Extract JSON array from response (Claude might wrap it in markdown)
        let parsed: any[];
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
            console.error('Failed to parse Claude response:', content);
            parsed = [];
        }

        // Ensure we have the right number of results
        while (parsed.length < events.length) {
            parsed.push({
                firstName: null, lastName: null, city: null, address: null,
                postalCode: null, phone: null, email: null, contractNumber: null,
                productSummary: null, eventType: 'unknown', notes: null, durationDays: 1,
            });
        }

        return new Response(JSON.stringify({ parsed }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('gcal-parse-event error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
});
