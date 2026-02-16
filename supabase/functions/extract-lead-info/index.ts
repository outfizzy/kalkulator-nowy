const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, apiKey: userKey } = await req.json()

        const apiKey = userKey || Deno.env.get('OPENAI_API_KEY');

        if (!text || !apiKey) {
            return new Response(
                JSON.stringify({ error: 'Missing text or API Key (User or System)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const systemPrompt = `Jesteś asystentem handlowym. Twoim zadaniem jest wyciągnięcie danych klienta z treści wiadomości e-mail.
Zwróć TYLKO czysty obiekt JSON (bez znaczników markdown \`\`\`json) z następującymi polami:
- firstName (string, imię, zgadnij jeśli nie ma wprost)
- lastName (string, nazwisko)
- companyName (string, nazwa firmy)
- phone (string, numer telefonu)
- email (string, adres email, jeśli jest w treści - inny niż nadawca)
- address (string, sama ulica i numer domu - BEZ kodu pocztowego i miasta)
- postalCode (string, kod pocztowy, np. 12-345 lub 12345)
- city (string, miasto)
- notes (string, krótkie podsumowanie o co chodzi w mailu w 1-2 zdaniach)

Jeśli jakiegoś pola nie możesz znaleźć, zostaw pusty string "". Nie zmyślaj danych.
Dla adresu: oddziel ulicę od miasta. Kod pocztowy zawsze osobno.`;

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
                    { role: 'user', content: `Treść maila:\n${text}` }
                ],
                temperature: 0.3
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error:', errorText);
            return new Response(
                JSON.stringify({ error: 'OpenAI API Error', details: errorText }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json()
        const content = data.choices[0]?.message?.content?.trim()

        let leadData
        try {
            const cleanContent = content.replace(/^```json\n|\n```$/g, '')
            leadData = JSON.parse(cleanContent)
        } catch (e) {
            console.error('JSON Parse Error', content)
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI response', raw: content }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ leadData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
