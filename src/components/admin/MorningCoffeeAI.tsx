import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useMorningCoffeeData } from './useMorningCoffeeData';
import { DatabaseService } from '../../services/database';
import {
    ChevronDown, Coffee, Target, TrendingUp, AlertCircle, Package, Users,
    Globe, BarChart3, Sparkles, RefreshCw, Plus, Check, X, ClipboardList,
    Loader2, Bot, Lightbulb, Truck, Rocket, ListChecks
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   MORNING COFFEE AI — Business Intelligence Assistant
   ═══════════════════════════════════════════════════════════ */

// ─── Constants ──────────────────────────────────────────────
const INDUSTRY_TIPS = [
    { icon: '🏗️', title: 'Sezon budowlany', tip: 'Marzec-Maj to szczyt zapytań o Terrassenüberdachung. Wykorzystaj to okno na push marketingowy.' },
    { icon: '📈', title: 'Trend: Wintergarten', tip: 'Ogrody zimowe zyskują popularność — klienci szukają rozwiązań całorocznych z izolacją.' },
    { icon: '🌿', title: 'Ekologia', tip: 'Klienci pytają o materiały zrównoważone. Akzentuuj recyklowalność aluminium.' },
    { icon: '💡', title: 'Cross-selling', tip: 'Każdy klient pergoli to potencjalny klient LED, ogrzewania IR, ścian bocznych — proponuj pakiety!' },
    { icon: '🎯', title: 'Carport boom', tip: 'Carporty aluminiowe to szybko rosnący segment — niski próg wejścia, wysoka marża.' },
    { icon: '📱', title: 'Social selling', tip: 'Zdjęcia realizacji na Instagram generują do 40% więcej zapytań niż reklamy.' },
    { icon: '⚡', title: 'Speed kills', tip: 'Odpowiedź na zapytanie w <1h = 7x większa szansa na konwersję.' },
    { icon: '🤝', title: 'Google Reviews', tip: 'Każda realizacja to szansa na opinię. 4.5+ gwiazdek = +20-30% konwersji.' },
    { icon: '🔧', title: 'Serwis = zysk', tip: 'Serwis posezonowy to stały dochód i budowanie relacji.' },
    { icon: '📊', title: 'CPC monitoring', tip: '"Terrassenüberdachung" kosztuje 3-5€ CPC — regularnie sprawdzaj ROI.' },
    { icon: '🏠', title: 'Kalt Wintergarten', tip: 'Tańsza alternatywa — świetny produkt na klientów z ograniczonym budżetem.' },
    { icon: '🌡️', title: 'Smart Home', tip: 'Automatyczne dachy + czujniki pogodowe = USP przyszłości.' },
];
const MARKET_KEYWORDS = ['Terrassenüberdachung', 'Wintergarten', 'Kalt Wintergarten', 'Carport', 'Pergola', 'Lamellendach', 'Glasdach', 'Sonnenschutz'];
const dayIdx = new Date().getDate() % INDUSTRY_TIPS.length;

// Trend arrow helper
function TrendArrow({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
    if (previous === 0) return <span className="text-[10px] text-slate-400">—</span>;
    const pct = Math.round(((current - previous) / previous) * 100);
    const up = pct >= 0;
    return (
        <span className={`text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? '↑' : '↓'} {Math.abs(pct)}%{suffix}
        </span>
    );
}

// Collapsible section
function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">{icon}</span>
                    <span className="text-xs font-semibold text-slate-700">{title}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="px-3 pb-3 pt-1 space-y-2 bg-white">{children}</div>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const MorningCoffeeAI: React.FC = () => {
    const { state, adminData, salesData, isAdmin, refresh } = useMorningCoffeeData();
    const [collapsed, setCollapsed] = useState(true);
    const [aiInsight, setAiInsight] = useState('');
    const [aiInsightType, setAiInsightType] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [extractedTasks, setExtractedTasks] = useState<{ title: string; description: string; priority: 'high' | 'medium' | 'low'; created: boolean }[]>([]);
    const [creatingTask, setCreatingTask] = useState<number | null>(null);

    // Extract actionable tasks from AI markdown output
    function extractTasksFromAI(text: string) {
        const tasks: { title: string; description: string; priority: 'high' | 'medium' | 'low'; created: boolean }[] = [];
        const lines = text.split('\n');
        let currentSection = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Track sections for priority assignment
            if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
                currentSection = trimmed.toLowerCase();
                continue;
            }
            // Extract bullet points and numbered items as tasks
            const bulletMatch = trimmed.match(/^[-•*]\s+\*?\*?(.+?)\*?\*?$/);
            const numberedMatch = trimmed.match(/^\d+[.)\-]\s+\*?\*?(.+?)\*?\*?$/);
            const match = bulletMatch || numberedMatch;
            
            if (match && match[1].length > 15 && match[1].length < 200) {
                const taskText = match[1].replace(/\*\*/g, '').replace(/\*/g, '').trim();
                // Skip headers or non-actionable items  
                if (taskText.startsWith('Powered by') || taskText.startsWith('AI Coach')) continue;
                
                let priority: 'high' | 'medium' | 'low' = 'medium';
                if (currentSection.includes('pilne') || currentSection.includes('urgent') || currentSection.includes('🔴')) priority = 'high';
                else if (currentSection.includes('strategia') || currentSection.includes('rozwój') || currentSection.includes('risk')) priority = 'low';
                else if (currentSection.includes('szanse') || currentSection.includes('zadanie')) priority = 'high';
                
                tasks.push({ title: taskText, description: `Źródło: AI Coach (${aiInsightType})\nSekcja: ${currentSection.replace(/[#]/g, '').trim()}`, priority, created: false });
            }
        }
        setExtractedTasks(tasks);
        if (tasks.length === 0) toast('Nie znaleziono konkretnych zadań do wyodrębnienia', { icon: '🤔' });
    }

    async function createTaskFromAI(index: number) {
        const task = extractedTasks[index];
        if (!task || task.created) return;
        setCreatingTask(index);
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            
            await DatabaseService.createTask({
                title: task.title,
                description: task.description,
                dueDate: tomorrow.toISOString(),
                priority: task.priority,
                type: 'task',
                status: 'pending',
                userId: '', // Will default to current user in TaskService
            });
            setExtractedTasks(prev => prev.map((t, i) => i === index ? { ...t, created: true } : t));
            toast.success(`Zadanie utworzone: ${task.title.substring(0, 40)}...`);
        } catch (err) {
            console.error(err);
            toast.error('Błąd tworzenia zadania');
        } finally { setCreatingTask(null); }
    }

    async function createAllTasksFromAI() {
        const uncreated = extractedTasks.filter(t => !t.created);
        if (uncreated.length === 0) return;
        for (let i = 0; i < extractedTasks.length; i++) {
            if (!extractedTasks[i].created) await createTaskFromAI(i);
        }
        toast.success(`Utworzono ${uncreated.length} zadań!`);
    }

    // Build business data string for AI
    function buildBusinessData(): string {
        if (isAdmin && adminData) {
            return `- Zaległe leady (>3 dni): ${adminData.staleLeads}
- Nowe leady dziś: ${adminData.newLeadsToday}
- Łącznie leadów: ${adminData.totalLeads}
- Oferty w toku: ${adminData.pendingOffers}
- Pipeline value: ${adminData.pipelineValue} EUR
- Śr. wartość kontraktu: ${adminData.avgDealSize} EUR
- Lead velocity: ${adminData.leadVelocity.thisWeek}/tydz (pop.: ${adminData.leadVelocity.lastWeek})
- Cykl sprzedaży: ${adminData.salesCycleDays} dni
- Montaże w tym tygodniu: ${adminData.upcomingInstallations}
- Pomiary w tym tygodniu: ${adminData.upcomingMeasurements}
- Umowy ten miesiąc: ${adminData.contractsThisMonth} (pop.: ${adminData.lastMonthContracts})
- Obrót: ${Math.round(adminData.revenueThisMonth)} EUR (pop.: ${adminData.lastMonthRevenue} EUR)
- Źródła leadów: ${Object.entries(adminData.leadsBySource).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Ranking: ${adminData.teamRanking.map((r, i) => `${i + 1}. ${r.name} (${r.won} wygranych, ${r.revenue}€, ${r.stale} zaległ.)`).join('; ')}

### LOGISTYKA I ZAMÓWIENIA:
- Pozycje oczekujące na zamówienie: ${adminData.procurementPending} (wartość: ${adminData.procurementPendingValue} EUR)
- Pozycje zamówione (w drodze): ${adminData.procurementOrdered} (wartość: ${adminData.procurementOrderedValue} EUR)
- Pozycje dostarczone: ${adminData.procurementDelivered}
- Umowy gotowe do montażu (wszystko dostarczone): ${adminData.contractsReadyForInstallation}
- Nadchodzące montaże: ${adminData.upcomingInstallationDetails.map(i => `${i.name} (${i.date}${i.city ? ', ' + i.city : ''})`).join('; ') || 'brak'}`;
        }
        if (salesData) {
            return `- Nieobrobione leady: ${salesData.unprocessedLeads}
- Oferty >7 dni: ${salesData.offersWaiting}
- Negocjacje >5 dni: ${salesData.negotiationStale}
- Pomiary: ${salesData.myMeasurements}, Montaże: ${salesData.myInstallations}
- Wygrane: ${salesData.myWonThisMonth}, Konwersja: ${salesData.conversionRate}
- Gorące leady: ${salesData.hotLeadNames.join(', ') || 'brak'}`;
        }
        return '';
    }

    // ─── CLAUDE AI ANALYSIS (for admin) ─────────────────────
    async function runClaudeAnalysis(analysisType: string) {
        setLoadingAI(true);
        setAiInsightType(analysisType);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const res = await supabase.functions.invoke('morning-coffee-ai', {
                body: { analysisType, businessData: buildBusinessData() },
            });
            
            if (res.error) {
                console.error('Morning Coffee AI invoke error:', res.error);
                throw new Error(res.error.message || 'Edge function error');
            }
            
            const content = res.data?.content;
            if (!content) {
                console.warn('Morning Coffee AI: empty response', res.data);
                throw new Error('Empty AI response');
            }
            setAiInsight(content);
        } catch (err) {
            console.error(err);
            // Fallback to ai-assistant if morning-coffee-ai doesn't exist yet
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw err;
                const rolePrompt = analysisType === 'market_analysis'
                    ? 'Wygeneruj analizę rynku zadaszeniowego DACH. Trendy, konkurencja (Weinor, Warema, Solarlux), szybki win, benchmark, pomysł na rozwój.'
                    : analysisType === 'team_coaching'
                        ? 'Wygeneruj coaching zespołu sprzedaży. Top performer, kto potrzebuje pomocy, plan na tydzień.'
                        : analysisType === 'growth_strategy'
                            ? 'Wygeneruj 90-dniowy plan rozwoju firmy. Diagnoza, 3 priorytety, skalowanie, ryzyka.'
                            : 'Wygeneruj poranny briefing: PILNE, SZANSE, STRATEGIA, jedno zadanie na dziś.';
                const res = await supabase.functions.invoke('ai-assistant', {
                    body: { messages: [{ role: 'user', content: `${rolePrompt}\n\nDane:\n${buildBusinessData()}` }], context: { userRole: 'admin', currentPage: 'dashboard' } },
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                setAiInsight(res.data?.content || '⚠️ Brak odpowiedzi.');
            } catch (e2) {
                setAiInsight('⚠️ Nie udało się wygenerować analizy.');
            }
        } finally { setLoadingAI(false); }
    }

    // ─── SALES REP AI (simpler, uses ai-assistant) ──────────
    async function generateSalesInsight() {
        setLoadingAI(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');
            const res = await supabase.functions.invoke('ai-assistant', {
                body: { messages: [{ role: 'user', content: `Wygeneruj KRÓTKI poranny briefing sprzedażowy (max 4 zdania). Mów wprost: komu dzwonić, co robić TERAZ. Bądź motywujący!\n\n${buildBusinessData()}` }], context: { userRole: 'sales_rep', currentPage: 'dashboard' } },
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            setAiInsight(res.data?.content || '⚠️ Brak odpowiedzi.');
        } catch (err) {
            setAiInsight('⚠️ Nie udało się wygenerować insightu.');
        } finally { setLoadingAI(false); }
    }



    // ─── LOADING / ERROR ────────────────────────────────────
    if (state === 'idle' || state === 'loading') {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                    <div>
                        <div className="h-4 bg-slate-100 rounded w-40 animate-pulse" />
                        <div className="h-3 bg-slate-50 rounded w-28 mt-1 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                    {[1, 2, 3, 4].map(n => <div key={n} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}
                </div>
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className="bg-white rounded-xl border border-red-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg text-red-500"><AlertCircle className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Poranna Kawa — błąd ładowania</h3>
                        <p className="text-xs text-slate-500">Nie udało się pobrać danych.</p>
                    </div>
                    <button onClick={refresh} className="ml-auto flex items-center gap-1.5 text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium">
                        <RefreshCw className="w-3.5 h-3.5" /> Spróbuj ponownie
                    </button>
                </div>
            </div>
        );
    }

    // ─── URGENCY ────────────────────────────────────────────
    const urgentCount = isAdmin
        ? (adminData?.staleLeads || 0)
        : ((salesData?.offersWaiting || 0) + (salesData?.negotiationStale || 0) + (salesData?.unprocessedLeads || 0));
    const hasUrgent = urgentCount > 0;

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            {/* HEADER */}
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAdmin ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isAdmin ? <Coffee className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">{isAdmin ? 'Poranna Kawa z AI' : 'Twój Plan Sprzedażowy'}</h3>
                        <p className="text-[10px] text-slate-400">{isAdmin ? 'Business Intelligence • Analiza • Strategia' : 'Pipeline • Follow-up • Wyniki'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasUrgent && (
                        <span className={`text-[10px] font-semibold ${urgentCount > 5 ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-50'} px-2 py-0.5 rounded-full`}>
                            {isAdmin ? `${adminData?.staleLeads} zaległych` : `${urgentCount} do akcji`}
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
                </div>
            </button>

            {/* BODY */}
            {!collapsed && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">

                    {/* ══════════ ADMIN VIEW ══════════ */}
                    {isAdmin && adminData && (
                        <>
                            {/* 1. PULSE FIRMY */}
                            <Section title="Pulse firmy" icon={<BarChart3 className="w-4 h-4" />} defaultOpen={true}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Link to="/leads" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-red-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`w-2 h-2 rounded-full ${adminData.staleLeads > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Zaległe</span>
                                        </div>
                                        <p className={`text-xl font-bold ${adminData.staleLeads > 0 ? 'text-red-600' : 'text-green-600'}`}>{adminData.staleLeads}</p>
                                        <p className="text-[9px] text-slate-400">nowe/form./skontak. &gt;3d</p>
                                    </Link>
                                    <Link to="/offers" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Pipeline</span>
                                        </div>
                                        <p className="text-xl font-bold text-blue-600">{adminData.pipelineValue > 0 ? `${Math.round(adminData.pipelineValue / 1000)}k` : adminData.pendingOffers}</p>
                                        <p className="text-[9px] text-slate-400">{adminData.pipelineValue > 0 ? 'EUR w ofertach' : 'ofert w toku'}</p>
                                    </Link>
                                    <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Ten tydzień</span>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-600">{adminData.upcomingInstallations}</p>
                                        <p className="text-[9px] text-slate-400">montaży • {adminData.upcomingMeasurements} pomiarów</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-violet-500" />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Obrót</span>
                                        </div>
                                        <p className="text-xl font-bold text-violet-600">{adminData.revenueThisMonth > 0 ? `${Math.round(adminData.revenueThisMonth / 1000)}k` : '0'}</p>
                                        <p className="text-[9px] text-slate-400">EUR • {adminData.contractsThisMonth} umów</p>
                                    </div>
                                </div>
                                {/* Extended KPIs */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Śr. kontrakt</p>
                                        <p className="text-sm font-bold text-slate-700">{adminData.avgDealSize > 0 ? `${Math.round(adminData.avgDealSize / 1000)}k €` : '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Cykl sprzedaży</p>
                                        <p className="text-sm font-bold text-slate-700">{adminData.salesCycleDays > 0 ? `${adminData.salesCycleDays} dni` : '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Lead velocity</p>
                                        <p className="text-sm font-bold text-slate-700">{adminData.leadVelocity.thisWeek}/tydz</p>
                                        <TrendArrow current={adminData.leadVelocity.thisWeek} previous={adminData.leadVelocity.lastWeek} />
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Nowych dziś</p>
                                        <p className="text-sm font-bold text-slate-700">{adminData.newLeadsToday}</p>
                                    </div>
                                </div>
                                {adminData.staleLeads > 0 && adminData.topStaleLeadNames.length > 0 && (
                                    <div className="bg-red-50/50 border border-red-100 rounded-lg p-2">
                                        <p className="text-[10px] font-semibold text-red-700 mb-1">🔴 Wymagają kontaktu:</p>
                                        <div className="flex flex-wrap gap-1">{adminData.topStaleLeadNames.map((n, i) => <span key={i} className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded border border-red-200 font-medium">{n}</span>)}</div>
                                    </div>
                                )}
                            </Section>

                            {/* 1b. LOGISTYKA */}
                            <Section title="Logistyka & Zamówienia" icon={<Truck className="w-4 h-4" />} defaultOpen={true}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Link to="/procurement" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`w-2 h-2 rounded-full ${adminData.procurementPending > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Do zamówienia</span>
                                        </div>
                                        <p className={`text-xl font-bold ${adminData.procurementPending > 0 ? 'text-amber-600' : 'text-green-600'}`}>{adminData.procurementPending}</p>
                                        <p className="text-[9px] text-slate-400">{adminData.procurementPendingValue > 0 ? `${adminData.procurementPendingValue}€ wartość` : 'pozycji'}</p>
                                    </Link>
                                    <Link to="/procurement" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">W drodze</span>
                                        </div>
                                        <p className="text-xl font-bold text-blue-600">{adminData.procurementOrdered}</p>
                                        <p className="text-[9px] text-slate-400">{adminData.procurementOrderedValue > 0 ? `${adminData.procurementOrderedValue}€ zamówione` : 'pozycji'}</p>
                                    </Link>
                                    <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Dostarczone</span>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-600">{adminData.procurementDelivered}</p>
                                        <p className="text-[9px] text-slate-400">pozycji</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`w-2 h-2 rounded-full ${adminData.contractsReadyForInstallation > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase">Gotowe do montażu</span>
                                        </div>
                                        <p className={`text-xl font-bold ${adminData.contractsReadyForInstallation > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{adminData.contractsReadyForInstallation}</p>
                                        <p className="text-[9px] text-slate-400">umów kompletnych</p>
                                    </div>
                                </div>
                                {adminData.upcomingInstallationDetails.length > 0 && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2">
                                        <p className="text-[10px] font-semibold text-blue-700 mb-1">🔧 Montaże w tym tygodniu:</p>
                                        <div className="flex flex-wrap gap-1">{adminData.upcomingInstallationDetails.map((inst, i) => <span key={i} className="text-[10px] bg-white text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-medium">{inst.name}{inst.city ? ` (${inst.city})` : ''} — {new Date(inst.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>)}</div>
                                    </div>
                                )}
                                <button onClick={() => runClaudeAnalysis('logistics_briefing')} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                    {loadingAI && aiInsightType === 'logistics_briefing' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizuję logistykę...</> : <><Package className="w-3.5 h-3.5" /> AI Plan Logistyki</>}
                                </button>
                            </Section>

                            {/* 2. TRENDY */}
                            <Section title="Trendy — miesiąc do miesiąca" icon={<TrendingUp className="w-4 h-4" />} defaultOpen={true}>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Umowy</p>
                                        <p className="text-lg font-bold text-slate-700">{adminData.contractsThisMonth}</p>
                                        <TrendArrow current={adminData.contractsThisMonth} previous={adminData.lastMonthContracts} suffix=" vs pop." />
                                    </div>
                                    <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Obrót EUR</p>
                                        <p className="text-lg font-bold text-slate-700">{adminData.revenueThisMonth > 0 ? `${Math.round(adminData.revenueThisMonth / 1000)}k` : '0'}</p>
                                        <TrendArrow current={adminData.revenueThisMonth} previous={adminData.lastMonthRevenue} suffix=" vs pop." />
                                    </div>
                                    <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase">Leady</p>
                                        <p className="text-lg font-bold text-slate-700">{adminData.totalLeads}</p>
                                        <TrendArrow current={adminData.totalLeads} previous={adminData.lastMonthLeads} suffix=" vs pop." />
                                    </div>
                                </div>
                                {Object.keys(adminData.leadsBySource).length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Źródła leadów (ten miesiąc)</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(adminData.leadsBySource).sort(([, a], [, b]) => b - a).slice(0, 6).map(([src, cnt]) => (
                                                <span key={src} className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">{src}: {cnt}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>

                            {/* 3. RANKING ZESPOŁU */}
                            {adminData.teamRanking.length > 0 && (
                                <Section title="Ranking zespołu" icon={<Users className="w-4 h-4" />} defaultOpen={false}>
                                    <div className="space-y-1.5">
                                        {adminData.teamRanking.map((rep, i) => (
                                            <div key={i} className={`flex items-center justify-between bg-white rounded-lg px-3 py-2 border ${i === 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-400 w-5">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                                                    <span className="text-xs font-semibold text-slate-700">{rep.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px]">
                                                    <span className="text-emerald-600 font-bold">{rep.won} ✓</span>
                                                    <span className="text-blue-600 font-medium">{rep.revenue > 0 ? `${Math.round(rep.revenue / 1000)}k€` : '—'}</span>
                                                    <span className="text-slate-400">{rep.leadsAssigned} leadów</span>
                                                    {rep.stale > 0 && <span className="text-red-500 font-bold">{rep.stale} zaległych!</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {/* 4. BRANŻA & ROZWÓJ */}
                            <Section title="Branża & Rozwój" icon={<Globe className="w-4 h-4" />} defaultOpen={false}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                                        <div className="flex items-start gap-2">
                                            <span className="text-base">{INDUSTRY_TIPS[dayIdx].icon}</span>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-700">{INDUSTRY_TIPS[dayIdx].title}</p>
                                                <p className="text-[10px] text-slate-500 leading-relaxed">{INDUSTRY_TIPS[dayIdx].tip}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                                        <div className="flex items-start gap-2">
                                            <span className="text-base">{INDUSTRY_TIPS[(dayIdx + 1) % INDUSTRY_TIPS.length].icon}</span>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-700">{INDUSTRY_TIPS[(dayIdx + 1) % INDUSTRY_TIPS.length].title}</p>
                                                <p className="text-[10px] text-slate-500 leading-relaxed">{INDUSTRY_TIPS[(dayIdx + 1) % INDUSTRY_TIPS.length].tip}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">🔑 Śledzone słowa kluczowe</p>
                                    <div className="flex flex-wrap gap-1">{MARKET_KEYWORDS.map((kw, i) => <span key={i} className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{kw}</span>)}</div>
                                </div>
                                <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                    {loadingAI && aiInsightType === 'market_analysis' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizuję rynek...</> : <><Sparkles className="w-3.5 h-3.5" /> AI Analiza Rynku</>}
                                </button>
                            </Section>

                            {/* FOOTER */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                                <span>{adminData.totalLeads} leadów • {adminData.newLeadsToday} nowych • pipeline {adminData.pipelineValue > 0 ? `${Math.round(adminData.pipelineValue / 1000)}k€` : '—'}</span>
                                <button onClick={() => { setAiInsight(''); refresh(); }} className="flex items-center gap-1 hover:text-slate-600">
                                    <RefreshCw className="w-3 h-3" /> Odśwież
                                </button>
                            </div>
                        </>
                    )}

                    {/* ══════════ SALES REP VIEW ══════════ */}
                    {!isAdmin && salesData && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Link to="/leads" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-1.5 mb-0.5"><span className={`w-2 h-2 rounded-full ${salesData.unprocessedLeads > 0 ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} /><span className="text-[9px] font-semibold text-slate-500 uppercase">Do obróbki</span></div>
                                    <p className={`text-xl font-bold ${salesData.unprocessedLeads > 3 ? 'text-orange-600' : 'text-slate-700'}`}>{salesData.unprocessedLeads}</p>
                                    <p className="text-[9px] text-slate-400">{salesData.unprocessedBreakdown.new > 0 && `${salesData.unprocessedBreakdown.new} nowych`}{salesData.unprocessedBreakdown.formularz > 0 && ` • ${salesData.unprocessedBreakdown.formularz} form.`}{salesData.unprocessedBreakdown.contacted > 0 && ` • ${salesData.unprocessedBreakdown.contacted} skontak.`}</p>
                                </Link>
                                <Link to="/leads" className="bg-white rounded-xl p-2.5 border border-slate-100 hover:border-red-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-1.5 mb-0.5"><span className={`w-2 h-2 rounded-full ${(salesData.offersWaiting + salesData.negotiationStale) > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} /><span className="text-[9px] font-semibold text-slate-500 uppercase">Follow-up</span></div>
                                    <p className={`text-xl font-bold ${(salesData.offersWaiting + salesData.negotiationStale) > 0 ? 'text-red-600' : 'text-green-600'}`}>{salesData.offersWaiting + salesData.negotiationStale}</p>
                                    <p className="text-[9px] text-slate-400">{salesData.offersWaiting > 0 && `${salesData.offersWaiting} ofert >7d`}{salesData.negotiationStale > 0 && ` • ${salesData.negotiationStale} negocj.`}</p>
                                </Link>
                                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                    <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] font-semibold text-slate-500 uppercase">Ten tydzień</span></div>
                                    <p className="text-xl font-bold text-blue-600">{salesData.myMeasurements}</p>
                                    <p className="text-[9px] text-slate-400">pomiarów • {salesData.myInstallations} montaży</p>
                                </div>
                                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                                    <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-semibold text-slate-500 uppercase">Wynik</span></div>
                                    <p className="text-xl font-bold text-emerald-600">{salesData.myWonThisMonth}</p>
                                    <p className="text-[9px] text-slate-400">wygranych • {salesData.conversionRate}</p>
                                </div>
                            </div>
                            {salesData.followUpLeadNames.length > 0 && (
                                <div className="bg-red-50/50 border border-red-100 rounded-lg p-2">
                                    <p className="text-[10px] font-semibold text-red-700 mb-1">📞 Zadzwoń DZIŚ:</p>
                                    <div className="flex flex-wrap gap-1">{salesData.followUpLeadNames.map((n, i) => <span key={i} className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded border border-red-200 font-medium">{n}</span>)}</div>
                                </div>
                            )}
                            {salesData.hotLeadNames.length > 0 && (
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2">
                                    <p className="text-[10px] font-semibold text-emerald-700 mb-1">🔥 Gorące leady:</p>
                                    <div className="flex flex-wrap gap-1">{salesData.hotLeadNames.map((n, i) => <span key={i} className="text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">{n}</span>)}</div>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                                <span>{salesData.unprocessedLeads} do obróbki • {salesData.offersWaiting + salesData.negotiationStale} follow-up • {salesData.hotLeadNames.length} gorących</span>
                                <button onClick={() => { setAiInsight(''); refresh(); }} className="flex items-center gap-1 hover:text-slate-600">
                                    <RefreshCw className="w-3 h-3" /> Odśwież
                                </button>
                            </div>
                        </>
                    )}

                    {/* ══════════ AI COACH — Claude Powered ══════════ */}
                    {aiInsight ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-semibold text-slate-700">{isAdmin ? 'AI Business Coach' : 'AI Coach'}</span>
                                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Claude</span>
                                </div>
                                <button onClick={() => setAiInsight('')} className="text-slate-400 hover:text-slate-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiInsight}</p>
                            
                            {/* ── EXTRACTED TASKS ── */}
                            {extractedTasks.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                                            <span className="text-xs font-semibold text-slate-700">Wyodrębnione zadania ({extractedTasks.filter(t => !t.created).length})</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={createAllTasksFromAI} disabled={extractedTasks.every(t => t.created)} className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded-lg hover:bg-slate-700 font-medium disabled:opacity-40 transition-colors"><Check className="w-3 h-3 inline mr-0.5" />Utwórz wszystkie</button>
                                            <button onClick={() => setExtractedTasks([])} className="text-slate-400 hover:text-slate-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {extractedTasks.map((task, i) => (
                                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${task.created ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                                <span className={`text-[11px] flex-1 ${task.created ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task.title}</span>
                                                {task.created ? (
                                                <span className="text-[9px] text-emerald-600 font-semibold"><Check className="w-3 h-3 inline" /> Utworzone</span>
                                                ) : (
                                                    <button
                                                        onClick={() => createTaskFromAI(i)}
                                                        disabled={creatingTask === i}
                                                        className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-100 font-medium disabled:opacity-50 flex-shrink-0 transition-colors"
                                                    >
                                                        {creatingTask === i ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <><Plus className="w-3 h-3 inline" /> Utwórz</>}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                                    <button onClick={() => { setExtractedTasks([]); extractTasksFromAI(aiInsight); }} className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-lg hover:bg-slate-700 font-medium transition-colors flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Wyodrębnij zadania</button>
                                    <button onClick={() => runClaudeAnalysis('daily_briefing')} disabled={loadingAI} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 flex items-center gap-1"><Coffee className="w-3 h-3" /> Briefing</button>
                                    <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 flex items-center gap-1"><Globe className="w-3 h-3" /> Rynek</button>
                                    <button onClick={() => runClaudeAnalysis('team_coaching')} disabled={loadingAI} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 flex items-center gap-1"><Users className="w-3 h-3" /> Zespół</button>
                                    <button onClick={() => runClaudeAnalysis('growth_strategy')} disabled={loadingAI} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50 flex items-center gap-1"><Rocket className="w-3 h-3" /> Strategia</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {isAdmin ? (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                    <button onClick={() => runClaudeAnalysis('daily_briefing')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'daily_briefing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coffee className="w-3.5 h-3.5" />} Poranna Kawa
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'market_analysis' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Rynek
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('team_coaching')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'team_coaching' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />} Zespół
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('growth_strategy')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'growth_strategy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Rozwój
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('logistics_briefing')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'logistics_briefing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} Logistyka
                                    </button>
                                </div>
                            ) : (
                                <button onClick={generateSalesInsight} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    {loadingAI ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Generuję...</>
                                    ) : (
                                        <><Bot className="w-4 h-4" /> AI Coach — co zrobić żeby sprzedać?</>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
