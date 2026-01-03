import { useState, useRef, useEffect } from 'react';
import { AIService, type ChatMessage } from '../../services/ai.service';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const SalesAssistantWidget = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load or create session on mount/open
    useEffect(() => {
        if (isOpen && currentUser && !sessionId) {
            initializeSession();
        }
    }, [isOpen, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const initializeSession = async () => {
        try {
            // 1. Check for existing recent session
            const sessions = await AIService.getSessions();
            if (sessions && sessions.length > 0) {
                // Use most recent
                const lastSession = sessions[0];
                setSessionId(lastSession.id);
                // Load messages
                const history = await AIService.getSessionMessages(lastSession.id);
                setMessages(history || []);
            } else {
                // Create new
                const newSession = await AIService.createSession();
                setSessionId(newSession.id);
            }
        } catch (e) {
            console.error('Session init error', e);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;
        if (!sessionId) {
            toast.error('Brak aktywnej sesji czatu');
            return;
        }

        const content = inputValue;
        setInputValue('');
        setIsLoading(true);

        // Optimistic UI update
        const tempUserMsg: ChatMessage = { role: 'user', content, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempUserMsg]);

        // Capture Context
        const context = {
            path: location.pathname,
            search: location.search,
            // Extract ID if present in path (simple heuristic)
            entityId: location.pathname.split('/').pop()?.match(/^[0-9a-fA-F-]{10,}$/) ? location.pathname.split('/').pop() : undefined
        };

        try {
            // Use Persistent Service with Context
            const response = await AIService.sendSessionMessage(sessionId, content, messages, undefined, context);

            if (response) {
                const aiMsg: ChatMessage = { role: 'assistant', content: response.content, created_at: new Date().toISOString() };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error: any) {
            console.error(error);
            // Show specific error if available
            toast.error(error.message || 'Błąd asystenta AI');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!currentUser) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end print:hidden">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-[350px] md:w-[500px] h-[700px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Asystent AI</h3>
                                <p className="text-[10px] text-blue-100 opacity-90">zintegrowany z CRM & Ofertami</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={initializeSession}
                                title="Nowa rozmowa"
                                className="hover:bg-white/20 p-1.5 rounded transition"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 scroll-smooth">
                        {messages.length === 0 && !isLoading && (
                            <div className="text-center text-slate-400 mt-6 p-4">
                                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm ring-4 ring-blue-50">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </div>
                                <h4 className="text-slate-800 font-bold mb-1">Cześć {currentUser.firstName}!</h4>
                                <p className="text-xs text-slate-500 mb-6">W czym mogę Ci teraz pomóc?</p>

                                <div className="grid gap-2">
                                    {[
                                        { icon: '📊', text: 'Podsumuj moją sprzedaż w tym miesiącu' },
                                        { icon: '📅', text: 'Co mam dzisiaj zaplanowane?' },
                                        { icon: '🤝', text: 'Pokaż leady wymagające kontaktu' },
                                        { icon: '💰', text: 'Sprawdź status ostatnich ofert' }
                                    ].map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setInputValue(prompt.text);
                                                // Create a slight delay to allow state update then highlight input to show it's ready
                                                setTimeout(() => {
                                                    const input = document.querySelector('textarea');
                                                    if (input) (input as HTMLTextAreaElement).focus();
                                                    // Ideally we would trigger handleSend here, but for safety (avoid duplicates) 
                                                    // we just pre-fill. If we want auto-send, we'd need to bypass the keyDown check.
                                                }, 50);
                                            }}
                                            className="text-left bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 p-3 rounded-xl transition-all shadow-sm flex items-center gap-3 text-xs font-medium text-slate-700 group"
                                        >
                                            <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{prompt.icon}</span>
                                            {prompt.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div className={`max-w-[90%] rounded-2xl p-3 text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-slate-800 prose-ul:my-1 prose-li:my-0">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    a: ({ href, children, ...props }) => {
                                                        const isInternal = href?.startsWith('/');
                                                        return (
                                                            <a
                                                                href={href}
                                                                onClick={(e) => {
                                                                    if (isInternal && href) {
                                                                        e.preventDefault();
                                                                        navigate(href);
                                                                    }
                                                                }}
                                                                {...props}
                                                                className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                                                            >
                                                                {children}
                                                            </a>
                                                        );
                                                    },
                                                    table: (props) => (
                                                        <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                                                            <table {...props} className="w-full text-left text-xs" />
                                                        </div>
                                                    ),
                                                    th: (props) => (
                                                        <th {...props} className="bg-slate-50 px-2 py-1 font-semibold text-slate-600 border-b" />
                                                    ),
                                                    td: (props) => (
                                                        <td {...props} className="px-2 py-1 border-b last:border-0" />
                                                    )
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium mr-2">AI myśli...</span>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Zapytaj o cokolwiek..."
                                className="w-full resize-none border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 min-h-[50px] shadow-inner bg-slate-50 focus:bg-white transition-colors"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim()}
                                className="absolute right-2 bottom-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'bg-slate-800 rotate-90 scale-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-110 hover:-translate-y-1 shadow-blue-500/40'} 
                text-white p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group relative z-50`}
            >
                {isOpen ? (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <div className="relative">
                        <svg className="w-7 h-7 transform group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        {/* Notification Dot */}
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                        </span>
                    </div>
                )}
            </button>
        </div >
    );
};
