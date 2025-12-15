import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { Buffer } from "node:buffer";
import process from "node:process";

// Polyfill Node environments for pdf-parse BEFORE importing it
globalThis.Buffer = Buffer;
globalThis.process = process;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Dynamically import pdf-parse to ensure polyfills are loaded
        const { default: pdf } = await import("https://esm.sh/pdf-parse@1.1.1");

        const formData = await req.formData()
        const file = formData.get('file')

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log("File received:", file.name, file.size);

        // 1. Extract Text from PDF
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer); // Use Node Buffer

        let textContent = "";
        try {
            console.log("Starting PDF Parse...");
            const data = await pdf(buffer);
            textContent = data.text;
            console.log("PDF Parsed, length:", textContent.length);
        } catch (e) {
            console.error("PDF Parse Error:", e);
            // Return detailed error to client
            return new Response(
                JSON.stringify({ error: `PDF Parse Failed: ${e.message || e}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Truncate if too long (GPT-4o limits)
        const truncatedText = textContent.slice(0, 50000); // 50k chars is plenty for a page

        // 2. Call OpenAI
        const apiKey = Deno.env.get('OPENAI_API_KEY')
        if (!apiKey) {
            throw new Error("Missing OPENAI_API_KEY");
        }

        console.log("Calling OpenAI...");
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a Data Extraction Assistant. 
            Extract the pricing matrix from the text provided.
            The text contains a price list for awnings/roofs (Width x Projection).
            
            Return strictly a JSON object with this structure:
            {
               "confidence": 0-100,
               "detected_product_name": "string",
               "detected_attributes": {
                   "snow_zone": "1" | "2" | "3" | null,
                   "roof_type": "polycarbonate" | "glass" | null,
                   "mounting": "wall" | "free" | null
               },
               "entries": [
                  { "width_mm": number, "projection_mm": number, "price": number }
               ]
            }
            
            Rules:
            - "Width" is usually the top header (values like 2000, 2500, 3000...).
            - "Projection" (or Drop/Ausfall/Tiefe) is the side header (1500, 2000, 2500...).
            - Prices are numbers (eur). Remove currency symbols.
            - Provide at least 20 detectable entries if possible.
            - Detect Attributes from title or context:
                - Snow Zone: Look for "Schneelast", "Snow Load", "Zone 1", "Zone 2", "Zone 3/SK3". Map to "1", "2", or "3".
                - Roof Type: Look for "VSG", "Glas", "Glass" -> "glass"; "Poly", "Polycarbonat" -> "polycarbonate".
                - Mounting: "Wandmontage" -> "wall", "Freistehend" -> "free".
            - Do not include explanatory text, only the JSON.`
                    },
                    {
                        role: 'user',
                        content: truncatedText
                    }
                ],
                response_format: { type: "json_object" }
            }),
        })

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} ${errText}`);
        }

        const aiData = await response.json()
        const content = JSON.parse(aiData.choices[0].message.content);

        return new Response(
            JSON.stringify(content),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("Global Error:", error);
        return new Response(
            JSON.stringify({ error: `Function Error: ${error.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
