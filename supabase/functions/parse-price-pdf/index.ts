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
Twój cel: Przeanalizuj przesłany obrazek (wycinek tabeli) i wyciągnij z niego WSZYSTKIE dane w formacie JSON.

            CRITICAL RULES (READ CAREFULLY):
            1. **EXHAUSTIVE EXTRACTION**: You MUST extract **EVERY SINGLE ROW** visible in the image. Do NOT skip rows. Do NOT summarize.
            2. **ROOF TYPE DETECTION (CRITICAL)**:
               - IF headers contain: "VSG", "ESG", "Glas", "Glass", "8mm", "10mm", "Verbundsicherheitsglas", "Szkło", "Hartglas" -> Set "roof_type": "glass".
               - IF headers contain: "Poly", "Policarbonat", "Stegplatten", "16mm", "Poliwęglan" -> Set "roof_type": "polycarbonate".
               - DEFAULT to null if unsure, but PREFER detection based on keywords.
            3. **ALL COLUMNS**: Look for ALL columns that indicate a price adder/surcharge (e.g. "Opal", "Matt", "VSG", "Dopłata").
            4. **ACCURACY**: Prefer accurate extraction over speed.
             5. **9-COLUMN GLASS TABLE SPECIAL RULE**:
               - If you see columns like: "dimension", "price incl. 44.2 clear", "44.2 mm incl. roof filling clear", "Standard included", "Surcharge glass 44.2 matt/opal", "Surcharge glass 55.2 sun protection", "number fields", "Post", "surface":
                 - Map "price incl. 44.2 clear" -> 'price' (Total Price) and also 'glass_price'.
                 - Map "Standard included" -> Ignore price (it's 0), but note it.
                 - Map "Surcharge glass 44.2 matt/opal" -> Add to 'properties.surcharges' list as "Matt/Opal".
                 - Map "Surcharge glass 55.2" -> Add to 'properties.surcharges' list as "Sun Protection 55.2".
                 - Map "Post" -> 'posts_count'.
                 - Map "number fields" -> 'fields_count'.
                 - Map "surface" -> 'area_m2'.

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
                                "area_m2": number | null,
                                "surcharges": { "name": string, "price": number }[]
                            }
                          }
                       ],
                       "notes": "string"
                   }
               ]
            }
            
            Mapping Rules:
            1. **Dimensions**: "Maß" / "Breite" / "Tiefe" -> width_mm, projection_mm.
            2. **Structure Price** (structure_price): Look for "Gestell", "Konstruktion", "System", "Bausatz".
            3. **Roof Price** (glass_price): Look for "Dach", "Poly", "Glas", "Platten", "Eindeckung", "VSG".
               - **IMPORTANT**: The system uses 'glass_price' as a generic field for ANY roof material price.
               - If the table is Polycarbonate, put the Poly price into 'glass_price'.
               - If the table is Glass, put the Glass price into 'glass_price'.
            4. **Total Price** (price): Look for "Komplett", "Gesamt", "Preis" (if only one price column).
               - If separate Structure/Roof columns exist, 'price' should be their SUM (if valid) or 0 (letting system calculate).
            5. **Attributes**: 
               - "Pfosten" / "Słupy" -> posts_count
               - "Felder" / "Pola" -> fields_count
               - "Fläche" / "Area" / "m2" -> area_m2 (Required if visible)
            6. **Surcharges (CRITICAL)**: 
               - Scan headers for words like: "Aufpreis", "Opal", "Matt", "Bronze", "Poly", "VSG", "Surcharge", "Dodatek".
               - If a column contains price adders (e.g. +50, +100), extract explicitly to 'surcharges' array.
            7. **SWAP PREVENTION**: Do NOT swap Structure and Roof prices. "Gestell" is ALWAYS structure.`;

            requestContent = [
                { type: "text", text: "Analyze this pricing table image. Extract Dimensions, Prices, Structural Specs (Posts/Fields/Area), and Surcharges." },
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
                    JSON.stringify({ error: `PDF Parse Failed: ${e.message || e} ` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                )
            }

            const truncatedText = textContent.slice(0, 40000);
            requestContent = [{ type: "text", text: truncatedText }];

            systemPrompt = `Jesteś wyspecjalizowanym asystentem AI do strukturyzowania cenników budowlanych(zadaszenia, ogrody zimowe).
            Twoim zadaniem jest przeanalizować tekst PDF i wyciągnąć z niego KOMPLETNE dane cenowe.

                CRITICAL: Return strictly a JSON object with this structure:
                {
                    "confidence": 0 - 100,
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
                                        "properties": {
                                            "posts_count": number | null,
                                            "fields_count": number | null,
                                            "area_m2": number | null,
                                            "surcharges": { "name": string, "price": number }[]
                                        }
                                    }
                                ],
                                "notes": "string"
                            }
                        ]
                }

            Rules:
            1. ** FIND ALL **: Look for multiple tables in the text(e.g. "Trendstyle Poly", "Trendstyle Glass", "Premium").Create a separate entry in 'tables' for each.
            2. ** EXTRACT DETAILS **: Populate properties.posts_count, fields_count, area_m2 from available columns.
            3. ** SURCHARGES **: Extract variant prices(e.g.Opal vs Clear) into properties.surcharges.
            4. ** SPLIT **: Separately categorize Polycarbonate vs Glass.`;
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
                'Authorization': `Bearer ${apiKey} `,
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
            throw new Error(`OpenAI API Error: ${response.status} ${errText} `);
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
            JSON.stringify({ error: `Function Error: ${error.message} ` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
