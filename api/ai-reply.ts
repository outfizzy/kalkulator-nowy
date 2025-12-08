
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { originalText, intent, apiKey } = req.body;
    const userKey = apiKey || process.env.OPENAI_API_KEY;

    if (!text || !intent) {
        // Allow text to be named 'originalText' or 'text' for flexibility
    }

    const textToAnalyze = originalText || req.body.text;

    if (!textToAnalyze || !intent) {
        return res.status(400).json({ error: 'Original text and intent are required' });
    }

    if (!userKey) {
        return res.status(401).json({ error: 'OpenAI API Key not configured' });
    }

    const systemPrompt = `Jesteś asystentem biurowym pomagającym odpisywać na e-maile.
Twoim zadaniem jest wygenerowanie odpowiedzi na podstawie otrzymanej wiadomości.
Utrzymuj profesjonalny, uprzejmy ton.
Formatuj odpowiedź tak, aby była gotowa do wysłania (bez nagłówków typu "Temat:", tylko treść).

Otrzymasz treść oryginalnego maila oraz "Intencję" (np. "Potwierdź", "Odmów", "Poproś o szczegóły").
Dostosuj odpowiedź do tej intencji i kontekstu wiadomości.`;

    const userContent = `Treść otrzymanego maila:\n"${textToAnalyze}"\n\nIntencja odpowiedzi:\n"${intent}"\n\nNapisz propozycję odpowiedzi:`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('OpenAI Error:', errData);
            return res.status(500).json({ error: 'OpenAI API Error', details: errData });
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content?.trim();

        return res.status(200).json({ reply });

    } catch (error: any) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
}
