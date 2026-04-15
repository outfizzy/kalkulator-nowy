import { supabase } from '../../lib/supabase';

export interface TeamMemberPulse {
    id: string;
    fullName: string;
    role: string;
    isOnline: boolean;
    lastSeenAt: string | null;
    todayMinutes: number;
    sessionCount: number;
    currentSessionStart: string | null;
    moduleBreakdown: { module: string; minutes: number }[];
    metrics: {
        leadsCreated: number;
        leadsViewed: number;
        leadsStatusChanged: number;
        leadsContacted: number;
        leadsWon: number;
        leadsLost: number;
        offersCreated: number;
        offersViewedByClients: number;
        callsOutbound: number;
        callsAnswered: number;
        callsMissed: number;
        callMinutes: number;
        smsSent: number;
        whatsappSent: number;
        tasksCompleted: number;
        tasksCreated: number;
        contractsSigned: number;
        contractsValue: number;
        measurementsScheduled: number;
        measurementsCompleted: number;
        installationsScheduled: number;
    };
    recentLeads: { id: string; name: string; status: string; time: string }[];
}

export interface PulseOverview {
    totalOnline: number;
    totalTeam: number;
    totalHoursToday: number;
    teamTotals: {
        leadsCreated: number;
        offersCreated: number;
        callsTotal: number;
        callMinutes: number;
        contractsSigned: number;
        contractsValue: number;
        measurementsScheduled: number;
        measurementsCompleted: number;
    };
    rankings: {
        mostLeads: { name: string; value: number } | null;
        mostCalls: { name: string; value: number } | null;
        mostOffers: { name: string; value: number } | null;
        longestWork: { name: string; value: string } | null;
        mostContracts: { name: string; value: number } | null;
        highestValue: { name: string; value: string } | null;
    };
    members: TeamMemberPulse[];
}

export const PulseService = {
    async getTeamPulse(date: Date): Promise<PulseOverview> {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        const dayStartISO = dayStart.toISOString();
        const dayEndISO = dayEnd.toISOString();
        const isToday = new Date().toDateString() === date.toDateString();

        // ═══════════════════════════════════════════════════════════
        // 1. PROFILES — active team members (not b2b/installers)
        // ═══════════════════════════════════════════════════════════
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role, is_online, last_seen_at, status')
            .in('role', ['admin', 'manager', 'sales_rep', 'sales_rep_pl'])
            .eq('status', 'active')
            .order('full_name');

        if (!profiles?.length) {
            return {
                totalOnline: 0, totalTeam: 0, totalHoursToday: 0,
                teamTotals: { leadsCreated: 0, offersCreated: 0, callsTotal: 0, callMinutes: 0, contractsSigned: 0, contractsValue: 0, measurementsScheduled: 0, measurementsCompleted: 0 },
                rankings: { mostLeads: null, mostCalls: null, mostOffers: null, longestWork: null, mostContracts: null, highestValue: null },
                members: [],
            };
        }

        const userIds = profiles.map(p => p.id);

        // ═══════════════════════════════════════════════════════════
        // 2. PARALLEL DATA FETCHES — all verified against schema
        // ═══════════════════════════════════════════════════════════
        const [
            sessionsRes,           // user_sessions (user_id, started_at, duration_minutes, is_active)
            pageViewsRes,          // page_views (user_id, module, path, duration_seconds, entered_at, left_at)
            leadsCreatedRes,       // leads created today → col: assigned_to, created_at
            leadsUpdatedRes,       // leads updated today → col: assigned_to, updated_at, status, last_contact_date, won_at
            offersCreatedRes,      // offers created today → col: user_id, created_at, status
            offersViewedRes,       // offers viewed by clients → col: user_id, last_viewed_at (timestamptz)
            callsRes,              // call_logs → col: user_id, direction, status, duration_seconds, started_at
            tasksCompletedRes,     // tasks completed → col: user_id, status='done', updated_at
            tasksCreatedRes,       // tasks created → col: created_by, created_at
            contractsRes,          // contracts → col: user_id, status, offer_id, created_at
            smsSentRes,            // sms_logs → col: user_id, direction='outbound', channel='sms', created_at
            whatsappSentRes,       // sms_logs → col: user_id, direction='outbound', channel='whatsapp', created_at
            measurementsSchedRes,  // measurements → col: sales_rep_id, scheduled_date (timestamptz!), status
            measurementsCompRes,   // measurements completed → col: sales_rep_id, completed_at (timestamptz)
            installationsRes,      // installations → col: user_id, scheduled_date (date!)
        ] = await Promise.all([
            // Sessions
            supabase.from('user_sessions')
                .select('user_id, started_at, duration_minutes, is_active')
                .in('user_id', userIds)
                .gte('started_at', dayStartISO).lte('started_at', dayEndISO)
                .order('started_at', { ascending: false }),

            // Page views (all, including active ones without duration)
            supabase.from('page_views')
                .select('user_id, module, path, duration_seconds, entered_at, left_at')
                .in('user_id', userIds)
                .gte('entered_at', dayStartISO).lte('entered_at', dayEndISO),

            // Leads CREATED today (assigned_to = owner)
            supabase.from('leads')
                .select('id, assigned_to, status, customer_data, created_at')
                .in('assigned_to', userIds)
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // Leads UPDATED today (status changes, contacts)
            supabase.from('leads')
                .select('id, assigned_to, status, customer_data, updated_at, last_contact_date, won_at')
                .in('assigned_to', userIds)
                .gte('updated_at', dayStartISO).lte('updated_at', dayEndISO),

            // Offers CREATED today (user_id = creator)
            supabase.from('offers')
                .select('user_id, status')
                .in('user_id', userIds)
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // Offers VIEWED BY CLIENTS today (last_viewed_at is timestamptz)
            supabase.from('offers')
                .select('user_id')
                .in('user_id', userIds)
                .gte('last_viewed_at', dayStartISO).lte('last_viewed_at', dayEndISO),

            // Calls (direction: text, status: text, duration_seconds: int, started_at: timestamptz)
            supabase.from('call_logs')
                .select('user_id, direction, status, duration_seconds')
                .in('user_id', userIds)
                .gte('started_at', dayStartISO).lte('started_at', dayEndISO),

            // Tasks COMPLETED today (user_id = assigned, status='done', updated_at = when completed)
            supabase.from('tasks')
                .select('user_id')
                .in('user_id', userIds)
                .eq('status', 'done')
                .gte('updated_at', dayStartISO).lte('updated_at', dayEndISO),

            // Tasks CREATED today (created_by = who created it)
            supabase.from('tasks')
                .select('created_by')
                .in('created_by', userIds)
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // Contracts (user_id = creator, status: text, offer_id: uuid)
            supabase.from('contracts')
                .select('user_id, status, offer_id')
                .in('user_id', userIds)
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // SMS sent (sms_logs: direction='outbound', channel='sms')
            supabase.from('sms_logs')
                .select('user_id')
                .in('user_id', userIds)
                .eq('direction', 'outbound').eq('channel', 'sms')
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // WhatsApp sent (sms_logs: direction='outbound', channel='whatsapp')
            supabase.from('sms_logs')
                .select('user_id')
                .in('user_id', userIds)
                .eq('direction', 'outbound').eq('channel', 'whatsapp')
                .gte('created_at', dayStartISO).lte('created_at', dayEndISO),

            // Measurements SCHEDULED for this day
            // NOTE: scheduled_date is timestamptz, so use gte/lte range, NOT eq
            supabase.from('measurements')
                .select('sales_rep_id, status')
                .in('sales_rep_id', userIds)
                .gte('scheduled_date', dayStartISO).lte('scheduled_date', dayEndISO),

            // Measurements COMPLETED today (completed_at is timestamptz)
            supabase.from('measurements')
                .select('sales_rep_id')
                .in('sales_rep_id', userIds)
                .eq('status', 'completed')
                .gte('completed_at', dayStartISO).lte('completed_at', dayEndISO),

            // Installations scheduled for this day (scheduled_date is DATE type)
            supabase.from('installations')
                .select('user_id, status')
                .in('user_id', userIds)
                .eq('scheduled_date', dayStart.toISOString().split('T')[0]),
        ]);

        // ═══════════════════════════════════════════════════════════
        // 3. CONTRACT VALUES — fetch from linked offers
        // ═══════════════════════════════════════════════════════════
        const contractOfferIds = (contractsRes.data || [])
            .filter((c: any) => c.offer_id).map((c: any) => c.offer_id);
        const offerPrices: Record<string, number> = {};
        if (contractOfferIds.length > 0) {
            const { data: op } = await supabase.from('offers')
                .select('id, pricing').in('id', contractOfferIds);
            if (op) for (const o of op) {
                const p = o.pricing as any;
                offerPrices[o.id] = p?.finalPriceNet || p?.sellingPriceNet || p?.basePrice || 0;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 4. BUILD PER-USER DATA
        // ═══════════════════════════════════════════════════════════
        const members: TeamMemberPulse[] = profiles.map(profile => {
            const uid = profile.id;

            // ── Sessions ──
            const uSessions = (sessionsRes.data || []).filter(s => s.user_id === uid);
            let todayMinutes = 0, currentSessionStart: string | null = null;
            for (const s of uSessions) {
                if (s.duration_minutes) { todayMinutes += s.duration_minutes; }
                else if (s.is_active && isToday) {
                    todayMinutes += Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000);
                    currentSessionStart = s.started_at;
                }
            }

            // ── Module breakdown ──
            const uPV = (pageViewsRes.data || []).filter(pv => pv.user_id === uid);
            const modMap: Record<string, number> = {};
            for (const pv of uPV) {
                if (!modMap[pv.module]) modMap[pv.module] = 0;
                if (pv.duration_seconds) {
                    modMap[pv.module] += Math.round(pv.duration_seconds / 60);
                } else if (!pv.left_at && isToday) {
                    modMap[pv.module] += Math.min(Math.round((Date.now() - new Date(pv.entered_at).getTime()) / 60000), 30);
                }
            }
            const moduleBreakdown = Object.entries(modMap)
                .map(([module, minutes]) => ({ module, minutes }))
                .filter(m => m.minutes >= 1)
                .sort((a, b) => b.minutes - a.minutes)
                .slice(0, 10);

            // ── Leads ──
            const uLeadsNew = (leadsCreatedRes.data || []).filter((l: any) => l.assigned_to === uid);
            const uLeadsUpd = (leadsUpdatedRes.data || []).filter((l: any) => l.assigned_to === uid);
            const leadsCreated = uLeadsNew.length;
            const leadsViewed = uPV.filter(pv =>
                pv.path?.startsWith('/leads/') && pv.path !== '/leads/new' && pv.path.length > 8
            ).length;
            const leadsStatusChanged = uLeadsUpd.length;
            // last_contact_date is timestamptz — compare with ISO range
            const leadsContacted = uLeadsUpd.filter((l: any) =>
                l.last_contact_date && l.last_contact_date >= dayStartISO && l.last_contact_date <= dayEndISO
            ).length;
            const leadsWon = uLeadsUpd.filter((l: any) =>
                l.status === 'won' && l.won_at && l.won_at >= dayStartISO
            ).length;
            const leadsLost = uLeadsUpd.filter((l: any) => l.status === 'lost').length;
            const recentLeads = uLeadsNew.map((l: any) => ({
                id: l.id,
                name: l.customer_data?.name || l.customer_data?.company || l.customer_data?.firstName
                    ? `${l.customer_data?.firstName || ''} ${l.customer_data?.lastName || ''}`.trim()
                    : 'Bez nazwy',
                status: l.status, time: l.created_at,
            })).slice(0, 5);

            // ── Offers ──
            const offersCreated = (offersCreatedRes.data || []).filter((o: any) => o.user_id === uid).length;
            const offersViewedByClients = (offersViewedRes.data || []).filter((o: any) => o.user_id === uid).length;

            // ── Calls ──
            const uCalls = (callsRes.data || []).filter((c: any) => c.user_id === uid);
            const callsOutbound = uCalls.filter((c: any) => c.direction === 'outbound').length;
            const callsAnswered = uCalls.filter((c: any) => c.direction === 'inbound' && c.status === 'completed').length;
            const callsMissed = uCalls.filter((c: any) =>
                c.direction === 'inbound' && ['no-answer', 'busy', 'failed'].includes(c.status)
            ).length;
            const callMinutes = Math.round(uCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60);

            // ── SMS & WhatsApp ──
            const smsSent = (smsSentRes.data || []).filter((s: any) => s.user_id === uid).length;
            const whatsappSent = (whatsappSentRes.data || []).filter((w: any) => w.user_id === uid).length;

            // ── Tasks ──
            const tasksCompleted = (tasksCompletedRes.data || []).filter((t: any) => t.user_id === uid).length;
            const tasksCreated = (tasksCreatedRes.data || []).filter((t: any) => t.created_by === uid).length;

            // ── Contracts ──
            const uContracts = (contractsRes.data || []).filter((c: any) => c.user_id === uid);
            const contractsSigned = uContracts.filter((c: any) => c.status === 'signed').length;
            const contractsValue = uContracts.reduce((sum: number, c: any) =>
                sum + (c.offer_id ? (offerPrices[c.offer_id] || 0) : 0), 0
            );

            // ── Measurements ──
            const measurementsScheduled = (measurementsSchedRes.data || []).filter((m: any) => m.sales_rep_id === uid).length;
            const measurementsCompleted = (measurementsCompRes.data || []).filter((m: any) => m.sales_rep_id === uid).length;

            // ── Installations ──
            const installationsScheduled = (installationsRes.data || []).filter((i: any) => i.user_id === uid).length;

            return {
                id: uid,
                fullName: profile.full_name || 'Nieznany',
                role: profile.role,
                isOnline: isToday ? (profile.is_online || false) : false,
                lastSeenAt: profile.last_seen_at,
                todayMinutes, sessionCount: uSessions.length, currentSessionStart, moduleBreakdown,
                metrics: {
                    leadsCreated, leadsViewed, leadsStatusChanged, leadsContacted, leadsWon, leadsLost,
                    offersCreated, offersViewedByClients,
                    callsOutbound, callsAnswered, callsMissed, callMinutes,
                    smsSent, whatsappSent,
                    tasksCompleted, tasksCreated,
                    contractsSigned, contractsValue,
                    measurementsScheduled, measurementsCompleted, installationsScheduled,
                },
                recentLeads,
            };
        });

        // Sort: online first, then by work time
        members.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return b.todayMinutes - a.todayMinutes;
        });

        const totalOnline = members.filter(m => m.isOnline).length;
        const totalHoursToday = Math.round(members.reduce((s, m) => s + m.todayMinutes, 0) / 60 * 10) / 10;

        const teamTotals = {
            leadsCreated: members.reduce((s, m) => s + m.metrics.leadsCreated, 0),
            offersCreated: members.reduce((s, m) => s + m.metrics.offersCreated, 0),
            callsTotal: members.reduce((s, m) => s + m.metrics.callsOutbound + m.metrics.callsAnswered, 0),
            callMinutes: members.reduce((s, m) => s + m.metrics.callMinutes, 0),
            contractsSigned: members.reduce((s, m) => s + m.metrics.contractsSigned, 0),
            contractsValue: members.reduce((s, m) => s + m.metrics.contractsValue, 0),
            measurementsScheduled: members.reduce((s, m) => s + m.metrics.measurementsScheduled, 0),
            measurementsCompleted: members.reduce((s, m) => s + m.metrics.measurementsCompleted, 0),
        };

        // Rankings (exclude admins)
        const ranked = members.filter(m => m.role !== 'admin');
        const rankings = {
            mostLeads: topNum(ranked, m => m.metrics.leadsCreated),
            mostCalls: topNum(ranked, m => m.metrics.callsOutbound + m.metrics.callsAnswered),
            mostOffers: topNum(ranked, m => m.metrics.offersCreated),
            longestWork: topStr(ranked, m => m.todayMinutes, v => {
                const h = Math.floor(v / 60), mi = v % 60;
                return mi > 0 ? `${h}h ${mi}m` : `${h}h`;
            }),
            mostContracts: topNum(ranked, m => m.metrics.contractsSigned),
            highestValue: topStr(ranked, m => m.metrics.contractsValue, v =>
                v > 0 ? `${v.toLocaleString('pl-PL')} €` : '0 €'
            ),
        };

        return { totalOnline, totalTeam: members.length, totalHoursToday, teamTotals, rankings, members };
    },

    async endSession(userId: string): Promise<void> {
        try {
            const { data } = await supabase.from('user_sessions')
                .select('id, started_at').eq('user_id', userId).eq('is_active', true);
            if (data?.length) {
                for (const s of data) {
                    await supabase.from('user_sessions').update({
                        is_active: false, ended_at: new Date().toISOString(),
                        duration_minutes: Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000),
                    }).eq('id', s.id);
                }
            }
            await supabase.from('profiles').update({ is_online: false }).eq('id', userId);
        } catch { /* silent */ }
    },
};

function topNum(arr: TeamMemberPulse[], fn: (m: TeamMemberPulse) => number): { name: string; value: number } | null {
    if (!arr.length) return null;
    let best = arr[0], bv = fn(arr[0]);
    for (const m of arr) { const v = fn(m); if (v > bv) { best = m; bv = v; } }
    return bv > 0 ? { name: best.fullName, value: bv } : null;
}
function topStr(arr: TeamMemberPulse[], fn: (m: TeamMemberPulse) => number, fmt: (v: number) => string): { name: string; value: string } | null {
    if (!arr.length) return null;
    let best = arr[0], bv = fn(arr[0]);
    for (const m of arr) { const v = fn(m); if (v > bv) { best = m; bv = v; } }
    return bv > 0 ? { name: best.fullName, value: fmt(bv) } : null;
}
