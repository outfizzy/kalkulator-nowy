import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// System Prompt
const SYSTEM_PROMPT = `
Jesteś Wirtualnym Asystentem Sprzedaży w firmie zajmującej się zadaszeniami aluminiowymi (tarasowymi), ogrodami zimowymi i systemami osłonowymi (markizy, refleksole).
Twoim celem jest pomaganie pracownikom (Adminom, Managerom, Handlowcom) w ich codziennej pracy.

Twoje kompetencje:
1. Wiedza techniczna: Wiesz wszystko o konstrukcjach aluminiowych, szkle VSG, poliwęglanie, obciążeniach śniegiem.
2. Kalkulacje: Potrafisz przeliczać wymiary szkła dla danego dachu (używając dostępnych narzędzi).
3. Pisanie maili: Potrafisz redagować profesjonalne maile do klientów niemeickojęzycznych i polskich.
4. Wizualizacje: Możesz zlecić generowanie wizualizacji (Tool: generate_visualization - TODO).

Styl komunikacji: Profesjonalny, zwięzły, pomocny. W języku polskim.

Jeśli użytkownik pyta o wymiary szkła, ZAWSZE używaj narzędzia 'calculate_glass'.
Jeśli użytkownik prosi o maila, przygotuj gotowy draft.
`;

// Tools Schema
const tools = [
    {
        type: "function",
        function: {
            name: "calculate_glass",
            description: "Oblicz wymiary i ilość potrzebnych szyb dla zadaszenia.",
            parameters: {
                type: "object",
                properties: {
                    roofWidth: { type: "number", description: "Szerokość całkowita zadaszenia w mm" },
                    roofProjection: { type: "number", description: "Wysięg/Głębokość zadaszenia w mm" },
                    rafterCount: { type: "number", description: "Liczba krokwi (opcjonalne)" }
                },
                required: ["roofWidth", "roofProjection"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_visualization",
            description: "Wygeneruj wizualizację zadaszenia na podstawie opisu.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Opis wizualizacji (np. nowoczesny taras z szklanym dachem)" }
                },
                required: ["prompt"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "estimate_price",
            description: "Oszacuj cenę zadaszenia (bardzo przybliżona).",
            parameters: {
                type: "object",
                properties: {
                    width: { type: "number" },
                    projection: { type: "number" },
                    model: { type: "string", description: "Model (Basic, Premium, Glass)" }
                },
                required: ["width", "projection"]
            }
        }
    }
];

// Tool Implementations
function calculateGlass(args: any) {
    const { roofWidth, roofProjection, rafterCount } = args;
    const divisions = rafterCount ? (rafterCount - 1) : Math.ceil(roofWidth / 800);
    const actualRafterCount = divisions + 1;

    return JSON.stringify({
        numberOfPanels: divisions,
        approxPanelWidth: Math.floor((roofWidth - (actualRafterCount * 60)) / divisions),
        length: roofProjection - 50,
        note: "Wymiary orientacyjne. Sprawdź specyfikację."
    });
}

function estimatePrice(args: any) {
    const { width, projection, model } = args;
    // Mock logic - strictly for demo
    const area = (width / 1000) * (projection / 1000);
    const baseRate = model?.toLowerCase().includes('glass') ? 450 : 300; // EUR per m2
    const price = Math.round(area * baseRate);
    return JSON.stringify({
        estimatedPrice: price,
        currency: "EUR",
        note: "Cena szacunkowa netto bez montażu."
    });
}

async function generateVisualization(args: any, openAiKey: string) {
    // Determine whether to use NanoBanana (Google) or OpenAI
    // Currently defaulting to OpenAI DALL-E 3 as NanoBanana endpoint is missing
    // But we have the key in env if needed later.
    const nanobananaKey = Deno.env.get('NANOBANANA_API_KEY');

    try {
        console.log("Generating image with prompt:", args.prompt);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `High quality architectural visualization of: ${args.prompt}. Photorealistic, sunny day.`,
                n: 1,
                size: "1024x1024"
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return JSON.stringify({
            url: data.data[0].url,
            note: "Wizualizacja wygenerowana przez AI."
        });
    } catch (e) {
        return JSON.stringify({ error: `Image generation failed: ${e.message}` });
    }
}


Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages } = await req.json();
        const apiKey = Deno.env.get('OPENAI_API_KEY');

        if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

        // 1. First Call to LLM
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ],
                tools: tools,
                tool_choice: "auto"
            }),
        });

        const data = await response.json();
        const choice = data.choices[0];
        const message = choice.message;

        // 2. Handle Tool Calls
        if (message.tool_calls) {
            const toolCalls = message.tool_calls;
            const functionResponses = [];

            for (const toolCall of toolCalls) {
                let result = "";
                const args = JSON.parse(toolCall.function.arguments);

                if (toolCall.function.name === 'calculate_glass') {
                    result = calculateGlass(args);
                } else if (toolCall.function.name === 'estimate_price') {
                    result = estimatePrice(args);
                } else if (toolCall.function.name === 'generate_visualization') {
                    result = await generateVisualization(args, apiKey);
                }

                functionResponses.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: result
                });
            }

            // 3. Second Call to LLM with results
            const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...messages,
                        message, // Assistant's tool call request
                        ...functionResponses // Tool results
                    ]
                }),
            });

            const secondData = await secondResponse.json();
            return new Response(JSON.stringify(secondData.choices[0].message), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            // No tool call, just return text
            return new Response(JSON.stringify(message), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }


    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
