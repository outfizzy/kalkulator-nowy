import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'buero@polendach24.de';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

// --- Token Management ---

async function getValidAccessToken(): Promise<string> {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'google_calendar_tokens')
        .single();

    if (error || !data?.value) {
        throw new Error('Google Calendar not connected. Please authorize first.');
    }

    const tokens = data.value as {
        access_token: string;
        refresh_token: string;
        expires_at: number;
    };

    // Check if token is expired (with 5 min buffer)
    if (Date.now() > tokens.expires_at - 300_000) {
        // Refresh the token
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokens.refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        const refreshData = await refreshRes.json();

        if (!refreshRes.ok || !refreshData.access_token) {
            throw new Error('Failed to refresh Google token: ' + JSON.stringify(refreshData));
        }

        // Update stored tokens
        const updatedTokens = {
            ...tokens,
            access_token: refreshData.access_token,
            expires_at: Date.now() + (refreshData.expires_in * 1000),
        };

        await supabase
            .from('system_settings')
            .update({ value: updatedTokens })
            .eq('key', 'google_calendar_tokens');

        return refreshData.access_token;
    }

    return tokens.access_token;
}

// --- Event Helpers ---

function installationToGoogleEvent(installation: any) {
    const sourceType = installation.sourceType || 'contract';
    const prefix = sourceType === 'service' ? '🔧 SERWIS'
        : sourceType === 'followup' ? '🔄 DOKOŃCZENIE'
        : '🏗️ MONTAŻ';

    const clientName = [installation.client?.lastName, installation.client?.firstName].filter(Boolean).join(', ') || 'Unbekannt';
    const city = installation.client?.city || '';

    const title = `${prefix}: ${clientName}${city ? ` — ${city}` : ''}`;

    const descriptionParts = [
        installation.contractNumber ? `Umowa: ${installation.contractNumber}` : null,
        installation.productSummary ? `Produkt: ${installation.productSummary}` : null,
        installation.title ? `Tytuł: ${installation.title}` : null,
        installation.notes ? `Notatki: ${installation.notes}` : null,
        `Status: ${installation.status || 'scheduled'}`,
        `\n---\nSynchronizacja z Polendach24 CRM`,
    ].filter(Boolean).join('\n');

    const address = [
        installation.client?.address,
        installation.client?.postalCode,
        installation.client?.city,
    ].filter(Boolean).join(', ');

    const scheduledDate = installation.scheduledDate;
    const duration = installation.expectedDuration || 1;

    // For multi-day installations
    const startDate = scheduledDate;
    const endDateObj = new Date(scheduledDate);
    endDateObj.setDate(endDateObj.getDate() + duration);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Color IDs: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
    const colorId = sourceType === 'service' ? '6' // Orange
        : sourceType === 'followup' ? '10' // Green
        : '9'; // Blue

    return {
        summary: title,
        description: descriptionParts,
        location: address || undefined,
        start: { date: startDate },
        end: { date: endDate },
        colorId,
        extendedProperties: {
            private: {
                crm_installation_id: installation.id,
                crm_source_type: sourceType,
            }
        }
    };
}

// --- Handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const accessToken = await getValidAccessToken();

        if (req.method === 'POST') {
            // CREATE or UPDATE a Google Calendar event
            const { installation, googleEventId } = req.body;

            if (!installation || !installation.scheduledDate) {
                return res.status(400).json({ error: 'Missing installation data or scheduled date' });
            }

            const event = installationToGoogleEvent(installation);

            if (googleEventId) {
                // UPDATE existing event
                const updateRes = await fetch(
                    `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${googleEventId}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(event),
                    }
                );

                if (!updateRes.ok) {
                    const errBody = await updateRes.text();
                    console.error('[GCal Sync] Update failed:', errBody);
                    // If event not found, create new one
                    if (updateRes.status === 404) {
                        const createRes = await fetch(
                            `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(event),
                            }
                        );
                        const newEvent = await createRes.json();
                        return res.status(200).json({ eventId: newEvent.id, action: 'created' });
                    }
                    return res.status(500).json({ error: 'Failed to update event', details: errBody });
                }

                const updated = await updateRes.json();
                return res.status(200).json({ eventId: updated.id, action: 'updated' });
            } else {
                // CREATE new event
                const createRes = await fetch(
                    `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(event),
                    }
                );

                if (!createRes.ok) {
                    const errBody = await createRes.text();
                    console.error('[GCal Sync] Create failed:', errBody);
                    return res.status(500).json({ error: 'Failed to create event', details: errBody });
                }

                const created = await createRes.json();
                return res.status(200).json({ eventId: created.id, action: 'created' });
            }
        }

        if (req.method === 'DELETE') {
            // DELETE a Google Calendar event
            const { googleEventId } = req.body;

            if (!googleEventId) {
                return res.status(400).json({ error: 'Missing googleEventId' });
            }

            const deleteRes = await fetch(
                `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${googleEventId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                }
            );

            if (!deleteRes.ok && deleteRes.status !== 404) {
                const errBody = await deleteRes.text();
                console.error('[GCal Sync] Delete failed:', errBody);
                return res.status(500).json({ error: 'Failed to delete event' });
            }

            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const action = req.query.action as string;

            if (action === 'status') {
                // Check connection status
                return res.status(200).json({ connected: true, calendarId: GOOGLE_CALENDAR_ID });
            }

            if (action === 'events') {
                // Lightweight: return raw GCal events for a date range (no AI parsing)
                const timeMin = (req.query.timeMin as string) || new Date().toISOString();
                const timeMax = (req.query.timeMax as string) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

                const listUrl = `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?maxResults=100&singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime`;

                const eventsRes = await fetch(listUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });

                if (!eventsRes.ok) {
                    const errBody = await eventsRes.text();
                    console.error('[GCal Events] Failed:', errBody);
                    return res.status(500).json({ error: 'Failed to fetch events' });
                }

                const eventsData = await eventsRes.json();
                const allEvents = (eventsData.items || []).filter((e: any) =>
                    !e.extendedProperties?.private?.crm_installation_id && e.status !== 'cancelled'
                );

                return res.status(200).json({ events: allEvents });
            }

            if (action === 'pull') {
                // Pull events from Google Calendar (incremental sync)
                const { data: syncData } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'google_calendar_sync_token')
                    .single();

                const syncToken = syncData?.value?.syncToken;

                let url = `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?maxResults=50&singleEvents=true`;
                if (syncToken) {
                    url += `&syncToken=${syncToken}`;
                } else {
                    // First sync: only get future events
                    const now = new Date().toISOString();
                    url += `&timeMin=${now}`;
                }

                const eventsRes = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });

                if (eventsRes.status === 410) {
                    // Sync token expired, reset
                    await supabase.from('system_settings').delete().eq('key', 'google_calendar_sync_token');
                    return res.status(200).json({ events: [], needsFullSync: true });
                }

                if (!eventsRes.ok) {
                    const errBody = await eventsRes.text();
                    console.error('[GCal Pull] Failed:', errBody);
                    return res.status(500).json({ error: 'Failed to pull events' });
                }

                const eventsData = await eventsRes.json();

                // Save new sync token
                if (eventsData.nextSyncToken) {
                    await supabase.from('system_settings').upsert({
                        key: 'google_calendar_sync_token',
                        value: { syncToken: eventsData.nextSyncToken },
                    }, { onConflict: 'key' });
                }

                // Filter to only CRM-related events (those with our extendedProperties)
                const crmEvents = (eventsData.items || []).filter((e: any) =>
                    e.extendedProperties?.private?.crm_installation_id
                );

                return res.status(200).json({
                    events: crmEvents,
                    allEvents: eventsData.items || [],
                    nextSyncToken: eventsData.nextSyncToken,
                });
            }

            if (action === 'import') {
                // Import: pull events, filter unlinked, AI parse, match customers
                const now = new Date();
                // Look back 30 days and forward 90 days
                const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

                const listUrl = `${GCAL_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?maxResults=100&singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime`;
                
                const eventsRes = await fetch(listUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });

                if (!eventsRes.ok) {
                    const errBody = await eventsRes.text();
                    console.error('[GCal Import] Failed to list events:', errBody);
                    return res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
                }

                const eventsData = await eventsRes.json();
                const allEvents = eventsData.items || [];

                // Filter: only events WITHOUT crm_installation_id (not yet linked)
                const unlinkdEvents = allEvents.filter((e: any) =>
                    !e.extendedProperties?.private?.crm_installation_id
                );

                if (unlinkdEvents.length === 0) {
                    return res.status(200).json({ events: [], message: 'All events are already linked' });
                }

                // Call AI Edge Function to parse event text
                let parsed: any[] = [];
                try {
                    const parseRes = await fetch(`${supabaseUrl}/functions/v1/gcal-parse-event`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({ events: unlinkdEvents }),
                    });

                    if (parseRes.ok) {
                        const parseData = await parseRes.json();
                        parsed = parseData.parsed || [];
                    } else {
                        console.error('[GCal Import] AI parse failed:', await parseRes.text());
                    }
                } catch (parseErr) {
                    console.error('[GCal Import] AI parse error:', parseErr);
                }

                // Match each parsed event against existing customers & contracts
                const results = [];
                for (let i = 0; i < unlinkdEvents.length; i++) {
                    const googleEvent = unlinkdEvents[i];
                    const parsedData = parsed[i] || {
                        firstName: null, lastName: null, city: null, address: null,
                        postalCode: null, phone: null, email: null, contractNumber: null,
                        productSummary: null, eventType: 'unknown', notes: null, durationDays: 1,
                    };

                    let match: { type: string; customerId?: string; contractId?: string; contractNumber?: string; customerName?: string } | null = null;

                    // Try matching by contract number first (most reliable)
                    if (parsedData.contractNumber) {
                        const { data: contractMatch } = await supabase
                            .from('contracts')
                            .select('id, contract_number, customer_id')
                            .ilike('contract_number', `%${parsedData.contractNumber}%`)
                            .limit(1)
                            .single();

                        if (contractMatch) {
                            // Also get customer name
                            let customerName = '';
                            if (contractMatch.customer_id) {
                                const { data: custData } = await supabase
                                    .from('customers')
                                    .select('first_name, last_name')
                                    .eq('id', contractMatch.customer_id)
                                    .single();
                                if (custData) {
                                    customerName = `${custData.first_name || ''} ${custData.last_name || ''}`.trim();
                                }
                            }
                            match = {
                                type: 'contract',
                                contractId: contractMatch.id,
                                contractNumber: contractMatch.contract_number,
                                customerId: contractMatch.customer_id,
                                customerName,
                            };
                        }
                    }

                    // Try matching by customer name
                    if (!match && parsedData.lastName) {
                        let query = supabase
                            .from('customers')
                            .select('id, first_name, last_name, city')
                            .ilike('last_name', `%${parsedData.lastName}%`);

                        if (parsedData.firstName) {
                            query = query.ilike('first_name', `%${parsedData.firstName}%`);
                        }

                        const { data: customerMatches } = await query.limit(5);

                        if (customerMatches && customerMatches.length > 0) {
                            // If city also matches, prefer that
                            const cityMatch = parsedData.city
                                ? customerMatches.find((c: any) =>
                                    c.city?.toLowerCase().includes(parsedData.city.toLowerCase())
                                )
                                : null;

                            const bestMatch = cityMatch || customerMatches[0];
                            match = {
                                type: 'customer',
                                customerId: bestMatch.id,
                                customerName: `${bestMatch.first_name || ''} ${bestMatch.last_name || ''}`.trim(),
                            };
                        }
                    }

                    results.push({
                        googleEvent: {
                            id: googleEvent.id,
                            summary: googleEvent.summary,
                            description: googleEvent.description,
                            location: googleEvent.location,
                            start: googleEvent.start,
                            end: googleEvent.end,
                            htmlLink: googleEvent.htmlLink,
                        },
                        parsedData,
                        match,
                    });
                }

                return res.status(200).json({ events: results });
            }

            return res.status(400).json({ error: 'Unknown action. Use ?action=status, ?action=pull, or ?action=import' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[GCal Sync] Error:', err);
        return res.status(500).json({ error: err.message || 'Internal error' });
    }
}
