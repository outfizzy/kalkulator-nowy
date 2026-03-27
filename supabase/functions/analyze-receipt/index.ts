const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { image, mimeType } = await req.json();

        if (!image) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: image (base64)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'Missing OPENAI_API_KEY' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const systemPrompt = `You are an expert receipt/invoice OCR AI. Your task is to analyze a photo of a fuel receipt or invoice and extract the key information.

You MUST return ONLY a valid JSON object (no markdown, no explanation) with these fields:

{
  "liters": <number or null - the amount of fuel in liters>,
  "cost": <number or null - the total cost/amount paid>,
  "currency": <"PLN" or "EUR" or null - detected currency>,
  "stationName": <string or null - name of the gas station>,
  "date": <string "YYYY-MM-DD" or null - date on the receipt>,
  "fuelType": <string or null - type of fuel e.g. "Diesel", "PB95", "PB98", "LPG">,
  "pricePerLiter": <number or null - unit price per liter>,
  "confidence": <number 0-1, how confident you are in the extraction>
}

CRITICAL RULES:
1. Extract exact numbers from the receipt. Do NOT guess or approximate.
2. If you cannot clearly read a field, set it to null.
3. Look for keywords in multiple languages (Polish: "litry", "ilość", "razem", "suma", "cena"; German: "Liter", "Betrag", "Gesamt", "Preis").
4. Currency detection: look for "zł", "PLN", "€", "EUR" symbols.
5. The receipt may be a paper receipt, e-receipt, or invoice. Handle all formats.
6. For fuel amount, look for volume indicators (L, l, litr, Liter).
7. Return ONLY the JSON object, nothing else.`;

        console.log(`[analyze-receipt] Processing receipt image analysis...`);

        const imageUrl = image.startsWith('data:')
            ? image
            : `data:${mimeType || 'image/jpeg'};base64,${image}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this fuel receipt/invoice and extract the fuel amount, cost, currency, and station name.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[analyze-receipt] OpenAI API Error:', response.status, errorText);
            return new Response(
                JSON.stringify({ error: `OpenAI API Error (${response.status})`, details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();

        console.log(`[analyze-receipt] Raw AI response:`, content);

        let result;
        try {
            const cleanContent = content.replace(/^```json\n|\n```$/g, '').trim();
            result = JSON.parse(cleanContent);
        } catch (_e) {
            console.error('[analyze-receipt] JSON Parse Error:', content);
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI analysis', raw: content }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[analyze-receipt] Extracted: ${result.liters}L, ${result.cost} ${result.currency}, confidence: ${result.confidence}`);

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[analyze-receipt] Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
