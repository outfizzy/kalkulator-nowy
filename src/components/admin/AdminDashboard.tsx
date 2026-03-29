import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import { WalletWidget } from './WalletWidget';
import { TasksList } from '../tasks/TasksList';
import { TaskModal } from '../tasks/TaskModal';
import { ActivityFeed } from './ActivityFeed';
import { CompanyOverview } from './CompanyOverview';
import { UpcomingSchedule } from './UpcomingSchedule';
import { RingostatWidget } from '../widgets/RingostatWidget';
import { MiniTelephonyWidget } from '../widgets/MiniTelephonyWidget';
import { MorningCoffeeAI } from './MorningCoffeeAI';
import { LiveCostWidget } from './LiveCostWidget';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// ─── SVG Icon Components ────────────────────────────────────────
const Icons = {
    revenue: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
    fuel: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    ),
    installations: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    leads: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
    ),
    measurements: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    ),
    phone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    ),
    phoneIncoming: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 3l-6 6m0 0V4m0 5h5M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    ),
    phoneMissed: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    ),
    task: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    plus: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    ),
    arrowRight: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
};

// ─── Greeting helper ────────────────────────────────────────
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'Dobrej nocy';
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Dzień dobry';
    return 'Dobry wieczór';
}

// ─── Quick Action Groups ────────────────────────────────────
const actionGroups = [
    {
        title: 'CRM & Sprzedaż',
        items: [
            {
                title: 'Nowa oferta', path: '/new-offer', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                ), color: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
            },
            {
                title: 'Lista ofert', path: '/offers', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                ), color: 'text-slate-600 bg-slate-50 border-slate-100 hover:bg-slate-100'
            },
            {
                title: 'Leady', path: '/leads', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                ), color: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100'
            },
            {
                title: 'Baza klientów', path: '/customers', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ), color: 'text-teal-600 bg-teal-50 border-teal-100 hover:bg-teal-100'
            },
            {
                title: 'Skrzynka e-mail', path: '/mail', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                ), color: 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100'
            },
        ]
    },
    {
        title: 'Realizacja & Logistyka',
        items: [
            {
                title: 'Kalendarz montaży', path: '/installations', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                ), color: 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100'
            },
            {
                title: 'Protokoły pomiarowe', path: '/reports/measurements', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                ), color: 'text-orange-600 bg-orange-50 border-orange-100 hover:bg-orange-100'
            },
            {
                title: 'Zamówienia materiałów', path: '/procurement', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                ), color: 'text-cyan-600 bg-cyan-50 border-cyan-100 hover:bg-cyan-100'
            },
            {
                title: 'Zgłoszenia serwisowe', path: '/service', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ), color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
            },
            {
                title: 'Zgłoszenia usterek', path: '/admin/failures', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                ), color: 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
            },
        ]
    },
    {
        title: 'Narzędzia & Marketing',
        items: [
            {
                title: 'Kampanie e-mail', path: '/campaigns', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                ), color: 'text-orange-600 bg-orange-50 border-orange-100 hover:bg-orange-100'
            },
            {
                title: 'Targi i eventy', path: '/admin/fairs', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                ), color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
            },
            {
                title: 'Wizualizator 3D', path: '/visualizer', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                ), color: 'text-sky-600 bg-sky-50 border-sky-100 hover:bg-sky-100'
            },
            {
                title: 'Kalkulator dachowy', path: '/dachrechner', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                ), color: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
            },
        ]
    },
    {
        title: 'Zarządzanie',
        items: [
            {
                title: 'Zespół i uprawnienia', path: '/admin/users', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ), color: 'text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-100'
            },
            {
                title: 'Ekipy montażowe', path: '/admin/installers', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                ), color: 'text-pink-600 bg-pink-50 border-pink-100 hover:bg-pink-100'
            },
            {
                title: 'Przegląd ekip', path: '/admin/teams-dashboard', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ), color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
            },
            {
                title: 'Partnerzy handlowi', path: '/admin/b2b/partners', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                ), color: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
            },
            {
                title: 'Dziennik paliwa', path: '/admin/fuel-logs', icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                ), color: 'text-yellow-600 bg-yellow-50 border-yellow-100 hover:bg-yellow-100'
            },
        ]
    }
];

// MiniTelephonyWidget imported from '../widgets/MiniTelephonyWidget'



// ═══════════════════════════════════════════════════════════
// LEADS PIPELINE WIDGET
// ═══════════════════════════════════════════════════════════
const PIPELINE_STAGES = [
    { id: 'new', label: 'Nowe', color: '#3B82F6' },
    { id: 'formularz', label: 'Nowe (Form.)', color: '#14B8A6' },
    { id: 'contacted', label: 'Kontakt', color: '#6366F1' },
    { id: 'offer_sent', label: 'Oferta', color: '#F59E0B' },
    { id: 'measurement_scheduled', label: 'Pomiar', color: '#06B6D4' },
    { id: 'measurement_completed', label: 'Po pomiarze', color: '#A855F7' },
    { id: 'negotiation', label: 'Negocjacje', color: '#F97316' },
];

const LeadsPipelineWidget: React.FC = () => {
    const [pipelineData, setPipelineData] = useState<{ id: string; label: string; color: string; count: number }[]>([]);
    const [recentLeads, setRecentLeads] = useState<{ id: string; name: string; status: string; created: string; city?: string }[]>([]);
    const [totals, setTotals] = useState({ total: 0, won: 0, lost: 0, stale: 0, thisWeek: 0 });

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('id, status, customer_data, created_at, last_contact_date')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const leads = data || [];

                // Pipeline counts
                const counts = PIPELINE_STAGES.map(s => ({
                    ...s,
                    count: leads.filter(l => l.status === s.id).length,
                }));
                setPipelineData(counts);

                // Totals
                const won = leads.filter(l => l.status === 'won').length;
                const lost = leads.filter(l => l.status === 'lost').length;
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const thisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;

                // Stale leads (active but no contact in threshold days)
                const staleThresholds: Record<string, number> = { new: 1, formularz: 2, contacted: 3, measurement_scheduled: 2, measurement_completed: 3, offer_sent: 5, negotiation: 7 };
                const stale = leads.filter(l => {
                    if (['won', 'lost', 'fair'].includes(l.status)) return false;
                    const threshold = staleThresholds[l.status] || 3;
                    const lastDate = l.last_contact_date ? new Date(l.last_contact_date) : new Date(l.created_at);
                    return (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24) > threshold;
                }).length;

                setTotals({ total: leads.length, won, lost, stale, thisWeek });

                // Recent 5
                const recent = leads.slice(0, 5).map(l => {
                    const cd = l.customer_data as any;
                    return {
                        id: l.id,
                        name: `${cd?.firstName || ''} ${cd?.lastName || ''}`.trim() || 'Nieznany',
                        status: l.status,
                        created: new Date(l.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                        city: cd?.city,
                    };
                });
                setRecentLeads(recent);
            } catch (e) {
                console.error('LeadsPipelineWidget error:', e);
            }
        };
        fetchLeads();
    }, []);

    const pipelineTotal = pipelineData.reduce((a, b) => a + b.count, 0);
    const conversionRate = totals.total > 0 ? ((totals.won / totals.total) * 100).toFixed(1) : '0.0';
    const STATUS_COLORS_MAP: Record<string, string> = {
        new: 'bg-blue-100 text-blue-700', formularz: 'bg-teal-100 text-teal-700',
        contacted: 'bg-indigo-100 text-indigo-700', offer_sent: 'bg-yellow-100 text-yellow-700',
        measurement_scheduled: 'bg-cyan-100 text-cyan-700', measurement_completed: 'bg-purple-100 text-purple-700',
        negotiation: 'bg-orange-100 text-orange-700', won: 'bg-emerald-100 text-emerald-700',
        lost: 'bg-red-100 text-red-700', fair: 'bg-pink-100 text-pink-700',
    };
    const STATUS_LABELS_MAP: Record<string, string> = {
        new: 'Nowy', formularz: 'Form.', contacted: 'Kontakt', offer_sent: 'Oferta',
        measurement_scheduled: 'Pomiar', measurement_completed: 'Po pom.', negotiation: 'Negocj.',
        won: 'Wygrany', lost: 'Utracony', fair: 'Targi',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Pipeline Leadów</h3>
                        <p className="text-xs text-slate-400">Przegląd aktywnych procesów sprzedażowych</p>
                    </div>
                </div>
                <Link to="/leads" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    Otwórz <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
            </div>

            <div className="p-4 sm:p-5">
                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Wszystkie</p>
                        <p className="text-xl font-black text-slate-800">{totals.total}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-blue-400 uppercase">Ten tydzień</p>
                        <p className="text-xl font-black text-blue-700">+{totals.thisWeek}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase">Konwersja</p>
                        <p className="text-xl font-black text-emerald-700">{conversionRate}%</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-amber-400 uppercase">Wygrane</p>
                        <p className="text-xl font-black text-amber-700">{totals.won}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${totals.stale > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className={`text-[9px] font-bold uppercase ${totals.stale > 0 ? 'text-red-400' : 'text-slate-400'}`}>Zagrożone</p>
                        <p className={`text-xl font-black ${totals.stale > 0 ? 'text-red-600' : 'text-slate-600'}`}>{totals.stale}</p>
                    </div>
                </div>

                {/* Pipeline Bar */}
                {pipelineTotal > 0 && (
                    <div className="mb-4">
                        <div className="flex rounded-full overflow-hidden h-5 bg-slate-100">
                            {pipelineData.filter(s => s.count > 0).map(s => (
                                <div key={s.id} className="h-full transition-all duration-500 relative group"
                                    style={{ width: `${(s.count / pipelineTotal) * 100}%`, backgroundColor: s.color, minWidth: '16px' }}
                                    title={`${s.label}: ${s.count}`}>
                                    {(s.count / pipelineTotal) > 0.08 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">{s.count}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {pipelineData.filter(s => s.count > 0).map(s => (
                                <div key={s.id} className="flex items-center gap-1 text-[10px] text-slate-600">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                    <span className="font-medium">{s.label}</span>
                                    <span className="text-slate-400">({s.count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Leads */}
                {recentLeads.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ostatnio dodane</h4>
                        <div className="divide-y divide-slate-50">
                            {recentLeads.map(l => (
                                <Link to={`/leads/${l.id}`} key={l.id} className="flex items-center justify-between py-1.5 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS_MAP[l.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {STATUS_LABELS_MAP[l.status] || l.status}
                                        </span>
                                        <span className="font-medium text-sm text-slate-800 truncate">{l.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {l.city && <span className="text-[10px] text-slate-400">{l.city}</span>}
                                        <span className="text-[10px] text-slate-400 font-mono">{l.created}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const AdminDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState({
        totalRevenue: 0, activeUsers: 0, pendingOffers: 0, completedInstallations: 0
    });
    const [monthlyNetTurnover, setMonthlyNetTurnover] = useState(0);
    const [monthlyFuelLiters, setMonthlyFuelLiters] = useState(0);
    const [monthlyInstallations, setMonthlyInstallations] = useState(0);
    const [monthlyMeasurements, setMonthlyMeasurements] = useState(0);
    const [extraStats, setExtraStats] = useState({ leads: 0, scheduledMeasurements: 0, activeInstallations: 0 });
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);

    useEffect(() => {
        DatabaseService.getSystemStats().then(setStats).catch(console.error);
        Promise.all([
            supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
            supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
            supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'confirmed']),
        ]).then(([leadsRes, measRes, instRes]) => {
            setExtraStats({
                leads: leadsRes.count || 0,
                scheduledMeasurements: measRes.count || 0,
                activeInstallations: instRes.count || 0,
            });
        }).catch(console.error);

        // Fetch monthly net turnover from contracts
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        supabase
            .from('contracts')
            .select('contract_data, status, created_at')
            .in('status', ['signed', 'completed'])
            .gte('created_at', firstDay)
            .lte('created_at', lastDay)
            .then(({ data, error }) => {
                if (error) { console.error('Turnover query error:', error); return; }
                const total = (data || []).reduce((sum, c) => {
                    const p = (c.contract_data as any)?.pricing;
                    return sum + (p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0);
                }, 0);
                setMonthlyNetTurnover(total);
            }).catch(console.error);

        // Fetch monthly fuel consumption from fuel_logs
        supabase
            .from('fuel_logs')
            .select('liters')
            .gte('log_date', firstDay.split('T')[0])
            .lte('log_date', lastDay.split('T')[0])
            .then(({ data, error }) => {
                if (error) { console.error('Fuel query error:', error); return; }
                const totalLiters = (data || []).reduce((sum, row) => sum + (Number(row.liters) || 0), 0);
                setMonthlyFuelLiters(totalLiters);
            }).catch(console.error);

        // Fetch monthly installations count (unique clients/offers)
        supabase
            .from('installations')
            .select('offer_id, scheduled_date')
            .gte('scheduled_date', firstDay.split('T')[0])
            .lte('scheduled_date', lastDay.split('T')[0])
            .then(({ data, error }) => {
                if (error) { console.error('Installations query error:', error); return; }
                // Count unique offer_ids (= unique clients)
                const uniqueOffers = new Set((data || []).map(r => r.offer_id).filter(Boolean));
                setMonthlyInstallations(uniqueOffers.size || (data || []).length);
            }).catch(console.error);

        // Fetch monthly measurements count from calendar
        supabase
            .from('measurements')
            .select('id', { count: 'exact', head: true })
            .gte('scheduled_date', firstDay)
            .lte('scheduled_date', lastDay)
            .then(({ count, error }) => {
                if (error) { console.error('Measurements query error:', error); return; }
                setMonthlyMeasurements(count || 0);
            }).catch(console.error);
    }, []);

    const firstName = currentUser?.firstName || currentUser?.email?.split('@')[0] || 'Admin';

    const currentMonthName = new Date().toLocaleString('pl-PL', { month: 'long' });

    const statCards = [
        {
            label: 'Obrót netto', value: Number(monthlyNetTurnover || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
            icon: Icons.revenue, color: 'from-blue-500 to-blue-600', bgIcon: 'bg-blue-400/20', link: '/contracts',
            sub: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
        },
        {
            label: 'Użytkownicy', value: stats.activeUsers,
            icon: Icons.users, color: 'from-emerald-500 to-emerald-600', bgIcon: 'bg-emerald-400/20', link: '/admin/users'
        },
        {
            label: 'Paliwo (L)', value: `${Math.round(monthlyFuelLiters)} L`,
            icon: Icons.fuel, color: 'from-amber-500 to-amber-600', bgIcon: 'bg-amber-400/20', link: '/admin/fuel-logs',
            sub: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
        },
        {
            label: 'Montaże', value: monthlyInstallations,
            icon: Icons.installations, color: 'from-purple-500 to-purple-600', bgIcon: 'bg-purple-400/20', link: '/installations',
            sub: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
        },
        {
            label: 'Nowe Leady', value: extraStats.leads,
            icon: Icons.leads, color: 'from-rose-500 to-rose-600', bgIcon: 'bg-rose-400/20', link: '/leads'
        },
        {
            label: 'Pomiary', value: monthlyMeasurements,
            icon: Icons.measurements, color: 'from-orange-500 to-orange-600', bgIcon: 'bg-orange-400/20', link: '/measurements',
            sub: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
        },
    ];

    return (
        <div className="space-y-5 pb-12 max-w-[1600px] mx-auto">

            {/* ═══ ZONE 1: Personalized Header ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                        {getGreeting()}, {firstName}!
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Twoje centrum dowodzenia &mdash; przegląd firmy w jednym miejscu</p>
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-slate-200 self-start sm:self-auto">
                    {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* ═══ PORANNA KAWA Z AI ═══ */}
            <MorningCoffeeAI />

            {/* ═══ ZONE 2: Stat Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statCards.map((card, idx) => (
                    <Link
                        key={idx}
                        to={card.link}
                        className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 sm:p-5 text-white shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow`}
                    >
                        <div className={`absolute top-3 right-3 ${card.bgIcon} rounded-lg p-2 group-hover:scale-110 transition-transform`}>
                            {card.icon}
                        </div>
                        <p className="text-white/80 text-[11px] sm:text-xs font-medium uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-lg sm:text-2xl font-bold mt-1 truncate pr-8">{card.value}</h3>
                        {(card as any).sub && <p className="text-white/60 text-[10px] mt-0.5">{(card as any).sub}</p>}
                    </Link>
                ))}
            </div>

            {/* ═══ LEADS PIPELINE MINI WIDGET ═══ */}
            <LeadsPipelineWidget />

            {/* ═══ LIVE COST WIDGET ═══ */}
            <LiveCostWidget />

            {/* ═══ ZONE 3: Three Column — Calendar + Wallet + Telephony ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                    <UpcomingSchedule />
                </div>
                <div className="lg:col-span-1">
                    <WalletWidget />
                </div>
                <div className="lg:col-span-1">
                    <MiniTelephonyWidget />
                </div>
            </div>

            {/* ═══ ZONE 4: Tasks + Activity — Two Columns ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Tasks */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col" style={{ maxHeight: '480px' }}>
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">{Icons.task}</div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800">Moje Zadania</h3>
                        </div>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                            {Icons.plus}
                            <span className="hidden sm:inline">Dodaj</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <TasksList refreshTrigger={tasksRefreshTrigger} />
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="overflow-hidden rounded-2xl" style={{ maxHeight: '480px' }}>
                    <ActivityFeed />
                </div>
            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => setTasksRefreshTrigger(prev => prev + 1)}
            />

            {/* ═══ CENTRUM POŁĄCZEŃ (Ringostat) ═══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Centrum połączeń</h3>
                        <p className="text-xs text-slate-400">Połączenia przychodzące, wychodzące, nieodebrane i oddzwonienia</p>
                    </div>
                </div>
                <div className="p-4 sm:p-5">
                    <RingostatWidget />
                </div>
            </div>

            {/* ═══ ZONE 5: Quick Actions — Grouped ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Szybki dostęp</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {actionGroups.map((group, gi) => (
                        <div key={gi}>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{group.title}</h4>
                            <div className="space-y-1.5">
                                {group.items.map((action, ai) => (
                                    <Link
                                        key={ai}
                                        to={action.path}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${action.color} transition-all text-left`}
                                    >
                                        <span className="shrink-0">{action.icon}</span>
                                        <span className="text-sm font-medium">{action.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ ZONE 6: Company Overview (Analytics) ═══ */}
            <CompanyOverview />
        </div>
    );
};
