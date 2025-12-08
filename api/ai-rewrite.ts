import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, prompt, apiKey: userKey } = req.body;

    const apiKey = userKey || process.env.OPENAI_API_KEY;

    if (!text || !apiKey) {
        return res.status(400).json({ error: 'Missing text or API Key (User or System)' });
    }

    // Default instruction
    const systemPrompt = `Jesteś asystentem biurowym poprawiającym e-maile. Popraw styl, gramatykę i ton wiadomości. Utrzymuj profesjonalny, ale uprzejmy ton. Zwróć tylko poprawioną treść wiadomości, bez dodatkowych komentarzy. Jeśli użytkownik podał instrukcję, zastosuj się do niej.`;

    const userContent = prompt
        ? `Instrukcja: ${prompt}\n\nTreść do poprawy:\n${text}`
        : `Treść do poprawy:\n${text}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost effective and fast
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('OpenAI Error:', err);
            return res.status(response.status).json({ error: err.error?.message || 'OpenAI API Error' });
        }

        const data = await response.json();
        const rewritten = data.choices[0]?.message?.content?.trim();

        return res.status(200).json({ rewritten });

    } catch (error: any) {
        console.error('AI Rewrite Error:', error);
        return res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
}
