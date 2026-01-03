import React, { useState } from 'react';
import { AiService } from '../../../services/ai';
import type { ProductConfig, User, SelectedAddon } from '../../../types';

interface VisualizerAIChatProps {
    config: ProductConfig;
    onChange: (updates: Partial<ProductConfig>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: User | any;
}

export const VisualizerAIChat: React.FC<VisualizerAIChatProps> = ({ config, onChange, user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
        { role: 'ai', text: 'Cześć! Jestem Twoim inteligentnym asystentem. Powiedz mi, co chcesz zmienić w projekcie (np. "Zmień kolor na biały" lub "Dodaj markizę").' }
    ]);

    const handleSend = async (cmd?: string) => {
        const command = cmd || input;
        if (!command.trim() || !user) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: command }]);
        setLoading(true);

        try {
            const updates = await AiService.interpretVisualizerCommand(command, config, user);
            console.log("AI Updates:", updates);

            // Handle Special Actions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const action = (updates as any)._action;
            if (action === 'add_addon') {
                // Determine price (simplified logic or lookup)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const type = (updates as any).type as SelectedAddon['type'];
                let price = 0;
                if (type === 'heater') price = 250;
                if (type === 'wpc-floor') price = Math.round((config.width / 1000) * (config.projection / 1000) * 120);
                if (type === 'awning') price = 2500;
                if (type === 'zipScreen') price = 1500;

                // Add via existing addons array
                const newAddon: SelectedAddon = {
                    id: `${type}-${Date.now()}`,
                    type: type,
                    name: type,
                    price: price,
                    location: 'front' // default
                };
                const newAddons = [...config.addons, newAddon];
                onChange({ addons: newAddons });
                setMessages(prev => [...prev, { role: 'ai', text: `Dodałem ${type}.` }]);

            } else if (action === 'remove_addon') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const type = (updates as any).type;
                const newAddons = config.addons.filter(a => a.type !== type);
                onChange({ addons: newAddons });
                setMessages(prev => [...prev, { role: 'ai', text: `Usunąłem ${type}.` }]);
            } else {
                // Standard updates
                if (Object.keys(updates).length > 0) {
                    onChange(updates);
                    setMessages(prev => [...prev, { role: 'ai', text: 'Zaktualizowałem projekt!' }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', text: 'Nie zrozumiałem polecenia lub nie wymaga ono zmian.' }]);
                }
            }

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Przepraszam, wystąpił błąd komunikacji z AI.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-auto">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 h-96 bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-fadeIn mb-2">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-accent/10 to-transparent flex justify-between items-center">
                        <span className="font-bold text-slate-800 flex items-center gap-2">✨ AI Architect</span>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${m.role === 'user'
                                    ? 'bg-accent text-white rounded-tr-sm'
                                    : 'bg-white border border-slate-100 text-slate-600 shadow-sm rounded-tl-sm'
                                    }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm rounded-tl-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce delay-75" />
                                        <div className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suggestion Chips */}
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => handleSend('Zrób nowoczesny biały design')}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full transition-colors"
                        >
                            💎 Modern White
                        </button>
                        <button
                            onClick={() => handleSend('Dodaj oświetlenie i ogrzewanie')}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full transition-colors"
                        >
                            🌙 Przytulny Wieczór
                        </button>
                        <button
                            onClick={() => handleSend('Pełna ochrona (ZIP Screeny + Szkło)')}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full transition-colors"
                        >
                            🛡️ Full Privacy
                        </button>
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Co zmienić w projekcie?"
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-accent/20 outline-none"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-accent text-white rounded-xl hover:bg-accent-dark disabled:opacity-50 transition-colors"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg shadow-accent/20 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 text-white' : 'bg-white text-accent animate-pulse-slow'
                    }`}
            >
                {isOpen ? '✕' : '✨'}
            </button>
        </div>
    );
};
