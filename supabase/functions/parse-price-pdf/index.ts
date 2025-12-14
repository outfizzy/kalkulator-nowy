import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
// Warning: pdf-parse might not work perfectly in Deno due to node deps.
// Using a simpler text extractor or just sending raw bytes if OpenAI supported files (it does via Assistants API but costly/slow for this).
// Better approach for Deno: 'pdf-lib' for manipulation, but extracting text is tricky.
// Trying 'pdf-parse' via esm.sh which pollyfills node.
import pdf from "https://esm.sh/pdf-parse@1.1.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file')

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 1. Extract Text from PDF
        // Note: buffer() returns ArrayBuffer, pdf-parse needs Buffer (Node)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        // pdf-parse relies on Node 'Buffer'. We might need a polyfill or just pass the Uint8Array if it accepts.
        // Documentation says it accepts Buffer.
        // Let's try to extract text. If this fails, I might need to use a different strategy (e.g. OpenAI Vision by sending screenshots from frontend, but frontend PDF->Image is also heavy).
        // Let's assume for now the PDF is text-selectable.

        let textContent = "";
        try {
            const data = await pdf(buffer);
            textContent = data.text;
        } catch (e) {
            console.error("PDF Parse Error:", e);
            // Fallback: If pdf-parse fails in Deno, we might need an external service or a different lib.
            // For this task, I'll proceed hoping it works or return mock if it fails for testing.
            return new Response(
                JSON.stringify({ error: 'Failed to read PDF text. Ensure it is a text PDF.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Truncate if too long (GPT-4o limits)
        const truncatedText = textContent.slice(0, 50000); // 50k chars is plenty for a page

        // 2. Call OpenAI
        const apiKey = Deno.env.get('OPENAI_API_KEY')
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
               "entries": [
                  { "width_mm": number, "projection_mm": number, "price": number }
               ]
            }
            
            Rules:
            - "Width" is usually the top header (values like 2000, 2500, 3000...).
            - "Projection" (or Drop/Ausfall/Tiefe) is the side header (1500, 2000, 2500...).
            - Prices are numbers (eur). Remove currency symbols.
            - Provide at least 20 detectable entries if possible.
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

        const aiData = await response.json()

        if (aiData.error) {
            throw new Error(aiData.error.message)
        }

        const content = JSON.parse(aiData.choices[0].message.content);

        return new Response(
            JSON.stringify(content),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
