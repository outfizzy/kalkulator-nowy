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
        const imageFile = formData.get('image');
        let requestContent: any[] = [];
        let systemPrompt = '';

        if (imageFile) {
            console.log("Image received, size:", imageFile.size);
            const arrayBuffer = await imageFile.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:${imageFile.type};base64,${base64}`;

            systemPrompt = `Jesteś wyspecjalizowanym asystentem AI vision do analizy tabel cenowych (zadaszenia, ogrody zimowe).
Twój cel: Przeanalizuj przesłany obrazek (wycinek tabeli) i wyciągnij z niego dane w formacie JSON.

            CRITICAL: Return strictly a JSON object with this structure:
            {
               "confidence": 0-100,
               "tables": [
                   {
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
                            "price": number, 
                            "structure_price": number, 
                            "glass_price": number,
                            "properties": {
                                "posts_count": number | null,
                                "fields_count": number | null,
                                "surcharges": { "name": string, "price": number }[]
                            }
                          }
                       ],
                       "notes": "string"
                   }
               ]
            }
            
            Rules:
            1. **Columns Mapping**:
               - "Maß" / Dimensions -> width_mm, projection_mm
               - "Preis" -> price (If multiple, pick the 'Included' or 'Base' price)
               - "Anzahl Pfosten" -> properties.posts_count
               - "Anzahl Felder" -> properties.fields_count
               - "Aufpreis" / Surcharge columns -> Add to properties.surcharges array (e.g. { name: "milk_glass", price: 50 })
            2. **SPLIT INTELLIGENTLY**: If the image contains data for both "Polycarbonate" and "Glass" (e.g. separate columns or sections), create TWO separate entries in the 'tables' array. One for 'polycarbonate', one for 'glass'.
            3. **Matrix**: Look for Width (top header) and Projection (side header) or vice versa.
            4. **Context**: Use heuristics. "VSG" = Glass. "Stegplatten"/"Poly" = Polycarbonate.
            5. **Currency**: Detect currency symbol (€, PLN) in headers.`;

            requestContent = [
                { type: "text", text: "Analyze this pricing table image. Extract Dimensions, Prices, Structural Specs (Posts/Fields), and Surcharges." },
                {
                    type: "image_url",
                    image_url: {
                        url: dataUrl
                    }
                }
            ];
        } else {
            // 1. Valid PDF Text Extraction (Legacy / Full File)
            const file = formData.get('file');
            if (!file) {
                return new Response(
                    JSON.stringify({ error: 'No file or image uploaded' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log("File received:", file.name, file.size);
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

            const truncatedText = textContent.slice(0, 40000);
            requestContent = [{ type: "text", text: truncatedText }];

            systemPrompt = `Jesteś wyspecjalizowanym asystentem AI do strukturyzowania cenników budowlanych (zadaszenia, ogrody zimowe).
            Twoim zadaniem jest przeanalizować tekst PDF i wyciągnąć z niego KOMPLETNE dane cenowe.
            
            CRITICAL: Return strictly a JSON object with this structure:
            {
               "confidence": 0-100,
               "tables": [
                   {
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
                            "price": number,
                            "structure_price": number,
                            "glass_price": number
                          }
                       ],
                       "surcharges": [ ... ],
                       "notes": "string"
                   }
               ]
            }
            
            Rules:
            1. **FIND ALL**: Look for multiple tables in the text (e.g. "Trendstyle Poly", "Trendstyle Glass", "Premium"). Create a separate entry in 'tables' for each.
            2. **SPLIT**: Separately categorize Polycarbonate vs Glass.`;
        }

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
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: requestContent
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
