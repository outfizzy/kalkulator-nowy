import React, { useState, useEffect, useRef } from 'react';
import { AIService, type ChatMessage, type ChatSession } from '../../services/ai.service';
import { toast } from 'react-hot-toast';

export const AIAssistantPage: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionsLoading, setIsSessionsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load sessions on mount
    useEffect(() => {
        const loadSessions = async () => {
            try {
                setIsSessionsLoading(true);
                const data = await AIService.getSessions();
                setSessions(data);
                if (data.length > 0 && !currentSessionId) {
                    setCurrentSessionId(data[0].id);
                }
            } catch (error) {
                console.error(error);
                toast.error('Błąd ładowania historii');
            } finally {
                setIsSessionsLoading(false);
            }
        };
        loadSessions();
    }, []); // Empty dependency array is fine here as it runs once on mount

    // Load messages when session changes
    useEffect(() => {
        const loadMessages = async (sessionId: string) => {
            try {
                setIsLoading(true);
                const data = await AIService.getSessionMessages(sessionId);
                setMessages(data);
                scrollToBottom();
            } catch (error) {
                console.error(error);
                toast.error('Błąd ładowania wiadomości');
            } finally {
                setIsLoading(false);
            }
        };

        if (currentSessionId) {
            loadMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleNewChat = async () => {
        try {
            const newSession = await AIService.createSession('Nowa rozmowa');
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
        } catch (error) {
            console.error('New Chat Error:', error);
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
            toast.success('Rozmowa usunięta');
        } catch (error) {
            console.error('Delete Session Error:', error);
            toast.error('Błąd usuwania');
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        let targetSessionId = currentSessionId;

        // Create session if none exists
        if (!targetSessionId) {
            try {
                const title = inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '');
                const newSession = await AIService.createSession(title);
                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(newSession.id);
                targetSessionId = newSession.id;
            } catch (error) {
                console.error('Create Session Error:', error);
                toast.error('Błąd tworzenia sesji');
                return;
            }
        }

        const tempContent = inputValue;
        setInputValue('');

        // Optimistic UI update
        const tempMsg: ChatMessage = { role: 'user', content: tempContent };
        setMessages(prev => [...prev, tempMsg]);
        setIsLoading(true);
        scrollToBottom();

        try {
            // Remove temp msg from history passed to service? No, service handles it.
            // Actually, we pass 'messages' to service context usually.
            // In sendSessionMessage, we pass previousMessages.

            const response = await AIService.sendSessionMessage(
                targetSessionId!,
                tempContent,
                messages // Pass current history (excluding the optimistic one effectively, or simplistic approach)
            );

            if (response) {
                // Add AI response to state
                setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
                scrollToBottom();

                // Refresh sessions list to update timestamp/ordering?
                // Minimal update: find session and move to top.
                setSessions(prev => {
                    const session = prev.find(s => s.id === targetSessionId);
                    if (!session) return prev;
                    const others = prev.filter(s => s.id !== targetSessionId);
                    return [{ ...session, title: session.title === 'Nowa rozmowa' ? tempContent.slice(0, 25) : session.title }, ...others];
                });
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd wysyłania wiadomości');
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

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Sidebar History */}
            <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nowa rozmowa
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isSessionsLoading ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Ładowanie...</div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Brak historii rozmów</div>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => setCurrentSessionId(session.id)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${currentSessionId === session.id
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : 'hover:bg-slate-50 text-slate-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <svg className={`w-5 h-5 flex-shrink-0 ${currentSessionId === session.id ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    <span className="truncate text-sm font-medium">{session.title || 'Rozmowa bez tytułu'}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded text-slate-400 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!currentSessionId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">Wirtualny Asystent Sprzedaży</h2>
                        <p className="max-w-md text-center text-slate-500">
                            Wybierz rozmowę z historii lub rozpocznij nową, aby uzyskać pomoc w kalkulacjach, sprawach technicznych lub tworzeniu treści.
                        </p>
                        <button
                            onClick={handleNewChat}
                            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-xl font-medium transition-colors"
                        >
                            Rozpocznij nową rozmowę
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                            {msg.role === 'user' ? (
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            )}
                                        </div>
                                        <div className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                            }`}>
                                            <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                                            {/* Optional: Render tool outputs specially if we structured them, but raw text is fine for MVP */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-3 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-tl-none shadow-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200">
                            <div className="max-w-4xl mx-auto flex gap-3">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Napisz wiadomość... (np. 'Oblicz szkło dla dachu 4x3m')"
                                    className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[50px] max-h-32 shadow-sm"
                                    rows={1}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputValue.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 rounded-xl transition-colors flex items-center gap-2 shadow-sm font-medium"
                                >
                                    <span>Wyślij</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-2">
                                AI może popełniać błędy. Zawsze weryfikuj ważne informacje.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
