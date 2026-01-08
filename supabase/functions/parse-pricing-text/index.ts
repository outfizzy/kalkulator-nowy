
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text_content } = await req.json()

        if (!text_content) {
            throw new Error('No text_content provided')
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
            throw new Error('Missing OPENAI_API_KEY')
        }

        const systemPrompt = `You are a strict data parser. 
    User will provide unstructured text copied from a PDF pricing table.
    Your task is to extracting a 2D matrix of numbers (prices).
    
    Rules:
    1. Detect rows and columns based on spaces, tabs, or newlines.
    2. Handle European number formats: "1.234,56" -> 1234.56, "1 200" -> 1200.
    3. Remove currency symbols (€, EUR, PLN, zł), text headers, or garbage.
    4. Return ONLY a JSON object with strictly this structure: { "rows": [[number, number], [number, number]] }
    5. Treat empty cells as 0 or null if ambiguous, but prefer 0 for prices.
    6. If a line is clearly a header (contains words like "Dimensions", "Price"), SKIP IT.
    
    Example Input:
    "3000  4000
    100,50 200,00"
    
    Example Output:
    { "rows": [[100.5, 200.0]] } 
    (Wait, if 3000/4000 are headers, skip. If they look like data, keep. Use best judgement. Usually dimensions are integer, prices have decimals. BUT if grid is strictly prices, keep all numbers.)
    
    Clarification: The user is selectively pasting a BLOCK of prices. It is likely JUST numbers.
    Structure the output as a grid matching the visual layout of the text.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text_content }
                ],
                response_format: { type: 'json_object' }
            }),
        })

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI Error:', err);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json()
        const content = JSON.parse(data.choices[0].message.content)

        return new Response(
            JSON.stringify(content),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
