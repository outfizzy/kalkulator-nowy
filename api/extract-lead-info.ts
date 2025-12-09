import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, apiKey: userKey } = req.body;

    const apiKey = userKey || process.env.OPENAI_API_KEY;

    if (!text || !apiKey) {
        return res.status(400).json({ error: 'Missing text or API Key (User or System)' });
    }

    const systemPrompt = `Jesteś asystentem handlowym. Twoim zadaniem jest wyciągnięcie danych klienta z treści wiadomości e-mail.
Zwróć TYLKO czysty obiekt JSON (bez znaczników markdown \`\`\`json) z następującymi polami:
- firstName (string, imię, zgadnij jeśli nie ma wprost)
- lastName (string, nazwisko)
- companyName (string, nazwa firmy)
- phone (string, numer telefonu)
- email (string, adres email, jeśli jest w treści - inny niż nadawca)
- address (string, ulica i numer domu)
- postalCode (string, kod pocztowy)
- city (string, miasto)
- notes (string, krótkie podsumowanie o co chodzi w mailu w 1-2 zdaniach)

Jeśli jakiegoś pola nie możesz znaleźć, zostaw pusty string "". Nie zmyślaj danych.`;

    try {
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
                temperature: 0.3 // Lower temperature for more deterministic extraction
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('OpenAI Error:', err);
            return res.status(response.status).json({ error: err.error?.message || 'OpenAI API Error' });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();

        let leadData;
        try {
            // Clean up basic markdown code blocks if AI ignores instruction
            const cleanContent = content.replace(/^```json\n|\n```$/g, '');
            leadData = JSON.parse(cleanContent);
        } catch (e) {
            console.error('JSON Parse Error', content);
            return res.status(500).json({ error: 'Failed to parse AI response', raw: content });
        }

        return res.status(200).json({ leadData });

    } catch (error: any) {
        console.error('AI Extract Error:', error);
        return res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
}
