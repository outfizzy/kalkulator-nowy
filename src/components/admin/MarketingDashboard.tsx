import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────
interface CompetitorData {
    name: string;
    url: string;
    status: 'online' | 'checking' | 'error';
    keywords?: string[];
    description: string;
    products: string[];
    priceRange: 'Budget' | 'Mittel' | 'Premium' | 'Hersteller';
    region: string;
    strengths: string[];
    weaknesses: string[];
    social?: { instagram?: string; facebook?: string; youtube?: string };
    founded?: string;
    employees?: string;
    color: string;
}

interface MarketingMetrics {
    totalLeads: number;
    leadsThisMonth: number;
    leadsBySource: { source: string; count: number }[];
    conversionRate: string;
    avgDealValue: number;
    topProducts: { product: string; count: number }[];
    offersCreated: number;
    offersSent: number;
    contractsSigned: number;
    measurementsScheduled: number;
    leadsLast7Days: number;
    leadsByStatus: { status: string; count: number }[];
}

// ─── Competitor List ────────────────────────────────────────
const COMPETITORS: CompetitorData[] = [
    { name: 'Schweng', url: 'https://www.schweng.de', status: 'online', color: 'from-blue-600 to-blue-700', keywords: ['terrassenüberdachung', 'aluminium', 'glasdach', 'terrassendach nach maß'], description: 'Jeden z największych dostawców zadaszeń aluminiowych w Niemczech. Silna marka, szerokie portfolio.', products: ['Terrassenüberdachung', 'Glasdach', 'Carport', 'Vordach', 'Seitenteile'], priceRange: 'Premium', region: 'Cała DE', founded: '2005', employees: '50-100', strengths: ['Silna marka i rozpoznawalność', 'Szeroki asortyment', 'Profesjonalna strona i SEO', 'Konfigurator online'], weaknesses: ['Wyższe ceny', 'Długie terminy realizacji', 'Brak personalizacji B2B'], social: { instagram: 'schweng.de', facebook: 'schweng.de', youtube: 'Schweng' } },
    { name: 'JW Company', url: 'https://www.jw-company.de', status: 'online', color: 'from-emerald-600 to-emerald-700', keywords: ['überdachung', 'carport', 'terrassendach', 'freistehend'], description: 'Bezpośredni konkurent w segmencie carportów i zadaszeń. Aktywni na targach branżowych.', products: ['Terrassendach', 'Carport', 'Überdachung freistehend', 'Wintergarten'], priceRange: 'Mittel', region: 'NRW, Niedersachsen', founded: '2012', strengths: ['Konkurencyjne ceny', 'Szybka realizacja', 'Obecność na targach'], weaknesses: ['Mniejszy zasięg geograficzny', 'Słabsze SEO', 'Brak konfiguratorów online'] },
    { name: 'KD Überdachung', url: 'https://www.kd-ueberdachung.de', status: 'online', color: 'from-amber-600 to-amber-700', keywords: ['terrassenüberdachung', 'wintergarten', 'kalt wintergarten'], description: 'Specjalista od zadaszeń i zimnych oranżerii. Zorientowany na klienta indywidualnego.', products: ['Terrassenüberdachung', 'Kalt Wintergarten', 'Wintergarten', 'Glashaus'], priceRange: 'Mittel', region: 'Bayern, BW', strengths: ['Specjalizacja w wintergartenach', 'Dobra obsługa klienta', 'Montaż w cenie'], weaknesses: ['Ograniczony region', 'Mała skala', 'Brak zaawansowanego marketingu'] },
    { name: 'AM Pergola', url: 'https://www.am-pergola.de', status: 'online', color: 'from-purple-600 to-purple-700', keywords: ['pergola', 'lamellendach', 'sonnenschutz', 'bioklimatische pergola'], description: 'Nisza pergolow-lamelowa. Mocna pozycja w segmencie bioklimatycznych pergoli.', products: ['Pergola', 'Lamellendach', 'Bioklimatische Pergola', 'Sonnenschutz'], priceRange: 'Premium', region: 'Cała DE', strengths: ['Specjalizacja w pergolach', 'Nowoczesny design', 'Bioklimatyczne systemy'], weaknesses: ['Wąski asortyment', 'Brak carportów i wintergartenów', 'Wysokie ceny'] },
    { name: 'Heroal', url: 'https://www.heroal.de', status: 'online', color: 'from-red-600 to-red-700', keywords: ['aluminium systeme', 'terrassenüberdachung', 'fassaden', 'rollläden'], description: 'Duży producent systemów aluminiowych. Dostawca profili — wyznacza standardy rynku.', products: ['Systemy aluminiowe', 'Terrassenüberdachung-Profile', 'Fassaden', 'Rollläden'], priceRange: 'Hersteller', region: 'Międzynarodowo', founded: '1874', employees: '1000+', strengths: ['Gigantyczna skala', 'Własna produkcja profili', 'R&D i innowacje'], weaknesses: ['Nie sprzedaje end-user', 'Brak montażu', 'Tylko B2B'], social: { youtube: 'heroal' } },
    { name: 'Weinor', url: 'https://www.weinor.de', status: 'online', color: 'from-orange-600 to-orange-700', keywords: ['terrassendach', 'markise', 'glasdach', 'pergola'], description: 'Premium producent zadaszeń i markiz. Bardzo silna marka, duży budżet marketingowy.', products: ['Terrassendach', 'Markisen', 'Glasdach', 'Pergola', 'Seitenmarkise'], priceRange: 'Premium', region: 'Europa', founded: '1960', employees: '500+', strengths: ['Najsilniejsza marka w segmencie', 'Ogromny budżet marketingowy', 'Sieć partnerów'], weaknesses: ['Bardzo wysokie ceny', 'Sprzedaż tylko przez partnerów', 'Długi czas dostawy'], social: { instagram: 'weinor_gmbh', facebook: 'weinor', youtube: 'weinor' } },
    { name: 'warema', url: 'https://www.warema.de', status: 'online', color: 'from-cyan-600 to-cyan-700', keywords: ['sonnenschutz', 'markise', 'raffstore', 'terrassendach'], description: 'Lider rynku ochrony przeciwsłonecznej. Głównie markizy i raffstore, ale też zadaszenia.', products: ['Markisen', 'Raffstoren', 'Rollladen', 'Terrassendach', 'Pergola'], priceRange: 'Premium', region: 'Europa', founded: '1955', employees: '4000+', strengths: ['Lider rynku sonnenschutz', 'Gigantyczna sieć dystrybucji', 'Smart Home integracja'], weaknesses: ['Zadaszenia to nie core business', 'Skomplikowany proces zamówień', 'Brak fokusa na carporty'], social: { instagram: 'warema_group', facebook: 'warema', youtube: 'WAREMA' } },
    { name: 'Solarlux', url: 'https://www.solarlux.de', status: 'online', color: 'from-teal-600 to-teal-700', keywords: ['wintergarten', 'glashaus', 'glasfaltwand', 'terrassendach'], description: 'Premium producent wintergartenów i szklanych systemów. Wzorcowa firma w segmencie.', products: ['Wintergarten', 'Glashaus', 'Glasfaltwand', 'Terrassendach', 'Balkonverglasung'], priceRange: 'Premium', region: 'Europa', founded: '1983', employees: '1000+', strengths: ['Absolutny premium', 'Showroomy w całych Niemczech', 'Innowacyjne produkty'], weaknesses: ['Bardzo drogie', 'Segment luksusowy', 'Nie konkurują cenowo'], social: { instagram: 'solarlux', facebook: 'solarlux', youtube: 'Solarlux' } },
];

// ─── Target Keywords ────────────────────────────────────────
const TARGET_KEYWORDS = [
    { keyword: 'terrassenüberdachung aluminium', volume: '12.100/mo', difficulty: 'hoch', position: '—' },
    { keyword: 'terrassenüberdachung kaufen', volume: '8.100/mo', difficulty: 'mittel', position: '—' },
    { keyword: 'glasdach terrasse', volume: '6.600/mo', difficulty: 'mittel', position: '—' },
    { keyword: 'aluminium überdachung preise', volume: '4.400/mo', difficulty: 'mittel', position: '—' },
    { keyword: 'pergola aluminium', volume: '5.400/mo', difficulty: 'hoch', position: '—' },
    { keyword: 'lamellendach kaufen', volume: '3.600/mo', difficulty: 'niedrig', position: '—' },
    { keyword: 'terrassendach freistehend', volume: '2.900/mo', difficulty: 'niedrig', position: '—' },
    { keyword: 'sonnenschutz terrasse', volume: '9.900/mo', difficulty: 'hoch', position: '—' },
    { keyword: 'überdachung nach maß', volume: '1.900/mo', difficulty: 'niedrig', position: '—' },
    { keyword: 'carport aluminium', volume: '4.400/mo', difficulty: 'mittel', position: '—' },
];

// ─── Component ──────────────────────────────────────────────
export const MarketingDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'ads' | 'competitors' | 'keywords' | 'ai'>('overview');
    const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [competitorAnalysis, setCompetitorAnalysis] = useState<Record<string, string>>({});
    const [loadingCompetitor, setLoadingCompetitor] = useState<string>('');
    const [keywordAnalysis, setKeywordAnalysis] = useState<string>('');
    const [loadingKeywords, setLoadingKeywords] = useState(false);
    const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const [totalRes, monthRes, wonRes, contractsRes, offersRes, offersSentRes, measureRes, last7Res, allLeadsRes] = await Promise.all([
                supabase.from('leads').select('id', { count: 'exact', head: true }),
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'won'),
                supabase.from('contracts').select('contract_data').in('status', ['signed', 'completed']).gte('created_at', monthStart),
                supabase.from('offers').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
                supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', monthStart),
                supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'measurement').gte('created_at', monthStart),
                supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
                supabase.from('leads').select('status').gte('created_at', monthStart),
            ]);

            // Lead sources
            const { data: sourceData } = await supabase.from('leads').select('source').gte('created_at', monthStart);
            const sourceCounts: Record<string, number> = {};
            sourceData?.forEach((l: any) => {
                const src = l.source || 'Bezpośredni';
                sourceCounts[src] = (sourceCounts[src] || 0) + 1;
            });
            const leadsBySource = Object.entries(sourceCounts)
                .map(([source, count]) => ({ source, count }))
                .sort((a, b) => b.count - a.count);

            // Lead by status
            const statusCounts: Record<string, number> = {};
            allLeadsRes.data?.forEach((l: any) => {
                const s = l.status || 'new';
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const leadsByStatus = Object.entries(statusCounts)
                .map(([status, count]) => ({ status, count }))
                .sort((a, b) => b.count - a.count);

            // Avg deal value
            let totalRevenue = 0;
            let dealCount = 0;
            contractsRes.data?.forEach((c: any) => {
                const p = c.contract_data?.pricing;
                const v = p?.finalPriceNet ?? p?.sellingPriceNet ?? p?.totalCost ?? 0;
                if (v > 0) { totalRevenue += v; dealCount++; }
            });

            const total = totalRes.count || 1;
            const won = wonRes.count || 0;

            setMetrics({
                totalLeads: total,
                leadsThisMonth: monthRes.count || 0,
                leadsBySource,
                conversionRate: `${Math.round((won / total) * 100)}%`,
                avgDealValue: dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0,
                topProducts: [],
                offersCreated: offersRes.count || 0,
                offersSent: offersSentRes.count || 0,
                contractsSigned: contractsRes.data?.length || 0,
                measurementsScheduled: measureRes.count || 0,
                leadsLast7Days: last7Res.count || 0,
                leadsByStatus,
            });
        } catch (err) {
            console.error('Marketing metrics error:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateAIAnalysis = async () => {
        setLoadingAI(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');
            const result = await supabase.functions.invoke('market-intelligence', {
                body: { action: 'analyze_market' },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (result.data?.content) setAiAnalysis(result.data.content);
        } catch (err) {
            console.error(err);
            setAiAnalysis('⚠️ Nie udało się wygenerować analizy AI.');
        } finally {
            setLoadingAI(false);
        }
    };

    const analyzeCompetitor = async (name: string) => {
        setLoadingCompetitor(name);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');
            const result = await supabase.functions.invoke('market-intelligence', {
                body: { action: 'analyze_competitor', competitor_name: name },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (result.data?.content) {
                setCompetitorAnalysis(prev => ({ ...prev, [name]: result.data.content }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCompetitor('');
        }
    };

    const generateKeywordAnalysis = async () => {
        setLoadingKeywords(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');
            const result = await supabase.functions.invoke('market-intelligence', {
                body: { action: 'keyword_intelligence' },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (result.data?.content) setKeywordAnalysis(result.data.content);
        } catch (err) {
            console.error(err);
            setKeywordAnalysis('⚠️ Błąd generowania analizy.');
        } finally {
            setLoadingKeywords(false);
        }
    };

    const tabs = [
        { id: 'overview', label: '📊 Przegląd & Lejek', icon: '📊' },
        { id: 'integrations', label: '🔗 Integracje', icon: '🔗' },
        { id: 'competitors', label: '🔍 Konkurencja', icon: '🔍' },
        { id: 'keywords', label: '🗝️ Słowa klucz.', icon: '🗝️' },
        { id: 'ai', label: '🤖 AI Strategia', icon: '🤖' },
    ];

    return (
        <div className="space-y-5 pb-12 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Marketing Intelligence</h1>
                        <p className="text-white/70 text-sm">Lejek sprzedażowy • Integracje • Konkurencja • AI Strategia</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1.5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* OVERVIEW TAB */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leady łącznie</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{metrics?.totalLeads || 0}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics?.leadsThisMonth || 0} ten miesiąc</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Konwersja</p>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">{metrics?.conversionRate || '—'}</p>
                            <p className="text-xs text-slate-400 mt-1">lead → umowa</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Średnia wartość</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{metrics?.avgDealValue ? `${(metrics.avgDealValue / 1000).toFixed(1)}k` : '—'}</p>
                            <p className="text-xs text-slate-400 mt-1">EUR / zlecenie</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Źródła leadów</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{metrics?.leadsBySource.length || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">aktywnych kanałów</p>
                        </div>
                    </div>

                    {/* Lead Sources */}
                    {metrics && metrics.leadsBySource.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Źródła leadów w tym miesiącu</h3>
                            <div className="space-y-3">
                                {metrics.leadsBySource.map((s, i) => {
                                    const maxCount = metrics.leadsBySource[0]?.count || 1;
                                    const pct = Math.round((s.count / maxCount) * 100);
                                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-700">{s.source}</span>
                                                <span className="text-sm font-bold text-slate-600">{s.count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── CRM Sales Funnel ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">📈 Lejek sprzedażowy — ten miesiąc</h3>
                        <div className="flex items-end gap-2" style={{ minHeight: 180 }}>
                            {[
                                { label: 'Leady', value: metrics?.leadsThisMonth || 0, color: 'from-blue-500 to-blue-600', icon: '🔥' },
                                { label: 'Oferty', value: metrics?.offersCreated || 0, color: 'from-indigo-500 to-indigo-600', icon: '📄' },
                                { label: 'Wysłane', value: metrics?.offersSent || 0, color: 'from-purple-500 to-purple-600', icon: '📧' },
                                { label: 'Pomiary', value: metrics?.measurementsScheduled || 0, color: 'from-amber-500 to-amber-600', icon: '📐' },
                                { label: 'Umowy', value: metrics?.contractsSigned || 0, color: 'from-emerald-500 to-emerald-600', icon: '✅' },
                            ].map((step, i, arr) => {
                                const maxVal = Math.max(...arr.map(s => s.value), 1);
                                const pct = Math.max(15, Math.round((step.value / maxVal) * 100));
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-2xl font-bold text-slate-800">{step.value}</span>
                                        <div className={`w-full bg-gradient-to-t ${step.color} rounded-t-xl transition-all`} style={{ height: `${pct * 1.5}px`, minHeight: 24 }}></div>
                                        <span className="text-lg">{step.icon}</span>
                                        <span className="text-xs font-medium text-slate-600">{step.label}</span>
                                        {i < arr.length - 1 && step.value > 0 && arr[i + 1].value > 0 && (
                                            <span className="text-[10px] text-slate-400">{Math.round((arr[i + 1].value / step.value) * 100)}%</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Conversion Rates ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Konwersje między etapami</h3>
                        <div className="space-y-2">
                            {[
                                { label: 'Lead → Oferta', pct: metrics?.leadsThisMonth ? Math.round(((metrics?.offersCreated || 0) / metrics.leadsThisMonth) * 100) : 0, color: 'bg-blue-500' },
                                { label: 'Oferta → Wysłana', pct: metrics?.offersCreated ? Math.round(((metrics?.offersSent || 0) / metrics.offersCreated) * 100) : 0, color: 'bg-purple-500' },
                                { label: 'Wysłana → Umowa', pct: metrics?.offersSent ? Math.round(((metrics?.contractsSigned || 0) / metrics.offersSent) * 100) : 0, color: 'bg-emerald-500' },
                            ].map((r, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-600">{r.label}</span>
                                        <span className="text-xs font-bold text-slate-700">{r.pct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${Math.min(r.pct, 100)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Pipeline Status ── */}
                    {metrics && metrics.leadsByStatus.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Pipeline — statusy leadów</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                {metrics.leadsByStatus.map((s, i) => {
                                    const statusLabels: Record<string, { label: string; icon: string; bg: string }> = {
                                        new: { label: 'Nowy', icon: '🆕', bg: 'bg-blue-50 border-blue-100 text-blue-700' },
                                        contacted: { label: 'Kontakt', icon: '📞', bg: 'bg-cyan-50 border-cyan-100 text-cyan-700' },
                                        form: { label: 'Formularz', icon: '📝', bg: 'bg-slate-50 border-slate-200 text-slate-700' },
                                        offer_sent: { label: 'Oferta', icon: '📧', bg: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
                                        measurement: { label: 'Pomiar', icon: '📐', bg: 'bg-amber-50 border-amber-100 text-amber-700' },
                                        negotiation: { label: 'Negocjacje', icon: '🤝', bg: 'bg-purple-50 border-purple-100 text-purple-700' },
                                        won: { label: 'Wygrana', icon: '🏆', bg: 'bg-green-50 border-green-100 text-green-700' },
                                        lost: { label: 'Przegrana', icon: '❌', bg: 'bg-red-50 border-red-100 text-red-700' },
                                    };
                                    const info = statusLabels[s.status] || { label: s.status, icon: '📋', bg: 'bg-slate-50 border-slate-200 text-slate-600' };
                                    return (
                                        <div key={i} className={`${info.bg} rounded-xl p-3 border text-center`}>
                                            <span className="text-xl">{info.icon}</span>
                                            <p className="text-2xl font-bold mt-1">{s.count}</p>
                                            <p className="text-xs font-medium mt-0.5">{info.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* INTEGRATIONS TAB */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'integrations' && (
                <div className="space-y-4">
                    {/* Google Analytics */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center text-white text-xl shadow-sm">📊</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">Google Analytics 4</h3>
                                <p className="text-xs text-slate-500">Śledzenie ruchu na stronie, zachowania użytkowników, źródeł wejść</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">✅ Aktywne</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">ID śledzenia</p><p className="font-mono text-slate-700 mt-0.5">G-52337R5NNZ</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Status</p><p className="text-green-600 font-medium mt-0.5">⚡ Zbiera dane</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Zdarzenia</p><p className="text-slate-700 mt-0.5">8 zdefiniowanych</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Strona</p><p className="text-slate-700 mt-0.5">polendach24.app</p></div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">📊 Otwórz Google Analytics →</a>
                            <a href="https://lookerstudio.google.com/s/qm2sM657MDk" target="_blank" rel="noopener noreferrer" className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">📈 Looker Studio — Raport GA4 →</a>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Śledzone zdarzenia</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['offer_created', 'offer_sent', 'contract_signed', 'lead_created', 'measurement_scheduled', 'ai_interaction', 'cta_click', 'search'].map(e => (
                                    <code key={e} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{e}</code>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Google Ads */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center text-white text-xl shadow-sm">💰</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">Google Ads</h3>
                                <p className="text-xs text-slate-500">Kampanie reklamowe, koszty, konwersje, ROI</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">✅ Aktywne</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">ID konta</p><p className="font-mono text-slate-700 mt-0.5">438-425-7139</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Status</p><p className="text-green-600 font-medium mt-0.5">⚡ Aktywne kampanie</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Konwersje</p><p className="text-slate-700 mt-0.5">3 zdefiniowane</p></div>
                                <div><p className="text-[10px] font-semibold text-slate-400 uppercase">Połączenie</p><p className="text-slate-700 mt-0.5">GA4 + Ads linked</p></div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://ads.google.com/aw/overview?ocid=4384257139" target="_blank" rel="noopener noreferrer" className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium">💰 Otwórz Google Ads →</a>
                            <a href="https://lookerstudio.google.com/s/oPWgAMVfHH4" target="_blank" rel="noopener noreferrer" className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">📈 Looker Studio — Raport Ads →</a>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Śledzone konwersje</p>
                            <div className="space-y-1.5">
                                {[
                                    { event: 'offer_sent', label: 'Oferta wysłana', desc: 'Klient otrzymał ofertę cenową', hasValue: true },
                                    { event: 'contract_signed', label: 'Umowa podpisana', desc: 'Zamknięcie sprzedaży — główna konwersja', hasValue: true },
                                    { event: 'lead_created', label: 'Nowy lead', desc: 'Pozyskanie nowego kontaktu', hasValue: false },
                                ].map(c => (
                                    <div key={c.event} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-100">
                                        <div>
                                            <span className="text-xs font-medium text-slate-700">{c.label}</span>
                                            <span className="text-[10px] text-slate-400 ml-2">{c.desc}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {c.hasValue && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">+wartość EUR</span>}
                                            <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{c.event}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Looker Studio */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-sm">📈</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">Google Looker Studio</h3>
                                <p className="text-xs text-slate-500">Interaktywne dashboardy z danymi GA4 i Google Ads</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">✅ 2 raporty</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <a href="https://lookerstudio.google.com/s/qm2sM657MDk" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 hover:shadow-md transition-all">
                                <p className="text-sm font-bold text-purple-800">📊 Raport Google Analytics</p>
                                <p className="text-xs text-purple-600 mt-1">Ruch na stronie, sesje, źródła, zachowania użytkowników</p>
                                <p className="text-[10px] text-purple-400 mt-2">lookerstudio.google.com →</p>
                            </a>
                            <a href="https://lookerstudio.google.com/s/oPWgAMVfHH4" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 hover:shadow-md transition-all">
                                <p className="text-sm font-bold text-amber-800">💰 Raport Google Ads</p>
                                <p className="text-xs text-amber-600 mt-1">Koszty kampanii, CPC, CTR, konwersje, ROI</p>
                                <p className="text-[10px] text-amber-400 mt-2">lookerstudio.google.com →</p>
                            </a>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                        <p className="text-xs text-blue-700"><strong>💡 Wskazówka:</strong> Dane o ruchu na stronie, kosztach kampanii i konwersjach Google znajdziesz w powyższych linkach. Zakładka "Przegląd" pokazuje dane z CRM (leady, oferty, umowy) — to Twoje wewnętrzne metryki firmy.</p>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* COMPETITORS TAB */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'competitors' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">🔍 Market Radar — 8 konkurentów</h3>
                        <p className="text-sm text-slate-500 mb-4">Rozwiń kartę aby zobaczyć szczegóły firmy. Kliknij „AI Analiza" aby prześwietlić stronę konkurenta.</p>
                        <div className="space-y-3">
                            {COMPETITORS.map((comp, i) => {
                                const isOpen = expandedCompetitor === comp.name;
                                const priceColors: Record<string, string> = { Budget: 'bg-green-100 text-green-700', Mittel: 'bg-amber-100 text-amber-700', Premium: 'bg-red-100 text-red-700', Hersteller: 'bg-slate-100 text-slate-700' };
                                return (
                                    <div key={i} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-indigo-200 shadow-md' : 'border-slate-100 bg-slate-50'}`}>
                                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white transition-all" onClick={() => setExpandedCompetitor(isOpen ? null : comp.name)}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 bg-gradient-to-br ${comp.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm`}>{comp.name.slice(0, 2)}</div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-800">{comp.name}</p>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priceColors[comp.priceRange]}`}>{comp.priceRange}</span>
                                                        {comp.employees && <span className="text-[10px] text-slate-400">👥 {comp.employees}</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">{comp.description.slice(0, 80)}...</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">{comp.region}</span>
                                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {isOpen && (
                                            <div className="border-t border-slate-200 bg-white">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-slate-100">
                                                    <div className="p-4">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Profil firmy</h4>
                                                        <p className="text-sm text-slate-700 leading-relaxed mb-3">{comp.description}</p>
                                                        <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">{comp.url} ↗</a>
                                                        {comp.founded && <p className="text-xs text-slate-400 mt-1">Założona: {comp.founded}</p>}
                                                        {comp.social && (
                                                            <div className="flex gap-2 mt-3">
                                                                {comp.social.instagram && <a href={`https://instagram.com/${comp.social.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded border border-pink-100 hover:bg-pink-100">📷 IG</a>}
                                                                {comp.social.facebook && <a href={`https://facebook.com/${comp.social.facebook}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">👍 FB</a>}
                                                                {comp.social.youtube && <a href={`https://youtube.com/@${comp.social.youtube}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 hover:bg-red-100">▶️ YT</a>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-4">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Produkty</h4>
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {comp.products.map((p, j) => <span key={j} className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{p}</span>)}
                                                        </div>
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 mt-3">Słowa kluczowe</h4>
                                                        <div className="flex flex-wrap gap-1">
                                                            {comp.keywords?.map((kw, j) => <span key={j} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{kw}</span>)}
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h4 className="text-xs font-bold text-green-600 uppercase mb-2">💪 Mocne strony</h4>
                                                        <ul className="text-xs text-slate-600 space-y-1 mb-3">
                                                            {comp.strengths.map((s, j) => <li key={j} className="flex gap-1"><span className="text-green-500">+</span> {s}</li>)}
                                                        </ul>
                                                        <h4 className="text-xs font-bold text-red-600 uppercase mb-2">🔻 Słabe strony</h4>
                                                        <ul className="text-xs text-slate-600 space-y-1">
                                                            {comp.weaknesses.map((w, j) => <li key={j} className="flex gap-1"><span className="text-red-500">−</span> {w}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-100 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-400">AI pobierze treść strony i przygotuje głębszy raport.</span>
                                                        <button onClick={(e) => { e.stopPropagation(); analyzeCompetitor(comp.name); }} disabled={loadingCompetitor === comp.name} className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium">
                                                            {loadingCompetitor === comp.name ? (
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                                                    Analizuję stronę...
                                                                </span>
                                                            ) : competitorAnalysis[comp.name] ? '🔄 Odśwież analizę AI' : '🤖 AI Analiza strony'}
                                                        </button>
                                                    </div>
                                                    {competitorAnalysis[comp.name] && (
                                                        <div className="mt-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                                                            <h4 className="text-xs font-bold text-indigo-700 uppercase mb-2">🤖 Raport AI — {comp.name}</h4>
                                                            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm">{competitorAnalysis[comp.name]}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Google Trends — Terrassenüberdachung */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">📈 Google Trends — Branża zadaszeniowa DE</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                <iframe
                                    src="https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22Terrassen%C3%BCberdachung%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%2C%7B%22keyword%22%3A%22Wintergarten%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-60"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                ></iframe>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                <iframe
                                    src="https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22Carport%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%2C%7B%22keyword%22%3A%22Pergola%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-60"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* ═══════════════════════════════════════════════════════ */}
            {/* KEYWORDS TAB */}
            {/* ═══════════════════════════════════════════════════════ */}
            {
                activeTab === 'keywords' && (
                    <div className="space-y-4">
                        {/* Static keyword table */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800">🗝️ Słowa kluczowe — Rynek DE</h3>
                                <button
                                    onClick={generateKeywordAnalysis}
                                    disabled={loadingKeywords}
                                    className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {loadingKeywords ? (
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                            Analizuję...
                                        </span>
                                    ) : '🧠 AI Analiza słów kluczowych'}
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-slate-200">
                                            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase">Słowo kluczowe</th>
                                            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase text-center">Wolumen</th>
                                            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase text-center">Trudność</th>
                                            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase text-center">Priorytet</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {TARGET_KEYWORDS.map((kw, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="py-3 font-medium text-slate-700">{kw.keyword}</td>
                                                <td className="py-3 text-center text-slate-500">{kw.volume}</td>
                                                <td className="py-3 text-center">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kw.difficulty === 'hoch' ? 'bg-red-100 text-red-700' :
                                                        kw.difficulty === 'mittel' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>{kw.difficulty}</span>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className={`text-xs font-bold ${i < 3 ? 'text-red-600' : i < 6 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                        {i < 3 ? '🔥 Wysoki' : i < 6 ? '⚡ Średni' : '💤 Niski'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* AI Keyword Analysis */}
                        {keywordAnalysis && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🤖</span>
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">AI Analiza słów kluczowych</h3>
                                </div>
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                                    {keywordAnalysis}
                                </div>
                            </div>
                        )}

                        {/* Google Trends */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">📈 Google Trends — Live</h3>
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                                <iframe
                                    src="https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22Terrassen%C3%BCberdachung%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%2C%7B%22keyword%22%3A%22Wintergarten%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%2C%7B%22keyword%22%3A%22Carport%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%2C%7B%22keyword%22%3A%22Pergola%22%2C%22geo%22%3A%22DE%22%2C%22time%22%3A%22today%2012-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D&tz=-60"
                                    width="100%"
                                    height="350"
                                    style={{ border: 0 }}
                                ></iframe>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════════════════════════════════════ */}
            {/* AI STRATEGY TAB */}
            {/* ═══════════════════════════════════════════════════════ */}
            {
                activeTab === 'ai' && (
                    <div className="space-y-4">
                        {aiAnalysis ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                                        <span className="text-lg">🤖</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">AI Strateg Marketingowy</h3>
                                        <p className="text-xs text-slate-400">Analiza oparta na GPT-4o + danych z CRM</p>
                                    </div>
                                </div>
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                                    {aiAnalysis}
                                </div>
                                <button onClick={() => setAiAnalysis('')} className="mt-4 text-xs text-slate-400 hover:text-slate-600">
                                    🔄 Wygeneruj ponownie
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-200/50 p-8 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-4xl">🤖</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">AI Strateg Marketingowy</h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                                    AI przeanalizuje Twoje dane z CRM, porówna z konkurencją i zaproponuje strategię marketingową na rynek niemiecki.
                                </p>
                                <button
                                    onClick={generateAIAnalysis}
                                    disabled={loadingAI || loading}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50"
                                >
                                    {loadingAI ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            AI analizuje dane...
                                        </>
                                    ) : (
                                        <>🧠 Wygeneruj strategię marketingową</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};
