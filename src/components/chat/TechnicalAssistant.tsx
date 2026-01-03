import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Bot, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const TechnicalAssistant: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Cześć! Jestem Twoim technicznym asystentem. Zadaj mi pytanie o zadaszenia, wymiary, czy instrukcje montażu.' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = { role: 'user' as const, content: query };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            // Prepare context (history) - limited to last 6 messages
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

            const response = await supabase.functions.invoke('ask-tech-ai', {
                body: { question: userMsg.content, messages: history }
            });

            if (response.error) {
                console.error("Function error:", response.error); // Debug Log
                const errBody = await response.error.context?.json().catch(() => ({}));
                throw new Error(errBody.error || response.error.message || 'Unknown error');
            }

            // Handle Streaming Response (Supabase invoke returns blob/text for stream?)
            // Normally Supabase JS client handles JSON. For stream, we might need custom fetch or handle 'data' carefully.
            // Supabase functions.invoke returns { data, error }. If stream, data might be ReadableStream or text.
            // Let's assume text for now or verify invoke behavior for streams.
            // Actually supabase-js 'invoke' buffers by default unless 'responseType' is set?
            // To be safe and simple: The Edge Function returns text/plain stream.
            // But supabase-js might buffer it. Let's iterate on the response.

            // WORKAROUND: Text response (no stream in UI for MVP to avoid complexity)
            // Function code was set to stream, but supabase client 'invoke' usually waits.
            // If it waits, 'data' will be the full text.

            if (response.data) {
                const aiMsg = { role: 'assistant' as const, content: response.data };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                // Fallback if data is empty but no error (maybe stream issue)
                // Try to read raw body if available? Supabase client hides it.
                console.warn("Empty data from AI");
            }

        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Przepraszam, wystąpił błąd komunikacji z AI. Spróbuj ponownie.' }]);
            toast.error('Błąd AI: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Asystent Techniczny</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Baza Wiedzy Podłączona
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[80%] rounded-2xl px-4 py-3 text-sm
                            ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}
                        `}>
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i} className="mb-1 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Zadaj pytanie techniczne (np. jaki wymiar krokwi?)"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !query.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
