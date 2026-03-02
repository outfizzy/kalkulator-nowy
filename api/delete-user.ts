import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId in request body' });
    }

    try {
        // Try multiple env var names (VITE_ prefix is for client-side Vite, may not be set server-side)
        const supabaseUrl = process.env.VITE_SUPABASE_URL
            || process.env.SUPABASE_URL
            || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing env vars:', {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseServiceKey,
                availableVars: Object.keys(process.env).filter(k =>
                    k.includes('SUPABASE') || k.includes('VITE')
                )
            });
            return res.status(500).json({ error: 'Server misconfiguration: missing Supabase credentials' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Verify the caller is an admin
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error('Token verification failed:', authError?.message, 'URL used:', supabaseUrl);
            return res.status(401).json({
                error: 'Invalid token',
                details: authError?.message || 'Token verification failed'
            });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized: Admin access required' });
        }

        // Delete the user from Auth (this requires service role key)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('Auth delete error:', deleteError);
            throw deleteError;
        }

        // Also ensure profile is deleted if not cascaded (safe to try)
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Delete user error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
