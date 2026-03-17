import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AIService, type ChatMessage, type ChatSession } from '../../services/ai.service';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { usePageContext } from '../../hooks/usePageContext';

// ═══════════════════════════════════════════════════════════
// Simple Markdown-ish renderer
// ═══════════════════════════════════════════════════════════
function renderMarkdown(content: string) {
    // Split into lines and process
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLang = '';

    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">
                        <code>{codeLines.join('\n')}</code>
                    </pre>
                );
                codeLines = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                codeLang = line.slice(3);
            }
            return;
        }
        if (inCodeBlock) { codeLines.push(line); return; }

        // Headers
        if (line.startsWith('### ')) { elements.push(<h4 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</h4>); return; }
        if (line.startsWith('## ')) { elements.push(<h3 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>); return; }
        if (line.startsWith('# ')) { elements.push(<h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>); return; }

        // Table rows
        if (line.includes('|') && line.trim().startsWith('|')) {
            const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
            if (cells.every(c => /^[-:]+$/.test(c))) return; // separator row
            elements.push(
                <div key={i} className="flex gap-2 text-xs py-0.5 border-b border-slate-100">
                    {cells.map((cell, ci) => (
                        <span key={ci} className={`flex-1 ${ci === 0 ? 'font-semibold' : ''}`}>{formatInline(cell)}</span>
                    ))}
                </div>
            );
            return;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            elements.push(<div key={i} className="border-l-3 border-blue-400 pl-3 text-slate-600 italic text-sm my-1">{formatInline(line.slice(2))}</div>);
            return;
        }

        // List items
        if (line.match(/^[-*•] /)) {
            elements.push(<div key={i} className="flex gap-2 text-sm ml-2"><span className="text-blue-500">•</span><span>{formatInline(line.slice(2))}</span></div>);
            return;
        }
        if (line.match(/^\d+\. /)) {
            const num = line.match(/^(\d+)\. /)?.[1];
            elements.push(<div key={i} className="flex gap-2 text-sm ml-2"><span className="text-blue-500 font-bold">{num}.</span><span>{formatInline(line.slice(num!.length + 2))}</span></div>);
            return;
        }

        // Empty line
        if (!line.trim()) { elements.push(<div key={i} className="h-2" />); return; }

        // Regular paragraph
        elements.push(<p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>);
    });

    return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
    // Bold
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        // Inline code
        const codeParts = part.split(/(`[^`]+`)/g);
        return codeParts.map((cp, j) => {
            if (cp.startsWith('`') && cp.endsWith('`')) {
                return <code key={`${i}-${j}`} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono">{cp.slice(1, -1)}</code>;
            }
            return cp;
        });
    });
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const AIAssistantPage: React.FC = () => {
    const { currentUser } = useAuth();
    const pageContext = usePageContext();
    const isAdmin = currentUser?.role === 'admin';

    // State
    const [channel, setChannel] = useState<'company' | 'private'>('company');
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionsLoading, setIsSessionsLoading] = useState(true);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Admin state
    const [chatUsers, setChatUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load sessions
    useEffect(() => {
        loadSessions();
    }, [channel, selectedUserId]);

    // Load admin user list
    useEffect(() => {
        if (isAdmin) {
            AIService.getChatUsers().then(users => setChatUsers(users)).catch(console.error);
        }
    }, [isAdmin]);

    const loadSessions = async () => {
        try {
            setIsSessionsLoading(true);
            let data: ChatSession[];

            if (isAdmin && (selectedUserId !== 'mine')) {
                data = await AIService.getAdminSessions({
                    channel,
                    userId: selectedUserId === 'all' ? undefined : selectedUserId
                });
            } else {
                data = await AIService.getSessions(channel);
            }

            setSessions(data);
            // Auto-select first session if current is gone
            if (data.length > 0 && (!currentSessionId || !data.find(s => s.id === currentSessionId))) {
                setCurrentSessionId(data[0].id);
            } else if (data.length === 0) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSessionsLoading(false);
        }
    };

    // Load messages when session changes
    useEffect(() => {
        if (currentSessionId) {
            loadMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    const loadMessages = async (sessionId: string) => {
        try {
            const data = await AIService.getSessionMessages(sessionId);
            setMessages(data);
            scrollToBottom();
        } catch (error) {
            console.error(error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleNewChat = async () => {
        try {
            const newSession = await AIService.createSession('Nowa rozmowa', channel);
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
            textareaRef.current?.focus();
        } catch (error) {
            console.error(error);
            toast.error('Nie udało się utworzyć rozmowy');
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!window.confirm('Czy na pewno usunąć tę rozmowę?')) return;
        try {
            await AIService.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd usuwania');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => setAttachedImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !attachedImage) || isLoading) return;

        let targetSessionId = currentSessionId;
        if (!targetSessionId) {
            try {
                const title = inputValue.slice(0, 40) + (inputValue.length > 40 ? '...' : '');
                const newSession = await AIService.createSession(title || 'Nowa rozmowa', channel);
                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(newSession.id);
                targetSessionId = newSession.id;
            } catch (error) {
                toast.error('Błąd tworzenia sesji');
                return;
            }
        }

        const tempContent = inputValue;
        const tempImage = attachedImage;
        setInputValue('');
        setAttachedImage(null);

        setMessages(prev => [...prev, {
            role: 'user',
            content: tempContent + (tempImage ? `\n\n![Obraz](${tempImage})` : '')
        }]);
        setIsLoading(true);
        scrollToBottom();

        try {
            const aiContext = {
                userRole: currentUser?.role,
                userName: `${currentUser?.firstName} ${currentUser?.lastName}`,
                currentPage: pageContext?.currentPage || 'ai-assistant',
                channel
            };

            const response = await AIService.sendSessionMessage(
                targetSessionId!, tempContent, messages, tempImage || undefined, aiContext
            );

            if (response) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
                scrollToBottom();
                // Update session title
                setSessions(prev => {
                    const session = prev.find(s => s.id === targetSessionId);
                    if (!session) return prev;
                    const others = prev.filter(s => s.id !== targetSessionId);
                    return [{ ...session, title: session.title === 'Nowa rozmowa' ? tempContent.slice(0, 40) : session.title }, ...others];
                });
            }
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ **Błąd:** ${error?.message || 'Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.'}`
            }]);
            scrollToBottom();
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Filtered sessions
    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessions;
        const q = searchQuery.toLowerCase();
        return sessions.filter(s =>
            s.title?.toLowerCase().includes(q) ||
            s.user_name?.toLowerCase().includes(q)
        );
    }, [sessions, searchQuery]);

    const currentSession = sessions.find(s => s.id === currentSessionId);

    // Quick prompts
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    // ═══════════════════════════════════════════════════════════
    // PROFESSIONAL PROMPT CATEGORIES — Role-Aware
    // ═══════════════════════════════════════════════════════════
    const quickPrompts = channel === 'company'
        ? (isManager
            ? [
                // ═══ ADMIN / MANAGER — STRATEGIC PROMPTS ═══
                { icon: '📊', label: 'Pełny raport firmy', prompt: 'Przeprowadź kompleksową analizę biznesową za ostatnie 3 miesiące. Pokaż:\n1. Pipeline leadów — statusy, ilości, % konwersji, wąskie gardła\n2. Obroty netto z umów — trend miesięczny, porównanie m/m\n3. Ranking handlowców — kto generuje największą wartość\n4. Top 3 problemy do naprawy TERAZ\n5. Konkretne rekomendacje działań na najbliższy tydzień\n\nFormatuj w tabelach markdown z emoji statusów (🟢🟡🔴).' },
                { icon: '🔍', label: 'Analiza wąskich gardeł', prompt: 'Przeanalizuj wąskie gardła w procesie sprzedaży. Sprawdź:\n- Ile leadów czeka >3 dni bez kontaktu? (cel: <24h)\n- Ile ofert czeka >14 dni na decyzję klienta?\n- Jaki jest średni czas od leadu do umowy?\n- Gdzie tracimy klientów? Na jakim etapie odpada najwięcej?\n\nPodaj konkretne AKCJE do podjęcia z priorytetami (P1/P2/P3).' },
                { icon: '💡', label: 'Strategia rozwoju', prompt: 'Wciel się w rolę doświadczonego CEO advisora. Na podstawie danych z CRM zaproponuj strategię rozwoju na najbliższe 6 miesięcy:\n1. Analiza SWOT firmy na podstawie obecnych danych\n2. Nowe możliwości rynkowe (regiony DE, nowe produkty)\n3. Optymalizacja marży — gdzie tracimy, gdzie podnieść?\n4. Plan na sezon zimowy — jak wygładzić przychody?\n5. Inwestycje w marketing — co daje najlepszy ROI?\n\nMyśl długoterminowo i podawaj benchmarki branżowe.' },
                { icon: '👥', label: 'Ranking handlowców', prompt: 'Pokaż ranking handlowców za ostatnie 3 miesiące:\n1. Obrót netto (EUR) — kto generuje najwięcej\n2. Liczba ofert vs umów — konwersja %\n3. Średnia wartość zlecenia na handlowca\n4. Czas reakcji na leady\n\nWskaż wzorce: kto jest najefektywniejszy i dlaczego? Co mogą poprawić słabsi?' },
                { icon: '📈', label: 'Trend sprzedaży', prompt: 'Analizuj trend sprzedaży — porównaj ostatnie 3 miesiące:\n- Które modele zadaszeń sprzedają się najlepiej?\n- Jak zmienia się średnia wartość zamówienia?\n- Sezonowość — czy widać wzrost zapytań?\n- Prognoza na następny miesiąc\n\nPodaj dane w tabelach z wykresami ASCII jeśli możliwe.' },
                { icon: '🎯', label: 'Plan tygodniowy', prompt: 'Na podstawie aktualnego stanu CRM przygotuj plan działań na ten tydzień:\n1. PILNE: Leady bez kontaktu >3 dni — lista do obdzwonienia\n2. WAŻNE: Oferty czekające na decyzję — follow-up\n3. Montaże zaplanowane — czy wszystko gotowe?\n4. Nowe zapytania — komu przydzielić?\n\nPriorytetyzuj zadania i przypisz do handlowców.' },
            ]
            : [
                // ═══ SALES REP — OPERATIONAL PROMPTS ═══
                { icon: '💰', label: 'Wycena zadaszenia', prompt: 'Klient jest zainteresowany zadaszeniem. Potrzebuję pełną wycenę z dodatkami.\n\nModel: Trendstyle\nSzerokość: 5000mm\nGłębokość: 3000mm\nSzkło: VSG 10mm\nKolor: RAL 7016 Antracyt\n\nPokaż:\n1. Cena bazowa netto (EUR)\n2. Sugerowane dodatki (LED, promienniki, markizy, ZIP) z cenami\n3. Łączna wartość z dodatkami\n4. Marża % — czy jest optymalna (>25%)?\n5. Alternatywny model jeśli budżet jest ograniczony\n\nFormatuj jako tabelę gotową do skopiowania.' },
                { icon: '🔍', label: 'Znajdź klienta', prompt: 'Wyszukaj w CRM informacje o kliencie: [wpisz nazwisko lub numer oferty]\n\nPokaż:\n- Dane kontaktowe\n- Historia ofert i umów\n- Ostatni kontakt\n- Status relacji\n- Sugerowany następny krok' },
                { icon: '📧', label: 'Email do klienta', prompt: 'Napisz profesjonalny email w języku NIEMIECKIM do klienta po spotkaniu:\n\nTyp: Follow-up po prezentacji\nKlient: [Imię Nazwisko]\nProdukt: Trendstyle 5x3m z LED\nNotatki ze spotkania: [Klient zainteresowany, chce jeszcze porównać]\n\nEmail powinien:\n- Podziękować za spotkanie\n- Podsumować ofertę w 2-3 zdaniach\n- Zaproponować wizualizację lub pomiar\n- Mieć profesjonalny, ale ciepły ton\n- Zawierać CTA (Call-to-Action)' },
                { icon: '🏗️', label: 'Porównaj modele', prompt: 'Porównaj zadaszenia aluminiowe — przygotuj zestawienie dla klienta:\n\nPokaż tabelę porównawczą modeli:\n| Model | Max wymiary | Nachylenie | Pokrycie | Cennik od | Cechy wyróżniające |\n\nModele do porównania:\n1. Trendstyle (standard)\n2. Topstyle (wzmocniony)\n3. Skystyle (nowoczesny)\n\nDodaj rekomendację: który model wybrać w zależności od potrzeb klienta (budżet / design / wytrzymałość).' },
                { icon: '🎨', label: 'Wizualizacja AI', prompt: 'Wygeneruj fotorealistyczną wizualizację zadaszenia:\n\nModel: Trendstyle\nKolor: RAL 7016 Antracyt\nWymiary: 5000 x 3000mm\nDodatki: LED spots w krokwiach, promiennik IR\nOtoczenie: nowoczesny dom jednorodzinny, taras z drewnianym dekingiem, meble ogrodowe\nPora dnia: zachód słońca, ciepłe światło\n\nStyl: profesjonalna wizualizacja architektoniczna, 8K, fotorealizm' },
                { icon: '📐', label: 'Oblicz szyby', prompt: 'Oblicz wymiary i ilość szyb dla zadaszenia:\n\nSzerokość dachu: 5000mm\nWysięg: 3000mm\n\nPokaż:\n1. Ilość paneli szklanych\n2. Wymiary każdego panelu\n3. Typ szkła (VSG 8mm vs 10mm) — zalecenie\n4. Szacunkowa waga\n5. Uwagi montażowe' },
            ])
        : [
            // ═══ PRIVATE CHANNEL — PRODUCTIVITY ═══
            { icon: '💡', label: 'Burza mózgów', prompt: 'Pomóż mi w burzy mózgów na temat: [wpisz temat]\n\nZaproponuj:\n1. 5 kreatywnych pomysłów\n2. Analiza za/przeciw każdego\n3. Rekomendacja najlepszego podejścia\n4. Następne kroki do wdrożenia' },
            { icon: '📝', label: 'Profesjonalny tekst', prompt: 'Napisz profesjonalny tekst:\n\nTemat: [wpisz temat]\nTyp: [oferta/email/post/raport/prezentacja]\nTon: [formalny/przyjazny/sprzedażowy]\nDługość: [krótki/średni/długi]\nJęzyk: [PL/DE/EN]\n\nDodaj wezwanie do działania i formatowanie markdown.' },
            { icon: '📊', label: 'Analiza danych', prompt: 'Przeanalizuj poniższe dane i podaj wnioski:\n\n[Wklej dane lub opisz problem]\n\nChcę widzieć:\n1. Kluczowe wnioski (top 3)\n2. Trendy i wzorce\n3. Anomalie i ryzyka\n4. Rekomendacje działań\n\nFormatuj z tabelami i bullet pointami.' },
            { icon: '🌐', label: 'Tłumaczenie', prompt: 'Przetłumacz poniższy tekst profesjonalnie:\n\nZe: [PL/DE/EN]\nNa: [PL/DE/EN]\nKontekst: [biznesowy/techniczny/marketingowy]\n\nTekst:\n[wklej tekst]\n\nZachowaj ton i terminologię branżową.' },
        ];

    return (
        <div className="flex h-[calc(100vh-80px)] gap-0 bg-gradient-to-br from-slate-50 to-slate-100">

            {/* ═══ LEFT SIDEBAR ═══ */}
            <div className={`${sidebarOpen ? 'w-80' : 'w-0'} flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all duration-300`}>

                {/* Header with Logo */}
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">Chat GPT</h1>
                            <p className="text-blue-200 text-xs">Polendach24</p>
                        </div>
                    </div>

                    {/* Channel Tabs */}
                    <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                        <button
                            onClick={() => { setChannel('company'); setCurrentSessionId(null); }}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${channel === 'company' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                        >
                            🏢 Firmowy
                        </button>
                        <button
                            onClick={() => { setChannel('private'); setCurrentSessionId(null); }}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${channel === 'private' ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                        >
                            🔒 Prywatny
                        </button>
                    </div>
                </div>

                {/* New Chat + Search */}
                <div className="p-3 space-y-2 border-b border-slate-100">
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nowa rozmowa
                    </button>
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Szukaj rozmów..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Admin: User Filter */}
                    {isAdmin && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => { setSelectedUserId(e.target.value); setCurrentSessionId(null); }}
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                        >
                            <option value="all">👥 Wszyscy użytkownicy</option>
                            <option value="mine">👤 Moje rozmowy</option>
                            {chatUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {isSessionsLoading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-slate-400">Ładowanie...</p>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <p className="text-sm font-medium">Brak rozmów</p>
                            <p className="text-xs mt-1">Rozpocznij nową rozmowę</p>
                        </div>
                    ) : (
                        filteredSessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => setCurrentSessionId(session.id)}
                                className={`group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === session.id
                                    ? 'bg-blue-50 border border-blue-200 shadow-sm'
                                    : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{channel === 'company' ? '🏢' : '🔒'}</span>
                                        <span className={`text-sm font-medium truncate block ${currentSessionId === session.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {session.title || 'Rozmowa bez tytułu'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {isAdmin && session.user_name && (
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{session.user_name}</span>
                                        )}
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(session.updated_at).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[10px] font-bold">
                            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                        </div>
                        <span className="truncate">{currentUser?.firstName} {currentUser?.lastName}</span>
                        <span className="ml-auto text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{currentUser?.role}</span>
                    </div>
                </div>
            </div>

            {/* ═══ MAIN CHAT AREA ═══ */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top Bar */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>

                    {currentSession ? (
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{channel === 'company' ? '🏢' : '🔒'}</span>
                            <h2 className="text-sm font-semibold text-slate-800 truncate">{currentSession.title}</h2>
                            {isAdmin && currentSession.user_name && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{currentSession.user_name}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-slate-400">Wybierz lub utwórz rozmowę</span>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${channel === 'company' ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{channel === 'company' ? 'Firmowy' : 'Prywatny'}</span>
                    </div>
                </div>

                {/* Messages Area */}
                {!currentSessionId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Chat GPT Polendach24</h2>
                        <p className="text-slate-500 text-center max-w-lg mb-8">
                            {channel === 'company'
                                ? 'Rozmowy firmowe — widoczne dla zespołu. Kalkulacje, analizy, wyceny.'
                                : 'Prywatne notatki i rozmowy — tylko Ty je widzisz.'}
                        </p>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
                            {quickPrompts.map((qp, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInputValue(qp.prompt); handleNewChat(); }}
                                    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                                >
                                    <span className="text-2xl">{qp.icon}</span>
                                    <div>
                                        <div className="font-semibold text-sm text-slate-700 group-hover:text-blue-600 transition-colors">{qp.label}</div>
                                        <div className="text-xs text-slate-400 line-clamp-1">{qp.prompt.slice(0, 40)}...</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleNewChat}
                            className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-8 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Rozpocznij rozmowę
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                            <div className="max-w-3xl mx-auto space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                }`}>
                                                {msg.role === 'user'
                                                    ? `${currentUser?.firstName?.[0] || 'U'}`
                                                    : '⚡'}
                                            </div>
                                            {/* Bubble */}
                                            <div className={`rounded-2xl p-4 shadow-sm leading-relaxed overflow-hidden ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                                }`}>
                                                {msg.content.includes('![Obraz](data:image') ? (
                                                    <div>
                                                        <div className="text-sm whitespace-pre-wrap">{msg.content.split('![Obraz]')[0]}</div>
                                                        <img src={msg.content.match(/\((data:image.*?)\)/)?.[1]} alt="Uploaded" className="mt-2 rounded-lg max-w-full max-h-[300px] object-cover" />
                                                    </div>
                                                ) : msg.role === 'assistant' ? (
                                                    <div className="prose-sm">{renderMarkdown(msg.content)}</div>
                                                ) : (
                                                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Loading indicator */}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex gap-3 max-w-[85%]">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 text-white text-xs">⚡</div>
                                            <div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-tl-sm shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                    </div>
                                                    <span className="text-xs text-slate-400">AI myśli...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-slate-200 bg-white p-4">
                            <div className="max-w-3xl mx-auto">
                                {attachedImage && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="relative group">
                                            <img src={attachedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                                            <button
                                                onClick={() => setAttachedImage(null)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 items-end">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0"
                                        title="Dodaj zdjęcie"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <textarea
                                        ref={textareaRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={channel === 'company'
                                            ? 'Zapytaj o cenę, przeanalizuj leadów, wylicz marżę...'
                                            : 'Twoja prywatna notatka lub pytanie...'
                                        }
                                        className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-40 text-sm shadow-sm"
                                        rows={1}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isLoading || (!inputValue.trim() && !attachedImage)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white p-3 rounded-xl transition-all flex-shrink-0 shadow-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    </button>
                                </div>
                                <p className="text-center text-[10px] text-slate-400 mt-2">
                                    Shift+Enter = nowa linia • Enter = wyślij • AI może popełniać błędy
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
