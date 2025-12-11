import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { leadData, type, tone, apiKey: userKey } = req.body;
    const apiKey = userKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(401).json({ error: 'OpenAI API Key not configured' });
    }

    const systemPrompt = `Jesteś doświadczonym sprzedawcą B2B. Twoim zadaniem jest napisanie skutecznego e-maila do klienta.
Styl: ${tone || 'Profesjonalny'}.
Cel wiadomości: ${type || 'Ogólny kontakt'}.
Nie dodawaj tematów "Temat: ...", zwracaj samą treść wiadomości gotową do wklejenia (bez nagłówka, bez stopki jeśli nie jest konieczna).
Bądź zwięzły i konkretny.`;

    const userContent = `Dane klienta:
Imie: ${leadData.firstName || ''}
Nazwisko: ${leadData.lastName || ''}
Firma: ${leadData.companyName || ''}
Branża/Info: ${leadData.notes || 'Brak'}

Napisz wiadomość typu "${type}".`;

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
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'OpenAI API Error' });
        }

        const data = await response.json();
        const generatedText = data.choices[0]?.message?.content?.trim();

        return res.status(200).json({ generatedText });

    } catch (error: any) {
        console.error('AI Generate Error:', error);
        return res.status(500).json({ error: 'Failed to process AI request' });
    }
}
