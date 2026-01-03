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

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase Service Key');
            return res.status(500).json({ error: 'Server misconfiguration' });
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
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized: Admin access required' });
        }

        // Delete the user from Auth (this is the most important part)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) throw deleteError;

        // Also ensure profile is deleted if not cascaded (safe to try)
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('Delete user error:', error);
        return res.status(500).json({ error: error.message });
    }
}
