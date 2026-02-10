import React, { useState, useEffect } from 'react';
import { usePageContext } from '../hooks/usePageContext';

interface SuggestedPrompt {
    id: string;
    text: string;
    icon: string;
    reason: string;
    priority: number;
}

interface SmartSuggestionsProps {
    onSelectPrompt: (prompt: string) => void;
    currentMessages: any[];
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ onSelectPrompt, currentMessages }) => {
    const context = usePageContext();
    const [suggestions, setSuggestions] = useState<SuggestedPrompt[]>([]);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        generateSuggestions();
    }, [context, currentMessages]);

    const generateSuggestions = () => {
        const newSuggestions: SuggestedPrompt[] = [];

        // Context-based suggestions
        if (context.type === 'lead' && context.name) {
            newSuggestions.push({
                id: 'lead-analysis',
                text: `Przeanalizuj lead: ${context.name}. Jakie produkty polecić?`,
                icon: '🎯',
                reason: 'Wykryto otwarty lead',
                priority: 10
            });
        }

        if (context.type === 'customer' && context.name) {
            newSuggestions.push({
                id: 'customer-history',
                text: `Pokaż historię zakupów klienta ${context.name} i zasugeruj kolejne produkty`,
                icon: '📊',
                reason: 'Profil klienta otwarty',
                priority: 9
            });
        }

        if (context.type === 'offer') {
            newSuggestions.push({
                id: 'offer-optimize',
                text: 'Przeanalizuj tę ofertę. Czy można coś poprawić lub dodać?',
                icon: '✨',
                reason: 'Przeglądasz ofertę',
                priority: 8
            });
        }

        // Conversation-based suggestions
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
            const content = lastMessage.content.toLowerCase();

            if (content.includes('cena') || content.includes('koszt')) {
                newSuggestions.push({
                    id: 'payment-options',
                    text: 'Jakie opcje płatności i finansowania możemy zaproponować?',
                    icon: '💳',
                    reason: 'Rozmowa o cenie',
                    priority: 7
                });
            }

            if (content.includes('montaż') || content.includes('instalacja')) {
                newSuggestions.push({
                    id: 'installation-details',
                    text: 'Podaj szczegóły montażu: czas, ekipa, wymagania, gwarancja',
                    icon: '🔧',
                    reason: 'Pytanie o montaż',
                    priority: 7
                });
            }

            if (content.includes('topline') || content.includes('trendline') || content.includes('designline')) {
                newSuggestions.push({
                    id: 'accessories',
                    text: 'Jakie dodatki polecić do tej pergoli? LED, ZIP, ogrzewanie?',
                    icon: '⭐',
                    reason: 'Rozmowa o pergoli',
                    priority: 6
                });
            }
        }

        // Time-based suggestions
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17 && currentMessages.length === 0) {
            newSuggestions.push({
                id: 'daily-tasks',
                text: 'Jakie zadania powinienem dziś wykonać? Sprawdź leady i follow-upy',
                icon: '📅',
                reason: 'Początek dnia',
                priority: 5
            });
        }

        // General helpful suggestions
        if (currentMessages.length === 0) {
            newSuggestions.push(
                {
                    id: 'bestsellers',
                    text: 'Jakie są najpopularniejsze modele pergoli i dlaczego?',
                    icon: '🏆',
                    reason: 'Przydatna wiedza',
                    priority: 4
                },
                {
                    id: 'seasonal',
                    text: 'Jakie promocje sezonowe możemy zaproponować klientom?',
                    icon: '🎁',
                    reason: 'Zwiększ sprzedaż',
                    priority: 3
                }
            );
        }

        // Sort by priority and take top 3
        setSuggestions(
            newSuggestions
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 3)
        );
    };

    if (!visible || suggestions.length === 0) return null;

    return (
        <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h4 className="text-xs font-semibold text-purple-700">Sugestie AI</h4>
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="text-purple-400 hover:text-purple-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-2">
                {suggestions.map(suggestion => (
                    <button
                        key={suggestion.id}
                        onClick={() => {
                            onSelectPrompt(suggestion.text);
                            setVisible(false);
                        }}
                        className="w-full group flex items-start gap-2 p-2 rounded-lg bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all text-left"
                    >
                        <div className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                            {suggestion.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 mb-0.5">
                                {suggestion.text}
                            </div>
                            <div className="text-[10px] text-purple-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {suggestion.reason}
                            </div>
                        </div>
                        <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                ))}
            </div>

            <div className="mt-2 text-[10px] text-purple-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI analizuje kontekst i sugeruje pomocne pytania
            </div>
        </div>
    );
};
