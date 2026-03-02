const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { image, imageWidth, imageHeight } = await req.json();

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

        const systemPrompt = `You are an expert architectural vision AI. Your task is to analyze a photo of a house/building and determine where a patio cover or pergola should be mounted.

You MUST return ONLY a valid JSON object (no markdown, no explanation) with these fields:

{
  "wall": {
    "topLeft": { "x": <pixel>, "y": <pixel> },
    "topRight": { "x": <pixel>, "y": <pixel> },
    "bottomLeft": { "x": <pixel>, "y": <pixel> },
    "bottomRight": { "x": <pixel>, "y": <pixel> }
  },
  "mountingLine": {
    "y": <pixel y-coordinate where patio cover mounts to wall, typically 70-85% of wall height>,
    "leftX": <pixel>,
    "rightX": <pixel>
  },
  "groundLine": {
    "y": <pixel y-coordinate of ground level at base of wall>
  },
  "perspective": {
    "vanishingPointX": <pixel x of horizon vanishing point>,
    "vanishingPointY": <pixel y of horizon/vanishing point>,
    "cameraAngle": <"front" | "slight_left" | "slight_right" | "left" | "right">,
    "estimatedFovDeg": <number, estimated camera field of view in degrees, typically 50-70>
  },
  "lighting": {
    "sunDirectionDeg": <number 0-360, 0=north, 90=east, 180=south, 270=west>,
    "sunElevationDeg": <number 0-90, angle above horizon>,
    "intensity": <"bright" | "medium" | "overcast">,
    "shadowSide": <"left" | "right" | "none">
  },
  "estimates": {
    "wallHeightMeters": <number, estimated real-world wall height>,
    "availableWidthMeters": <number, estimated mounting width available>,
    "groundToMountMeters": <number, height from ground to mounting line>
  },
  "confidence": <number 0-1, how confident you are in this analysis>,
  "notes": "<brief note about the photo quality or any issues>"
}

CRITICAL RULES:
1. All x/y coordinates are in PIXEL space relative to the image dimensions provided.
2. The image dimensions are: ${imageWidth || 1024}px wide × ${imageHeight || 1024}px tall.
3. The "wall" represents the main facade where the patio cover would attach.
4. The "mountingLine" is where the top beam of the patio cover meets the wall (usually about 2.2-2.5m from ground, which is around 70-80% up the wall).
5. Analyze shadows carefully to determine lighting direction.
6. If you see a door or terrace area, prefer that as the target mounting zone.
7. Return ONLY the JSON object, nothing else.`;

        console.log(`[analyze-house-photo] Processing image analysis request...`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze this house photo and determine optimal patio cover placement. Image dimensions: ${imageWidth || 1024}x${imageHeight || 1024} pixels.`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.2,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[analyze-house-photo] OpenAI API Error:', response.status, errorText);
            return new Response(
                JSON.stringify({ error: `OpenAI API Error (${response.status})`, details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();

        console.log(`[analyze-house-photo] Raw AI response length: ${content?.length}`);

        let analysis;
        try {
            const cleanContent = content.replace(/^```json\n|\n```$/g, '').trim();
            analysis = JSON.parse(cleanContent);
        } catch (_e) {
            console.error('[analyze-house-photo] JSON Parse Error:', content);
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI analysis', raw: content }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[analyze-house-photo] Analysis complete. Confidence: ${analysis.confidence}`);

        return new Response(
            JSON.stringify({ analysis }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[analyze-house-photo] Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
