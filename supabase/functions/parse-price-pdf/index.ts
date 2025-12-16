import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";
import process from "node:process";

// Polyfill Node environments for pdf-parse
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
        const formData = await req.formData()
        const file = formData.get('file')

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log("File received:", file.name, file.size);

        // 1. Extract Text from PDF using npm:pdf-parse
        // This is robust on Supabase Edge Functions (Deno)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let textContent = "";
        try {
            console.log("Starting PDF Parse (npm:pdf-parse)...");
            const data = await pdf(buffer);
            textContent = data.text;
            console.log("PDF Parsed, length:", textContent.length);
        } catch (e: any) {
            console.error("PDF Parse Error:", e);
            return new Response(
                JSON.stringify({ error: `PDF Parse Failed: ${e.message || e}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Truncate if too long (GPT-4o Tier 1 limit is 30k TPM. 40k chars ~= 10k tokens. Safe.)
        const truncatedText = textContent.slice(0, 40000);

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
                model: 'gpt-4o', // Revert to smart model for accuracy
                messages: [
                    {
                        role: 'system',
                        content: `Jesteś wyspecjalizowanym asystentem AI do strukturyzowania cenników budowlanych (zadaszenia, ogrody zimowe).
Twoim zadaniem jest przeanalizować tekst PDF i wyciągnąć z niego KOMPLETNE dane cenowe.

            Return strictly a JSON object with this structure:
            {
               "confidence": 0-100,
               "detected_product_name": "string",
               "currency": "EUR" | "PLN",
               "detected_attributes": {
                   "snow_zone": "1" | "2" | "3" | null,
                   "roof_type": "polycarbonate" | "glass" | null,
                   "mounting": "wall" | "free" | null
               },
               "entries": [
                  { 
                    "width_mm": number, 
                    "projection_mm": number, 
                    "price": number, // Total price
                    "structure_price": number, // Optional: if split
                    "glass_price": number // Optional: if split
                  }
               ],
               "surcharges": [
                  { "name": "string", "price": number, "unit": "m2" | "piece" | "lm" | "fixed" | "percent", "category": "glass" | "color" | "other" }
               ],
               "notes": "string" // Important calculation rules found
            }
            
            Rules:
            1. **Matrix**: "Width" (Maß B) is usually top header, "Projection" (Tiefe/T) side header.
               - "Preis exkl. Dacheindeckung" -> **structure_price** (Constuction only).
               - "Glas ... Preis inkl. Dacheindeckung" -> **price** (Total with standard glass).
               - "Anzahl Felder" -> rafters (fields). "Anzahl Pfosten" -> posts.
            2. **Surcharges (Dopłaty/Aufpreis)**: Look for columns starting with "Aufpreis" (Surcharge):
               - "Aufpreis Glas 44.2 matt/ milch" -> Glass Surcharge (category: glass, name: "Matt/Milch").
               - "Aufpreis Sonnenschutzglas" -> Glass Surcharge (category: glass, name: "Sonnenschutz").
               - Extract these as surcharges with price and unit (likely per m2 or fixed).
            3. **Snow Zones (Schneelast)**:
               - "1" -> "1"
               - "1&2a" -> "2" (Map combined 1&2a to Zone 2)
               - "2a&3" -> "3" (Map combined 2a&3 to Zone 3)
            4. **Currency**: Detect currency (EUR, €, PLN, zł).
            5. **Data Types**:
               - Prices: numbers only.
               - Units: "lfm" -> "lm", "Stk" -> "piece", "qm" -> "m2".`
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
