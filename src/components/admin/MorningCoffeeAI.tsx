import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useMorningCoffeeData } from './useMorningCoffeeData';
import { DatabaseService } from '../../services/database';

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
function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200/60 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-white/50 hover:bg-white/80 transition-colors text-left">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs font-bold text-slate-700">{title}</span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>}
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
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 rounded-2xl border border-amber-200/50 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-200 rounded-xl animate-pulse" />
                    <div>
                        <div className="h-5 bg-amber-200 rounded w-48 animate-pulse" />
                        <div className="h-3 bg-amber-100 rounded w-32 mt-1 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4">
                    {[1, 2, 3, 4].map(n => <div key={n} className="h-16 bg-amber-100 rounded-xl animate-pulse" />)}
                </div>
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl border border-red-200/50 p-5">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-bold text-slate-800">Poranna Kawa — błąd ładowania</h3>
                        <p className="text-xs text-slate-500">Nie udało się pobrać danych.</p>
                    </div>
                    <button onClick={refresh} className="ml-auto text-sm bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium">🔄 Spróbuj ponownie</button>
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
        <div className={`bg-gradient-to-r ${isAdmin ? 'from-amber-50 via-orange-50 to-rose-50' : 'from-blue-50 via-indigo-50 to-purple-50'} rounded-2xl border ${hasUrgent ? 'border-red-200' : 'border-amber-200/50'} shadow-sm overflow-hidden`}>

            {/* HEADER */}
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${isAdmin ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600'} rounded-xl flex items-center justify-center text-white shadow-md`}>
                        <span className="text-lg">{isAdmin ? '☕' : '🎯'}</span>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{isAdmin ? 'Poranna Kawa z AI' : 'Twój Plan Sprzedażowy'}</h3>
                        <p className="text-[10px] text-slate-500">{isAdmin ? 'Business Intelligence • Analiza • Strategia' : 'Pipeline • Follow-up • Wyniki'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasUrgent && (
                        <span className={`text-[10px] font-bold ${urgentCount > 5 ? 'text-red-600 bg-red-100 animate-pulse' : 'text-amber-700 bg-amber-100'} px-2 py-1 rounded-full`}>
                            {isAdmin ? `${adminData?.staleLeads} zaległych` : `${urgentCount} do akcji`}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">{collapsed ? 'Rozwiń' : 'Zwiń'}</span>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* BODY */}
            {!collapsed && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">

                    {/* ══════════ ADMIN VIEW ══════════ */}
                    {isAdmin && adminData && (
                        <>
                            {/* 1. PULSE FIRMY */}
                            <Section title="Pulse firmy" icon="📊" defaultOpen={true}>
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
                            <Section title="Logistyka & Zamówienia" icon="📦" defaultOpen={true}>
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
                                <button onClick={() => runClaudeAnalysis('logistics_briefing')} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                    {loadingAI && aiInsightType === 'logistics_briefing' ? <>⏳ Analizuję logistykę (Claude)...</> : <>📦 AI Plan Logistyki — co zamówić, co pilne</>}
                                </button>
                            </Section>

                            {/* 2. TRENDY */}
                            <Section title="Trendy — miesiąc do miesiąca" icon="📈" defaultOpen={true}>
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
                                <Section title="Ranking zespołu" icon="👥" defaultOpen={false}>
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
                            <Section title="Branża & Rozwój" icon="🌍" defaultOpen={false}>
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
                                <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                    {loadingAI && aiInsightType === 'market_analysis' ? <>⏳ Analizuję rynek (Claude)...</> : <>🧠 AI Analiza Rynku — trendy, konkurencja, rozwój</>}
                                </button>
                            </Section>

                            {/* FOOTER */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-amber-200/30 pt-2">
                                <span>📊 {adminData.totalLeads} leadów • {adminData.newLeadsToday} nowych • pipeline {adminData.pipelineValue > 0 ? `${Math.round(adminData.pipelineValue / 1000)}k€` : '—'}</span>
                                <button onClick={() => { setAiInsight(''); refresh(); }} className="hover:text-slate-600">🔄 Odśwież</button>
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
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-blue-200/30 pt-2">
                                <span>🎯 {salesData.unprocessedLeads} do obróbki • {salesData.offersWaiting + salesData.negotiationStale} follow-up • {salesData.hotLeadNames.length} gorących</span>
                                <button onClick={() => { setAiInsight(''); refresh(); }} className="hover:text-slate-600">🔄 Odśwież</button>
                            </div>
                        </>
                    )}

                    {/* ══════════ AI COACH — Claude Powered ══════════ */}
                    {aiInsight ? (
                        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">🤖</span>
                                    <span className="text-xs font-semibold text-blue-700">{isAdmin ? 'AI Business Coach' : 'AI Coach'}</span>
                                    <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">Claude</span>
                                </div>
                                <button onClick={() => setAiInsight('')} className="text-[10px] text-slate-400 hover:text-slate-600">✕ Zamknij</button>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiInsight}</p>
                            
                            {/* ── EXTRACTED TASKS ── */}
                            {extractedTasks.length > 0 && (
                                <div className="bg-white/80 border border-indigo-200 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-indigo-700">📋 Wyodrębnione zadania ({extractedTasks.filter(t => !t.created).length} do utworzenia)</span>
                                        <div className="flex gap-1.5">
                                            <button onClick={createAllTasksFromAI} disabled={extractedTasks.every(t => t.created)} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-40 transition-colors">✅ Utwórz wszystkie</button>
                                            <button onClick={() => setExtractedTasks([])} className="text-[10px] text-slate-400 hover:text-slate-600 px-1">✕</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {extractedTasks.map((task, i) => (
                                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${task.created ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                                <span className={`text-[11px] flex-1 ${task.created ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task.title}</span>
                                                {task.created ? (
                                                    <span className="text-[9px] text-emerald-600 font-bold">✓ Utworzone</span>
                                                ) : (
                                                    <button
                                                        onClick={() => createTaskFromAI(i)}
                                                        disabled={creatingTask === i}
                                                        className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100 font-medium disabled:opacity-50 flex-shrink-0 transition-colors"
                                                    >
                                                        {creatingTask === i ? '⏳...' : '➕ Utwórz'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isAdmin && (
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-blue-100">
                                    <button onClick={() => { setExtractedTasks([]); extractTasksFromAI(aiInsight); }} className="text-[10px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-sm transition-all">📋 Wyodrębnij zadania</button>
                                    <button onClick={() => runClaudeAnalysis('daily_briefing')} disabled={loadingAI} className="text-[10px] bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50">☕ Nowy briefing</button>
                                    <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="text-[10px] bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50 font-medium disabled:opacity-50">🌍 Rynek</button>
                                    <button onClick={() => runClaudeAnalysis('team_coaching')} disabled={loadingAI} className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 font-medium disabled:opacity-50">👥 Zespół</button>
                                    <button onClick={() => runClaudeAnalysis('growth_strategy')} disabled={loadingAI} className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-50 font-medium disabled:opacity-50">🚀 Strategia</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {isAdmin ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                    <button onClick={() => runClaudeAnalysis('daily_briefing')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'daily_briefing' ? '⏳...' : '☕ Poranna Kawa'}
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('market_analysis')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'market_analysis' ? '⏳...' : '🌍 Analiza Rynku'}
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('team_coaching')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'team_coaching' ? '⏳...' : '👥 Coaching Zespołu'}
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('growth_strategy')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'growth_strategy' ? '⏳...' : '🚀 Plan Rozwoju'}
                                    </button>
                                    <button onClick={() => runClaudeAnalysis('logistics_briefing')} disabled={loadingAI} className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50">
                                        {loadingAI && aiInsightType === 'logistics_briefing' ? '⏳...' : '📦 Plan Logistyki'}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={generateSalesInsight} disabled={loadingAI} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50">
                                    {loadingAI ? (
                                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Generuję...</>
                                    ) : (
                                        <>🤖 AI Coach — co zrobić żeby sprzedać?</>
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
