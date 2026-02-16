const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { text, apiKey: userKey } = body;

        // Always prefer the server-side key; user key is only a fallback
        const envKey = Deno.env.get('OPENAI_API_KEY');
        const apiKey = envKey || userKey;

        if (!text || !apiKey) {
            const missing = [];
            if (!text) missing.push('text');
            if (!apiKey) missing.push('API Key');
            return new Response(
                JSON.stringify({ error: `Missing: ${missing.join(', ')}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Strip base64 attachment data and truncate to avoid token limits
        let cleanText = text;
        // Remove base64-encoded data (common patterns in multipart email text)
        cleanText = cleanText.replace(/[A-Za-z0-9+/=]{100,}/g, '[attachment data removed]');
        // Remove data URIs
        cleanText = cleanText.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, '[embedded image removed]');
        // Truncate to max ~8000 chars (roughly 2000 tokens for gpt-4o-mini)
        if (cleanText.length > 8000) {
            cleanText = cleanText.substring(0, 8000) + '\n[...tekst skrócony]';
        }

        console.log(`Text length: original=${text.length}, cleaned=${cleanText.length}`);

        const systemPrompt = 'Jestes asystentem handlowym. Twoim zadaniem jest wyciagniecie danych klienta z tresci wiadomosci e-mail.\nZwroc TYLKO czysty obiekt JSON (bez znacznikow markdown ```json) z nastepujacymi polami:\n- firstName (string, imie, zgadnij jesli nie ma wprost)\n- lastName (string, nazwisko)\n- companyName (string, nazwa firmy)\n- phone (string, numer telefonu)\n- email (string, adres email, jesli jest w tresci - inny niz nadawca)\n- address (string, sama ulica i numer domu - BEZ kodu pocztowego i miasta)\n- postalCode (string, kod pocztowy, np. 12-345 lub 12345)\n- city (string, miasto)\n- notes (string, krotkie podsumowanie o co chodzi w mailu w 1-2 zdaniach)\n\nJesli jakiegos pola nie mozesz znalezc, zostaw pusty string "". Nie zmyslaj danych.\nDla adresu: oddziel ulice od miasta. Kod pocztowy zawsze osobno.';

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
                    { role: 'user', content: `Tresc maila:\n${cleanText}` }
                ],
                temperature: 0.3
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error:', response.status, errorText);
            return new Response(
                JSON.stringify({ error: `OpenAI API Error (${response.status})`, details: errorText }),
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

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
