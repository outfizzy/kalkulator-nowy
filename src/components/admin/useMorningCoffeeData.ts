import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProcurementService } from '../../services/database/procurement.service';

// ─── Types ──────────────────────────────────────────────────
export interface AdminBriefing {
    staleLeads: number; totalLeads: number; newLeadsToday: number;
    pendingOffers: number; upcomingInstallations: number; upcomingMeasurements: number;
    contractsThisMonth: number; revenueThisMonth: number; topStaleLeadNames: string[];
    // Phase 1 — Pulse
    pipelineValue: number; avgDealSize: number; leadVelocity: { thisWeek: number; lastWeek: number };
    salesCycleDays: number;
    // Phase 1 — Ranking
    teamRanking: { name: string; won: number; revenue: number; leadsAssigned: number; stale: number }[];
    // Phase 1 — Trendy
    lastMonthContracts: number; lastMonthRevenue: number; lastMonthLeads: number;
    leadsBySource: Record<string, number>;
    // Logistics / Procurement
    procurementPending: number; procurementOrdered: number; procurementDelivered: number;
    procurementPendingValue: number; procurementOrderedValue: number;
    contractsReadyForInstallation: number;
    upcomingInstallationDetails: { name: string; date: string; city?: string }[];
}

export interface SalesRepBriefing {
    unprocessedLeads: number;
    unprocessedBreakdown: { new: number; formularz: number; contacted: number };
    offersWaiting: number; negotiationStale: number; followUpLeadNames: string[];
    myMeasurements: number; myInstallations: number;
    myWonThisMonth: number; myOffersSent: number; conversionRate: string;
    hotLeadNames: string[];
}

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

function leadName(l: any): string {
    const cd = l.customer_data;
    if (cd?.lastName) return `${cd.firstName || ''} ${cd.lastName}`.trim();
    if (cd?.company) return cd.company;
    return `Lead #${(l.id || '').slice(0, 6)}`;
}

export function useMorningCoffeeData() {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
    const userId = currentUser?.id;

    const [state, setState] = useState<LoadState>('idle');
    const [adminData, setAdminData] = useState<AdminBriefing | null>(null);
    const [salesData, setSalesData] = useState<SalesRepBriefing | null>(null);

    // ─── ADMIN ──────────────────────────────────────────────
    async function loadAdmin() {
        setState('loading');
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
            const daysAgo3 = new Date(now.getTime() - 3 * 86400000).toISOString();
            const daysAgo7 = new Date(now.getTime() - 7 * 86400000).toISOString();
            const daysAgo14 = new Date(now.getTime() - 14 * 86400000).toISOString();
            const weekLater = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

            const [
                leadsRes, staleRes, offersRes, installRes, measureRes,
                contractsRes, newTodayRes,
                // Pulse extras
                pipelineOffers, leadsThisWeek, leadsLastWeek, wonLeadsAll,
                // Trendy — last month
                lastMonthContracts, lastMonthLeadsRes,
                // Ranking — reps
                allReps, repLeads,
                // Upcoming installations with details
                upcomingInstallsDetail
            ] = await Promise.all([
                supabase.from('leads').select('id', { count: 'exact', head: true }),
                supabase.from('leads').select('id, customer_data').in('status', ['new', 'formularz', 'contacted']).lt('created_at', daysAgo3).limit(5),
                supabase.from('offers').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
                supabase.from('installations').select('id', { count: 'exact', head: true }).gte('scheduled_date', todayStart).lte('scheduled_date', weekLater),
                supabase.from('measurements').select('id', { count: 'exact', head: true }).gte('scheduled_date', todayStart).lte('scheduled_date', weekLater),
                supabase.from('contracts').select('id, contract_data, status, created_at').gte('created_at', monthStart).in('status', ['signed', 'completed']),
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
                // Pipeline value
                supabase.from('offers').select('pricing').in('status', ['sent', 'draft']),
                // Lead velocity
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', daysAgo7),
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', daysAgo14).lt('created_at', daysAgo7),
                // Sales cycle
                supabase.from('leads').select('created_at, updated_at').eq('status', 'won').gte('updated_at', monthStart).limit(50),
                // Last month
                supabase.from('contracts').select('id, contract_data, status').gte('created_at', lastMonthStart).lt('created_at', lastMonthEnd).in('status', ['signed', 'completed']),
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', lastMonthEnd),
                // Team ranking
                supabase.from('profiles').select('id, full_name').in('role', ['sales_rep', 'admin', 'manager']),
                supabase.from('leads').select('id, status, assigned_to, source, created_at, updated_at').gte('created_at', monthStart),
                // Installation details for next 7 days
                supabase.from('installations').select('id, scheduled_date, customer_data, address_data, contract_id').gte('scheduled_date', todayStart).lte('scheduled_date', weekLater).order('scheduled_date', { ascending: true }).limit(10),
            ]);

            // Procurement stats
            let procStats = { pending: 0, ordered: 0, delivered: 0, pendingValue: 0, orderedValue: 0, contractsReady: 0 };
            try { procStats = await ProcurementService.getProcurementStats(); } catch (e) { console.warn('Procurement stats failed:', e); }

            // Upcoming installation details
            const installDetails = (upcomingInstallsDetail.data || []).map((inst: any) => {
                const cd = inst.customer_data;
                const name = cd?.lastName ? `${cd.firstName || ''} ${cd.lastName}`.trim() : `Installation #${(inst.id || '').slice(0, 6)}`;
                const city = inst.address_data?.city || cd?.city || '';
                return { name, date: inst.scheduled_date, city };
            });

            // Revenue this month
            let revenue = 0;
            (contractsRes.data || []).forEach((c: any) => {
                const p = c.contract_data?.pricing;
                revenue += p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0;
            });

            // Pipeline value
            let pipelineVal = 0;
            (pipelineOffers.data || []).forEach((o: any) => {
                const p = o.pricing;
                pipelineVal += p?.totalNet ?? p?.finalPrice ?? p?.sellingPriceNet ?? 0;
            });

            // Avg deal size
            const contractCount = contractsRes.data?.length || 0;
            const avgDeal = contractCount > 0 ? Math.round(revenue / contractCount) : 0;

            // Sales cycle
            let totalCycleDays = 0; let cycleCount = 0;
            (wonLeadsAll.data || []).forEach((l: any) => {
                const created = new Date(l.created_at).getTime();
                const updated = new Date(l.updated_at).getTime();
                const days = (updated - created) / 86400000;
                if (days > 0 && days < 365) { totalCycleDays += days; cycleCount++; }
            });

            // Last month revenue
            let lastRevenue = 0;
            (lastMonthContracts.data || []).forEach((c: any) => {
                const p = c.contract_data?.pricing;
                lastRevenue += p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0;
            });

            // Leads by source
            const sourceMap: Record<string, number> = {};
            (repLeads.data || []).forEach((l: any) => {
                const src = l.source || 'Nieznane';
                sourceMap[src] = (sourceMap[src] || 0) + 1;
            });

            // Team ranking
            const reps = (allReps.data || []).filter((r: any) => r.full_name);
            const ranking = reps.map((rep: any) => {
                const myLeads = (repLeads.data || []).filter((l: any) => l.assigned_to === rep.id);
                const won = myLeads.filter((l: any) => l.status === 'won').length;
                const stale = myLeads.filter((l: any) => ['new', 'formularz', 'contacted'].includes(l.status) && (Date.now() - new Date(l.created_at).getTime()) > 3 * 86400000).length;
                // Revenue per rep from contracts
                const repContracts = (contractsRes.data || []).filter((c: any) => {
                    const cd = c.contract_data;
                    return cd?.salesRepId === rep.id || cd?.sales_rep_id === rep.id;
                });
                let repRev = 0;
                repContracts.forEach((c: any) => {
                    const p = c.contract_data?.pricing;
                    repRev += p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0;
                });
                return { name: rep.full_name, won, revenue: Math.round(repRev), leadsAssigned: myLeads.length, stale };
            }).filter((r: any) => r.leadsAssigned > 0 || r.revenue > 0).sort((a: any, b: any) => b.revenue - a.revenue || b.won - a.won);

            setAdminData({
                staleLeads: staleRes.data?.length || 0,
                totalLeads: leadsRes.count || 0,
                newLeadsToday: newTodayRes.count || 0,
                pendingOffers: offersRes.count || 0,
                upcomingInstallations: installRes.count || 0,
                upcomingMeasurements: measureRes.count || 0,
                contractsThisMonth: contractCount,
                revenueThisMonth: revenue,
                topStaleLeadNames: (staleRes.data || []).map(leadName),
                pipelineValue: Math.round(pipelineVal),
                avgDealSize: avgDeal,
                leadVelocity: { thisWeek: leadsThisWeek.count || 0, lastWeek: leadsLastWeek.count || 0 },
                salesCycleDays: cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : 0,
                teamRanking: ranking.slice(0, 5),
                lastMonthContracts: lastMonthContracts.data?.length || 0,
                lastMonthRevenue: Math.round(lastRevenue),
                lastMonthLeads: lastMonthLeadsRes.count || 0,
                leadsBySource: sourceMap,
                // Logistics
                procurementPending: procStats.pending,
                procurementOrdered: procStats.ordered,
                procurementDelivered: procStats.delivered,
                procurementPendingValue: Math.round(procStats.pendingValue),
                procurementOrderedValue: Math.round(procStats.orderedValue),
                contractsReadyForInstallation: procStats.contractsReady,
                upcomingInstallationDetails: installDetails,
            });
            setState('loaded');
        } catch (err) {
            console.error('MorningCoffee admin error:', err);
            setState('error');
        }
    }

    // ─── SALES REP ──────────────────────────────────────────
    async function loadSalesRep(uid: string) {
        setState('loading');
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const weekLater = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
            const daysAgo7 = new Date(now.getTime() - 7 * 86400000).toISOString();
            const daysAgo5 = new Date(now.getTime() - 5 * 86400000).toISOString();

            const [newRes, formRes, contactedRes, staleOffers, staleNeg, hotLeads, myMeas, myInst, wonRes, sentRes] = await Promise.all([
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', uid).eq('status', 'new'),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', uid).eq('status', 'formularz'),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', uid).eq('status', 'contacted'),
                supabase.from('leads').select('id, customer_data, updated_at').eq('assigned_to', uid).eq('status', 'offer_sent').lt('updated_at', daysAgo7).limit(5),
                supabase.from('leads').select('id, customer_data').eq('assigned_to', uid).eq('status', 'negotiation').lt('updated_at', daysAgo5).limit(3),
                supabase.from('leads').select('id, customer_data, status').eq('assigned_to', uid).in('status', ['offer_sent', 'negotiation', 'measurement_completed']).gte('updated_at', daysAgo7).order('updated_at', { ascending: false }).limit(5),
                supabase.from('measurements').select('id', { count: 'exact', head: true }).eq('sales_rep_id', uid).gte('scheduled_date', todayStart).lte('scheduled_date', weekLater),
                supabase.from('installations').select('id', { count: 'exact', head: true }).gte('scheduled_date', todayStart).lte('scheduled_date', weekLater),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', uid).eq('status', 'won').gte('updated_at', monthStart),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', uid).in('status', ['offer_sent', 'negotiation', 'measurement_scheduled', 'measurement_completed', 'won']).gte('created_at', monthStart),
            ]);

            const followUpNames = [...(staleOffers.data || []), ...(staleNeg.data || [])].map(leadName);
            const hotNames = (hotLeads.data || []).map((l: any) => {
                const emoji = l.status === 'negotiation' ? '🔥' : l.status === 'measurement_completed' ? '📐' : '📨';
                return `${emoji} ${leadName(l)}`;
            });
            const won = wonRes.count || 0; const sent = sentRes.count || 0;

            setSalesData({
                unprocessedLeads: (newRes.count || 0) + (formRes.count || 0) + (contactedRes.count || 0),
                unprocessedBreakdown: { new: newRes.count || 0, formularz: formRes.count || 0, contacted: contactedRes.count || 0 },
                offersWaiting: staleOffers.data?.length || 0, negotiationStale: staleNeg.data?.length || 0,
                followUpLeadNames: followUpNames, myMeasurements: myMeas.count || 0, myInstallations: myInst.count || 0,
                myWonThisMonth: won, myOffersSent: sent,
                conversionRate: sent > 0 ? `${Math.round((won / sent) * 100)}%` : '—',
                hotLeadNames: hotNames,
            });
            setState('loaded');
        } catch (err) {
            console.error('MorningCoffee sales error:', err);
            setState('error');
        }
    }

    // ─── LOAD ON PROFILE READY ──────────────────────────────
    useEffect(() => {
        if (!currentUser?.id) return;
        if (state !== 'idle') return;
        if (isAdmin) loadAdmin();
        else loadSalesRep(currentUser.id);
    }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    function refresh() {
        if (isAdmin) loadAdmin();
        else if (userId) loadSalesRep(userId);
    }

    return { state, adminData, salesData, isAdmin, userId, currentUser, refresh };
}
