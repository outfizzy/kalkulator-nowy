import React, { useState, useEffect, useRef } from 'react';
import { AIService, type ChatMessage } from '../services/ai.service';
import { usePageContext } from '../hooks/usePageContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { PresetPromptsPanel } from './PresetPromptsPanel';
import { QuickActionsBar } from './QuickActionsBar';
import { SmartSuggestions } from './SmartSuggestions';
import { ExportOptions } from './ExportOptions';
import { VoiceInput } from './VoiceInput';
import { MessageFormatter } from './MessageFormatter';

interface AIAssistantSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AIAssistantSidebar: React.FC<AIAssistantSidebarProps> = ({ isOpen, onClose }) => {
    const { context } = usePageContext();
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [showPresets, setShowPresets] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-create session if generic one doesn't exist, or specific one for this context?
    // Strategies:
    // 1. Single "Quick Chat" session for sidebar that persists? 
    // 2. New session on every open? (Bad)
    // 3. One global "Sidebar Session"?
    // Let's go with: Load last active session or create new if none.
    useEffect(() => {
        const setupSession = async () => {
            try {
                const sessions = await AIService.getSessions();
                if (sessions.length > 0) {
                    setCurrentSessionId(sessions[0].id);
                    const msgs = await AIService.getSessionMessages(sessions[0].id);
                    setMessages(msgs);
                    scrollToBottom();
                } else {
                    const newSession = await AIService.createSession('Asystent');
                    setCurrentSessionId(newSession.id);
                }
            } catch (error) {
                console.error('Session setup error', error);
            }
        };

        if (isOpen && !currentSessionId) {
            setupSession();
        }
    }, [isOpen, currentSessionId]);

    // Auto-scroll ONLY when a new message is added
    const prevMessagesLengthRef = useRef(messages.length);
    useEffect(() => {
        // Only scroll if a new message was added
        if (messages.length > prevMessagesLengthRef.current) {
            scrollToBottom();
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    const scrollToBottom = () => {
        // Use timeout to ensure DOM update is finished
        setTimeout(() => {
            if (messagesContainerRef.current) {
                const { scrollHeight, clientHeight } = messagesContainerRef.current;
                // Instant jump for better UX on load, smooth for new messages could be optional
                // But user wants "scroll down", so let's force it.
                messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
            }
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !currentSessionId) return;

        const content = inputValue;
        setInputValue('');

        const tempMsg: ChatMessage = { role: 'user', content };
        setMessages(prev => [...prev, tempMsg]);
        setIsLoading(true);
        // scrollToBottom triggered by useEffect


        try {
            // Check if this prompt needs data enrichment
            let enrichedContent = content;

            // If content looks like it's from a preset prompt that needs data
            if (content.includes('Oblicz cenę') || content.includes('Porównaj') || content.includes('Specyfikacja') || content.includes('aktualnych cen')) {
                try {
                    enrichedContent = await AIService.enrichPromptWithData(content);
                } catch (error) {
                    console.warn('Failed to enrich prompt, using original:', error);
                }
            }

            // Include context only if it's the first message about this context? 
            // Or always inject it as "System Context"?
            // We pass it to service, service injects it.
            const aiContext = {
                ...context,
                userRole: currentUser?.role || 'sales_rep',
                userName: currentUser?.firstName || currentUser?.email?.split('@')[0],
                currentPage: context.currentPage || window.location.pathname
            };

            const response = await AIService.sendSessionMessage(
                currentSessionId,
                enrichedContent,
                messages,
                undefined, // image
                aiContext
            );

            if (response) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
                scrollToBottom();
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd asystenta');
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 border-l border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Asystent AI</h3>
                        {context.type !== 'general' && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {context.type === 'lead' && 'Widzę Leada'}
                                {context.type === 'customer' && 'Widzę Klienta'}
                                {context.type === 'offer' && 'Widzę Ofertę'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className={`p-2 rounded-lg transition-colors ${showPresets ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 text-slate-500'}`}
                        title="Gotowe prompty"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </button>
                    <ExportOptions messages={messages} sessionTitle="AI Assistant" />
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Quick Actions Bar - shown when not in presets mode */}
            {!showPresets && <QuickActionsBar onSelectAction={setInputValue} context={context} />}

            {/* Smart Suggestions - shown when conversation is active */}
            {!showPresets && <SmartSuggestions onSelectPrompt={setInputValue} currentMessages={messages} />}

            {/* Context Summary Code (Optional, maybe debug only) */}
            {/* {context.summary && (
                <div className="bg-blue-50 p-2 text-xs text-blue-700 border-b border-blue-100">
                    {context.summary}
                </div>
            )} */}

            {/* Preset Prompts Panel OR Messages */}
            {showPresets ? (
                <PresetPromptsPanel
                    onSelectPrompt={(prompt) => {
                        setInputValue(prompt);
                        setShowPresets(false);
                    }}
                    onClose={() => setShowPresets(false)}
                />
            ) : (
                <>
                    {/* Messages */}
                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
                    >
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}>
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                                    }`}>
                                    <MessageFormatter content={msg.content} role={msg.role} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 rounded-2xl p-3 rounded-tl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200 bg-white">
                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Zapytaj asystenta..."
                                className="w-full resize-none border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 min-h-[50px] max-h-32 text-sm"
                                rows={1}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <VoiceInput
                                    onTranscript={(text) => setInputValue(prev => prev + ' ' + text)}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !inputValue.trim()}
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <p className="text-[10px] text-slate-400">Context: {context.type}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
