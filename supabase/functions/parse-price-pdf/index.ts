const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper for Base64 without node:buffer (works in all Deno envs)
function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    // Process in chunks to avoid stack overflow on very large files
    const chunkSize = 16384; // 16KB chunks
    for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
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

        if (!imageFile) {
            return new Response(
                JSON.stringify({ error: 'No image provided. Text/PDF parsing is deprecated. Please send an image.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log("Image received, size:", imageFile.size);
        const arrayBuffer = await imageFile.arrayBuffer();

        // Use the safe helper
        const base64 = arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:${imageFile.type};base64,${base64}`;

        systemPrompt = `Jesteś wyspecjalizowanym asystentem AI vision do analizy tabel cenowych.
Twój cel: Przeanalizuj przesłany obrazek (tabelę) i wyciągnij z niego WSZYSTKIE dane w formacie JSON.

            CRITICAL "PARANOID" RULES (STRICT COMPLIANCE REQUIRED):
            1. **EXTRACT EVERY SINGLE ROW**: You MUST extract **EVERY SINGLE DIMENSION COMBINATION** visible. 
               - If the table has 50 rows, return 50 entries.
               - DO NOT SKIP rows. DO NOT SUMMARIZE (e.g. "3000-7000mm"). 
               - EXTRACT EVERY SPECIFIC WIDTH AND PROJECTION.
            2. **EXTRACT ALL COLUMNS**: Scan the headers carefully. 
               - Every column that represents a price (standard, surcharge, glass, poly) MUST be extracted.
               - Look for "Aufpreis", "Surcharge", "Dopłata", "+", "Opal", "Matt", "LED", "VSG".
               - If a column is a price adder, add it to 'properties.surcharges'.
            3. **ROOF TYPE DETECTION**:
               - Keywords: "Glas/Glass/VSG/8mm/10mm" -> "glass". "Poly/Policarbonat/16mm" -> "polycarbonate".
            4. **STRUCTURAL DETAILS**:
               - "Pfosten" / "Słupy" -> 'posts_count'.
               - "Felder" / "Pola" -> 'fields_count'.
               - "Fläche" / "Area" / "m2" -> 'area_m2'.

            SPECIAL RULE FOR "9-COLUMN GLASS TABLE":
            If headers are complex (e.g. "Price incl. 44.2", "Surcharge 44.2 Matt", "Surcharge 55.2"):
            - The "Price incl..." is the 'price' (Total).
            - "Surcharge ... Matt" -> Add to surcharges: { "name": "Glass 44.2 Matt", "price": X }.
            - "Surcharge ... 55.2" -> Add to surcharges: { "name": "Glass 55.2 Sun Protection", "price": X }.

            CRITICAL: Return strictly a COMPACT JSON object (minified, no whitespace) with this structure:
            {
               "confidence": 0-100,
               "tables": [
                   {
                       "detected_product_name": "string",
                       "currency": "EUR" | "PLN",
                       "detected_attributes": {
                           "snow_zone": "1" | "2" | "3",
                           "roof_type": "polycarbonate" | "glass",
                           "mounting": "wall" | "free"
                       },
                       "entries": [
                          { 
                            "w": number, // width_mm
                            "p": number, // projection_mm
                            "price": number, 
                            "g_price": number, // glass_price / roof_price
                            "props": {
                                "posts": number, // posts_count
                                "surcharges": [{ "n": "string", "v": number }] // name, price
                            }
                          }
                       ]
                   }
               ]
            }
            
            Mapping Rules (Use Short Keys for Token Efficiency):
            - Output "w" for width_mm, "p" for projection_mm.
            - Output "g_price" for glass/roof price.
            - Output "props" instead of properties.
            - Output "n" and "v" for surcharge name/value.
            - OMIT NULL or EMPTY fields completely to save space.
            - 1. **Dimensions**: "Maß" / "Breite" / "Tiefe" -> w, p.
            - 2. **Structure Price**: Look for "Gestell", "Konstruktion", "System".
            - 3. **Roof Price** (g_price): Look for "Dach", "Poly", "Glas", "Platten", "Eindeckung", "VSG".
               - The system maps 'g_price' to the correct internal field.
            - 4. **Total Price** (price): Look for "Komplett", "Gesamt", "Preis".
            - 5. **Attributes**: "Pfosten" -> props.posts. "Surcharges" -> props.surcharges.

            CRITICAL: DO NOT FORMAT THE JSON with indentation. Return a single line string to save tokens.`;

        requestContent = [
            { type: "text", text: "Analyze this table. Extract ALL rows. Use the COMPACT JSON format." },
            {
                type: "image_url",
                image_url: {
                    url: dataUrl
                }
            }
        ];

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
                response_format: { type: "json_object" },
                max_tokens: 4096
            }),
        })

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} ${errText} `);
        }

        const aiData = await response.json()
        const finishReason = aiData.choices[0].finish_reason;
        let rawContent = aiData.choices[0].message.content;

        console.log("AI Response Length:", rawContent.length);
        console.log("Finish Reason:", finishReason);

        // Sanitize: Remove markdown
        let cleanContent = rawContent.replace(/```json\n|\n```|```/g, '').trim();

        // Heuristic Repair for Truncated JSON
        if (finishReason === 'length') {
            console.warn("Response truncated! Attempting repair...");
            // Try to find the last valid object closing and append closing brackets
            // This is a naive heuristic but often works for array lists
            const lastEntryEnd = cleanContent.lastIndexOf('}');
            if (lastEntryEnd > -1) {
                cleanContent = cleanContent.substring(0, lastEntryEnd + 1) + ']}]}';
            }
        }

        // Parse with mapped short keys
        let compactContent = JSON.parse(cleanContent);

        // Transform back to Full Keys for frontend compatibility
        if (compactContent.tables) {
            compactContent.tables = compactContent.tables.map((table: any) => ({
                ...table,
                entries: table.entries.map((e: any) => ({
                    width_mm: e.w,
                    projection_mm: e.p,
                    price: e.price,
                    glass_price: e.g_price,
                    properties: {
                        posts_count: e.props?.posts,
                        fields_count: e.props?.fields,
                        area_m2: e.props?.area,
                        surcharges: e.props?.surcharges?.map((s: any) => ({ name: s.n, price: s.v }))
                    }
                }))
            }));
        }

        const content = compactContent;

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
