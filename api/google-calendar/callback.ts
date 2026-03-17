import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://polendach24.app/api/google-calendar/callback';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * OAuth2 callback — exchanges auth code for tokens and stores them.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const returnUrl = (req.query.state as string) || '/settings';

    if (error) {
        console.error('[Google OAuth] Error:', error);
        return res.redirect(302, `${returnUrl}?gcal_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect(302, `${returnUrl}?gcal_error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok || !tokens.access_token) {
            console.error('[Google OAuth] Token exchange failed:', tokens);
            return res.redirect(302, `${returnUrl}?gcal_error=token_exchange_failed`);
        }

        // Store tokens in Supabase settings table
        const { error: dbError } = await supabase
            .from('system_settings')
            .upsert({
                key: 'google_calendar_tokens',
                value: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: Date.now() + (tokens.expires_in * 1000),
                    token_type: tokens.token_type,
                    scope: tokens.scope,
                    connected_at: new Date().toISOString(),
                },
            }, { onConflict: 'key' });

        if (dbError) {
            console.error('[Google OAuth] DB save error:', dbError);
            return res.redirect(302, `${returnUrl}?gcal_error=db_save_failed`);
        }

        console.log('[Google OAuth] Successfully connected Google Calendar');
        return res.redirect(302, `${returnUrl}?gcal_connected=true`);
    } catch (err) {
        console.error('[Google OAuth] Unexpected error:', err);
        return res.redirect(302, `${returnUrl}?gcal_error=unexpected`);
    }
}
