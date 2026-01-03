import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.20.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, messages } = await req.json()
    if (!question) throw new Error('No question provided')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey)
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 1. Embed user question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question.replace(/\n/g, ' '),
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Retrieve relevant context
    const { data: chunks, error: matchError } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.5, // Sensitivity
      match_count: 5 // Top 5 chunks
    });

    if (matchError) throw new Error(`Match failed: ${matchError.message}`);

    const contextText = chunks.map((chunk: any) => `Source: ${chunk.filename}\nContent: ${chunk.content}`).join('\n---\n');

    const systemPrompt = `Jesteś ekspertem technicznym od zadaszeń tarasowych i konstrukcji aluminiowych.
Twoim celem jest odpowiadać na pytania handlowców PRECYZYJNIE i TECHNICZNIE w oparciu o dostarczoną BAZĘ WIEDZY.

Zasady:
1. Bazuj GŁÓWNIE na poniższych dokumentach ("Context"). Jeśli informacji tam nie ma, powiedz o tym wprost (np. "W instrukcjach nie znalazłem info o X, ale z ogólnej wiedzy wiem...").
2. Podawaj źródła (np. "Wg instrukcji montażu Trendstyle...").
3. Bądź konkretny. Podawaj wymiary, kąty, niutonometry, jeśli są w tekście.
4. Odpowiadaj po polsku.

---
Context:
${contextText}
---
`;

    // 3. Chat Completion
    const completionMessages = [
      { role: 'system', content: systemPrompt },
      ...messages || [], // History
      { role: 'user', content: question }
    ];

    // Using Stream
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: completionMessages,
      stream: true,
    });

    // Handle Streaming Response
    const body = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          controller.enqueue(new TextEncoder().encode(content))
        }
        controller.close()
      },
    })

    return new Response(body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
