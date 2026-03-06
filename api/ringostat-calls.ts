import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Supabase service-role client (bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Normalize a phone number for matching.
 * Handles: +49..., 0049..., 049..., 0..., raw digits.
 * Strips country codes (49, 48) and leading zeros.
 * Returns the "local" part of the number (e.g. "1711234567").
 */
function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    // Strip all non-digit characters
    let p = phone.replace(/\D/g, '');
    // Remove leading 00 (international prefix)
    if (p.startsWith('00')) p = p.substring(2);
    // Remove leading country codes (49=Germany, 48=Poland)
    if ((p.startsWith('49') || p.startsWith('48')) && p.length > 9) p = p.substring(2);
    // Remove leading 0 (national prefix)
    if (p.startsWith('0')) p = p.substring(1);
    return p;
}

/**
 * Clean a Ringostat caller/dst field.
 * Removes SIP identifiers and extracts the phone number.
 */
function cleanCallerId(id: string): string {
    if (!id) return '';
    const match = id.match(/<([^>]+)>/);
    const cleaned = match ? match[1] : id.replace(/['"]/g, '').trim();
    // Hide SIP technical identifiers
    if (cleaned.toLowerCase().includes('tgametalcom') || cleaned.toLowerCase().includes('rspmob')) {
        return '';
    }
    return cleaned;
}

/**
 * Check if a number is an internal PBX extension (1-4 digits).
 */
function isInternal(num: string): boolean {
    return num.length > 0 && num.length <= 4 && /^\d+$/.test(num);
}

/**
 * Generate a deterministic ID for a Ringostat call (for deduplication).
 */
function makeRingostatId(calldate: string, caller: string, dst: string): string {
    return crypto.createHash('md5').update(`${calldate}|${caller}|${dst}`).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const doSync = req.query.sync === 'true' || req.method === 'POST';

        // --- Date range ---
        const dateFrom = (req.query.date_from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateTo = (req.query.date_to as string) || new Date().toISOString().split('T')[0];

        // --- Fetch calls from Ringostat ---
        const projectId = '103713';
        const authKey = '9rHWrjnNdwnHHC1Nz9dwd7x4B9vjfNjX';
        const fields = 'calldate,caller,dst,disposition,billsec,recording';
        const ringostatUrl = `https://api.ringostat.net/calls/list?from=${dateFrom} 00:00:00&to=${dateTo} 23:59:59&export_type=json&fields=${fields}`;

        const response = await fetch(ringostatUrl, {
            method: 'GET',
            headers: {
                'Auth-key': authKey,
                'Project-Id': projectId,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Ringostat API error: ${response.status}`);

        interface CallData {
            calldate: string;
            caller: string;
            dst: string;
            disposition: string;
            billsec: number;
            recording: string;
            [key: string]: any;
        }

        const rawCalls: CallData[] = await response.json();

        // --- Process calls ---
        const processedCalls: Array<{
            id: string;
            ringostat_id: string;
            date: string;
            duration: number;
            caller: string;
            callee: string;
            caller_normalized: string;
            callee_normalized: string;
            status: 'answered' | 'missed';
            direction: 'incoming' | 'outgoing';
            recording?: string;
            internal_extension: string;
            client_number: string;
            disposition: string;
            employee_caller_id?: string;
            utm_source?: string;
            utm_medium?: string;
            wait_time?: number;
            uniqueid?: string;
        }> = [];

        for (const call of rawCalls) {
            const cleanCaller = cleanCallerId(call.caller);
            const cleanDst = cleanCallerId(call.dst);
            const ringostatId = makeRingostatId(call.calldate, call.caller, call.dst);

            // Determine direction
            let direction: 'incoming' | 'outgoing' = 'incoming';
            if (isInternal(cleanCaller)) {
                direction = 'outgoing';
            } else if (isInternal(cleanDst)) {
                direction = 'incoming';
            } else {
                direction = !cleanCaller && cleanDst ? 'outgoing' : 'incoming';
            }

            const internalNum = direction === 'outgoing' ? cleanCaller : cleanDst;
            const clientNum = direction === 'outgoing' ? cleanDst : cleanCaller;
            const isAnswered = call.disposition === 'ANSWERED';

            processedCalls.push({
                id: ringostatId,
                ringostat_id: ringostatId,
                date: call.calldate,
                duration: call.billsec,
                caller: cleanCaller,
                callee: cleanDst,
                caller_normalized: normalizePhone(cleanCaller),
                callee_normalized: normalizePhone(cleanDst),
                status: isAnswered ? 'answered' : 'missed',
                direction,
                recording: call.recording || undefined,
                internal_extension: isInternal(internalNum) ? internalNum : '',
                client_number: clientNum,
                disposition: call.disposition,
                employee_caller_id: call.employee_caller_id || undefined,
                utm_source: call.utm_source || undefined,
                utm_medium: call.utm_medium || undefined,
                wait_time: call.wait_time || undefined,
                uniqueid: call.uniqueid || undefined
            });
        }

        // --- If sync requested: persist to DB with customer matching ---
        let syncResult = { synced: 0, matched: 0, communications_created: 0 };

        if (doSync && processedCalls.length > 0) {
            // 1. Fetch all customers for phone matching
            const { data: customers } = await supabase
                .from('customers')
                .select('id, phone, first_name, last_name');

            // 2. Fetch all leads for phone matching
            const { data: leads } = await supabase
                .from('leads')
                .select('id, phone, customer_id');

            // 3. Fetch users (profiles) for extension matching
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone');

            // Build customer phone index
            const customerPhoneMap = new Map<string, { id: string; name: string }>();
            for (const c of (customers || [])) {
                const norm = normalizePhone(c.phone);
                if (norm.length >= 7) {
                    customerPhoneMap.set(norm, {
                        id: c.id,
                        name: `${c.first_name || ''} ${c.last_name || ''}`.trim()
                    });
                }
            }

            // Build lead phone index
            const leadPhoneMap = new Map<string, { id: string; customer_id: string | null }>();
            for (const l of (leads || [])) {
                const norm = normalizePhone(l.phone);
                if (norm.length >= 7) {
                    leadPhoneMap.set(norm, { id: l.id, customer_id: l.customer_id });
                }
            }

            // Build extension → user map
            const extensionUserMap = new Map<string, { id: string; name: string }>();
            for (const p of (profiles || [])) {
                if (p.phone) {
                    // Check if phone ends with a short extension
                    const ext = p.phone.replace(/\D/g, '');
                    if (ext.length <= 4 && ext.length > 0) {
                        extensionUserMap.set(ext, { id: p.id, name: p.full_name || 'Nieznany' });
                    }
                    // Also store last 3-4 digits as potential match
                    if (ext.length > 4) {
                        extensionUserMap.set(ext.slice(-3), { id: p.id, name: p.full_name || 'Nieznany' });
                        extensionUserMap.set(ext.slice(-4), { id: p.id, name: p.full_name || 'Nieznany' });
                    }
                }
            }

            /**
             * Match a phone number against the customer map.
             * Handles partial suffix matching.
             */
            function matchCustomer(phoneNorm: string): { id: string; name: string } | null {
                if (phoneNorm.length < 7) return null;
                // Exact match
                if (customerPhoneMap.has(phoneNorm)) return customerPhoneMap.get(phoneNorm)!;
                // Suffix match (for when stored number has extra prefix or vice versa)
                for (const [stored, cust] of customerPhoneMap) {
                    if (phoneNorm.endsWith(stored) || stored.endsWith(phoneNorm)) {
                        return cust;
                    }
                }
                return null;
            }

            function matchLead(phoneNorm: string): { id: string; customer_id: string | null } | null {
                if (phoneNorm.length < 7) return null;
                if (leadPhoneMap.has(phoneNorm)) return leadPhoneMap.get(phoneNorm)!;
                for (const [stored, lead] of leadPhoneMap) {
                    if (phoneNorm.endsWith(stored) || stored.endsWith(phoneNorm)) {
                        return lead;
                    }
                }
                return null;
            }

            // 4. Fetch existing ringostat_ids to skip duplicates
            const ringostatIds = processedCalls.map(c => c.ringostat_id);
            const { data: existingCalls } = await supabase
                .from('call_log')
                .select('ringostat_id')
                .in('ringostat_id', ringostatIds.slice(0, 500)); // Supabase IN limit

            const existingIds = new Set((existingCalls || []).map(c => c.ringostat_id));

            // 5. Prepare upsert batch
            const newCallRows: any[] = [];
            const newCommRows: any[] = [];

            for (const call of processedCalls) {
                if (existingIds.has(call.ringostat_id)) continue;

                const clientNorm = normalizePhone(call.client_number);
                const customerMatch = matchCustomer(clientNorm);
                const leadMatch = matchLead(clientNorm);
                const userMatch = call.internal_extension ? extensionUserMap.get(call.internal_extension) : null;

                const customerId = customerMatch?.id || leadMatch?.customer_id || null;
                const leadId = leadMatch?.id || null;

                newCallRows.push({
                    ringostat_id: call.ringostat_id,
                    call_date: call.date,
                    caller: call.caller,
                    callee: call.callee,
                    caller_normalized: call.caller_normalized,
                    callee_normalized: call.callee_normalized,
                    direction: call.direction,
                    disposition: call.disposition,
                    duration: call.duration,
                    recording_url: call.recording || null,
                    customer_id: customerId,
                    lead_id: leadId,
                    internal_extension: call.internal_extension || null,
                    matched_user_id: userMatch?.id || null
                });

                if (customerMatch) {
                    syncResult.matched++;
                }

                // Auto-create communication entry for matched calls
                if (customerId) {
                    const repName = userMatch?.name || call.internal_extension || 'Ringostat';
                    const isAnswered = call.status === 'answered';
                    const durationStr = call.duration > 0
                        ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                        : '0s';

                    newCommRows.push({
                        customer_id: customerId,
                        lead_id: leadId,
                        type: 'call',
                        direction: call.direction === 'incoming' ? 'inbound' : 'outbound',
                        subject: isAnswered
                            ? `Połączenie ${call.direction === 'incoming' ? 'przychodzące' : 'wychodzące'} (${durationStr})`
                            : `Nieodebrane połączenie ${call.direction === 'incoming' ? 'przychodzące' : 'wychodzące'}`,
                        content: [
                            `Numer: ${call.client_number}`,
                            `Konsultant: ${repName}`,
                            `Status: ${isAnswered ? 'Odebrane' : 'Nieodebrane'}`,
                            call.duration > 0 ? `Czas trwania: ${durationStr}` : null
                        ].filter(Boolean).join('\n'),
                        date: call.date,
                        external_id: `ringostat:${call.ringostat_id}`,
                        metadata: {
                            ringostat_id: call.ringostat_id,
                            recording_url: call.recording || null,
                            duration: call.duration,
                            disposition: call.disposition,
                            internal_extension: call.internal_extension,
                            rep_name: repName,
                            source: 'ringostat_sync'
                        }
                    });
                }
            }

            // 6. Batch insert call_log
            if (newCallRows.length > 0) {
                // Insert in chunks of 100
                for (let i = 0; i < newCallRows.length; i += 100) {
                    const chunk = newCallRows.slice(i, i + 100);
                    const { error } = await supabase.from('call_log').insert(chunk);
                    if (error) console.error('call_log insert error:', error.message);
                    else syncResult.synced += chunk.length;
                }
            }

            // 7. Batch insert customer_communications (skip duplicates by external_id)
            if (newCommRows.length > 0) {
                // Check for existing external_ids to avoid duplicates
                const extIds = newCommRows.map(c => c.external_id);
                const { data: existingComms } = await supabase
                    .from('customer_communications')
                    .select('external_id')
                    .in('external_id', extIds.slice(0, 500));

                const existingExtIds = new Set((existingComms || []).map(c => c.external_id));
                const uniqueComms = newCommRows.filter(c => !existingExtIds.has(c.external_id));

                if (uniqueComms.length > 0) {
                    for (let i = 0; i < uniqueComms.length; i += 100) {
                        const chunk = uniqueComms.slice(i, i + 100);
                        const { error } = await supabase.from('customer_communications').insert(chunk);
                        if (error) console.error('customer_communications insert error:', error.message);
                        else syncResult.communications_created += chunk.length;
                    }
                }
            }
        }

        // --- Build stats response (same format as before, for backward compat) ---
        const stats = {
            total: processedCalls.length,
            answered: processedCalls.filter(c => c.status === 'answered').length,
            missed: processedCalls.filter(c => c.status === 'missed').length,
            byNumber: {} as Record<string, { total: number; answered: number; missed: number }>,
            calls: processedCalls.slice(0, 200).map(c => ({
                id: c.id,
                date: c.date,
                duration: c.duration,
                caller: c.caller,
                callee: c.callee,
                status: c.status,
                direction: c.direction,
                recording: c.recording,
                disposition: c.disposition,
                employee_caller_id: c.employee_caller_id,
                internal_extension: c.internal_extension,
                client_number: c.client_number,
                utm_source: c.utm_source,
                utm_medium: c.utm_medium,
                wait_time: c.wait_time
            })),
            sync: doSync ? syncResult : undefined
        };

        // Group by client phone number
        for (const call of processedCalls) {
            const phone = call.client_number;
            if (!stats.byNumber[phone]) {
                stats.byNumber[phone] = { total: 0, answered: 0, missed: 0 };
            }
            stats.byNumber[phone].total++;
            if (call.status === 'answered') stats.byNumber[phone].answered++;
            else stats.byNumber[phone].missed++;
        }

        return res.status(200).json(stats);

    } catch (error: unknown) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: errorMessage,
            total: 0, answered: 0, missed: 0,
            byNumber: {}, calls: []
        });
    }
}
