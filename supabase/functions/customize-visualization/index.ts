
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { prompt, image, mask } = await req.json();

        if (!prompt || !image || !mask) {
            throw new Error('Missing required fields: prompt, image, mask');
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error('Missing OPENAI_API_KEY');
        }

        const openai = new OpenAI({ apiKey });

        // Helper to convert base64 to File object (for OpenAI SDK)
        const base64ToFile = (base64: string, filename: string) => {
            const arr = base64.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
        };

        const imageFile = base64ToFile(image, 'image.png');
        const maskFile = base64ToFile(mask, 'mask.png');

        console.log(`Sending request to OpenAI... Prompt: ${prompt}`);

        const response = await openai.images.edit({
            image: imageFile,
            mask: maskFile,
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "url", // or b64_json
        });

        console.log('OpenAI Response:', response);

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
