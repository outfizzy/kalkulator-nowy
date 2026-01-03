import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'node:buffer';
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
    const { doc_id } = await req.json()
    if (!doc_id) throw new Error('No doc_id provided')

    // Create Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey)
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 1. Get Doc Metadata
    const { data: doc, error: docError } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('id', doc_id)
      .single()

    if (docError || !doc) throw new Error('Document not found')

    // Update status to processing
    await supabase.from('knowledge_docs').update({ status: 'processing' }).eq('id', doc_id)

    // 2. Download File
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('knowledge-base')
      .download(doc.file_path)

    if (fileError) throw new Error(`Download failed: ${fileError.message}`)

    // 3. Extract Text
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)
    const text = pdfData.text

    // 4. Chunk Text
    // Simple chunking strategy: ~1000 chars overlap 100
    const chunks: string[] = []
    const chunkSize = 1000
    const overlap = 200

    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      chunks.push(text.slice(i, i + chunkSize))
    }

    console.log(`Extracted ${text.length} chars, created ${chunks.length} chunks.`)

    // 5. Generate Embeddings & Store
    let processedCount = 0;

    // Batch processing to respect rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });

      const rowsToInsert = batch.map((content, idx) => ({
        doc_id: doc_id,
        content: content.replace(/\x00/g, ''), // Sanitize
        embedding: embeddingResponse.data[idx].embedding
      }));

      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert(rowsToInsert)

      if (insertError) throw insertError;
      processedCount += batch.length;
    }

    // 6. Update Status
    await supabase.from('knowledge_docs').update({
      status: 'processed',
      error_message: null
    }).eq('id', doc_id)

    return new Response(
      JSON.stringify({ success: true, chunks: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    // Log error to DB if possible
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try to get doc_id from request body if possible (hard in catch block, assuming context)
    // Here we just return 500

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
