import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `
You are an expert Sales Manager AI. Your job is to score sales leads from 0 to 100 based on their probability of conversion.
Factors to consider:
- Interaction history (Last contact date, frequency).
- Notes content (Positive words like "interested", "budget", "meeting" increase score. Negative like "expensive", "wait" decrease it).
- Status ("New" starts neutral 50, "Negotiation" is high, "Contacted" depends on notes).

Return valid JSON ONLY:
{
  "score": number, // 0-100
  "summary": "Short 1-sentence rationale in Polish",
  "icon": "🔥" | "❄️" | "😐" // Fire (>70), Ice (<30), Neutral
}
`;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { lead } = await req.json();

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Prepare context for AI
        const context = `
        Lead Status: ${lead.status}
        Source: ${lead.source}
        Notes: ${lead.notes || 'No notes'}
        Last Contact: ${lead.lastContactDate || lead.createdAt}
        Customer: ${lead.customerData?.firstName} ${lead.customerData?.lastName}
        `;

        const apiKey = Deno.env.get('OPENAI_API_KEY');
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
                    { role: 'user', content: `Analyze this lead:\n${context}` }
                ],
                temperature: 0.3
            }),
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json\n|\n```/g, '');
        const result = JSON.parse(jsonStr);

        // Update Database
        await supabaseClient
            .from('leads')
            .update({
                ai_score: result.score,
                ai_summary: `${result.icon} ${result.summary}`
            })
            .eq('id', lead.id);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
