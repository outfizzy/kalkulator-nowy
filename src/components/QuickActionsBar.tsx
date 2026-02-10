import React, { useState } from 'react';

interface QuickAction {
    id: string;
    icon: string;
    label: string;
    prompt: string;
    color: string;
    description: string;
}

interface QuickActionsBarProps {
    onSelectAction: (prompt: string) => void;
    context?: any;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ onSelectAction, context }) => {
    const [expanded, setExpanded] = useState(false);

    // Dynamic quick actions based on context
    const getQuickActions = (): QuickAction[] => {
        const baseActions: QuickAction[] = [
            {
                id: 'quick-price',
                icon: '💰',
                label: 'Szybka Wycena',
                prompt: 'Oblicz cenę pergoli TopLine 4x3m w kolorze antracyt. Podaj cenę netto i brutto.',
                color: 'bg-green-500',
                description: 'Błyskawiczna wycena standardowej pergoli'
            },
            {
                id: 'draft-email',
                icon: '📧',
                label: 'Napisz Email',
                prompt: 'Napisz profesjonalny email do klienta z ofertą pergoli TopLine 4x3m. Użyj narzędzia draft_email.',
                color: 'bg-blue-500',
                description: 'Profesjonalny email do klienta'
            },
            {
                id: 'calculate-margin',
                icon: '📈',
                label: 'Oblicz Marżę',
                prompt: 'Oblicz marżę dla oferty: cena sprzedaży 28500 PLN, koszt 19000 PLN. Czy to dobra marża?',
                color: 'bg-purple-500',
                description: 'Analiza rentowności oferty'
            },
            {
                id: 'suggest-upsell',
                icon: '⭐',
                label: 'Zaproponuj Dodatki',
                prompt: 'Jakie dodatki zaproponować do pergoli TopLine 4x3m? Użyj narzędzia suggest_upsell.',
                color: 'bg-pink-500',
                description: 'Sugestie sprzedaży dodatkowej'
            },
            {
                id: 'compare-models',
                icon: '⚖️',
                label: 'Porównaj Modele',
                prompt: 'Porównaj TopLine, TrendLine i SkyLine dla rozmiaru 4x3m. Przedstaw różnice w tabeli.',
                color: 'bg-orange-500',
                description: 'Szybkie porównanie modeli'
            },
            {
                id: 'objection-handler',
                icon: '💬',
                label: 'Obsługa Obiekcji',
                prompt: 'Jak odpowiedzieć klientowi który mówi "To za drogie"? Podaj 3 skuteczne argumenty.',
                color: 'bg-red-500',
                description: 'Pomoc w rozmowie z klientem'
            },
            {
                id: 'installation-info',
                icon: '🔨',
                label: 'Info o Montażu',
                prompt: 'Ile trwa montaż pergoli? Jakie są wymagania? Czy potrzebne są pozwolenia? Odpowiedz zwięźle.',
                color: 'bg-indigo-500',
                description: 'Szybkie info o instalacji'
            }
        ];

        // Add context-specific actions
        if (context?.type === 'lead') {
            baseActions.unshift({
                id: 'lead-followup',
                icon: '🎯',
                label: 'Follow-up Lead',
                prompt: `Napisz email follow-up dla leada: ${context.name}. Przypomnij o ofercie i zaproponuj darmowy pomiar.`,
                color: 'bg-red-500',
                description: 'Email kontynuujący rozmowę'
            });
        }

        if (context?.type === 'customer') {
            baseActions.unshift({
                id: 'customer-offer',
                icon: '📋',
                label: 'Oferta dla Klienta',
                prompt: `Przygotuj ofertę dla klienta: ${context.name}. Uwzględnij historię zakupów i preferencje.`,
                color: 'bg-teal-500',
                description: 'Personalizowana oferta'
            });
        }

        return baseActions;
    };

    const actions = getQuickActions();
    const visibleActions = expanded ? actions : actions.slice(0, 4);

    return (
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="font-semibold text-sm text-slate-700">Szybkie Akcje</h3>
                </div>
                {actions.length > 4 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {expanded ? 'Mniej' : `+${actions.length - 4} więcej`}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {visibleActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => onSelectAction(action.prompt)}
                        className="group relative flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
                        title={action.description}
                    >
                        <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">{action.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{action.description}</div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ))}
            </div>

            {/* Tip */}
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kliknij akcję aby szybko wysłać prompt z danymi z bazy
            </div>
        </div>
    );
};
