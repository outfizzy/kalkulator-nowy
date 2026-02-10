import React, { useState } from 'react';
import { PRESET_CATEGORIES, PRESET_PROMPTS, getPromptsByCategory, type PresetPrompt } from '../data/presetPrompts';

interface PresetPromptsProps {
    onSelectPrompt: (prompt: string) => void;
    onClose?: () => void;
}

export const PresetPromptsPanel: React.FC<PresetPromptsProps> = ({ onSelectPrompt, onClose }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handlePromptClick = (prompt: PresetPrompt) => {
        onSelectPrompt(prompt.prompt);
        if (onClose) onClose();
    };

    const filteredPrompts = selectedCategory
        ? getPromptsByCategory(selectedCategory)
        : searchQuery
            ? PRESET_PROMPTS.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : [];

    const getCategoryColor = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
            green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
            purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
            orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
            slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
        };
        return colors[color] || colors.slate;
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        Gotowe Prompty
                    </h3>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value) setSelectedCategory(null);
                        }}
                        placeholder="Szukaj promptów..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Categories */}
            {!searchQuery && !selectedCategory && (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 gap-2">
                        {PRESET_CATEGORIES.map(category => {
                            const count = getPromptsByCategory(category.id).length;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${getCategoryColor(category.color)}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{category.icon}</span>
                                            <div>
                                                <div className="font-semibold">{category.name}</div>
                                                <div className="text-xs opacity-75">{count} promptów</div>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Prompts List */}
            {(selectedCategory || searchQuery) && (
                <div className="flex-1 overflow-y-auto">
                    {/* Back button */}
                    {selectedCategory && !searchQuery && (
                        <div className="p-4 border-b border-slate-100">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Powrót do kategorii
                            </button>
                        </div>
                    )}

                    <div className="p-4 space-y-2">
                        {filteredPrompts.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm">Nie znaleziono promptów</p>
                            </div>
                        ) : (
                            filteredPrompts.map(prompt => (
                                <button
                                    key={prompt.id}
                                    onClick={() => handlePromptClick(prompt)}
                                    className="w-full p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl flex-shrink-0">{prompt.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800 text-sm mb-1 group-hover:text-blue-700">
                                                {prompt.title}
                                            </div>
                                            {prompt.description && (
                                                <div className="text-xs text-slate-500 line-clamp-2">
                                                    {prompt.description}
                                                </div>
                                            )}
                                        </div>
                                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Footer tip */}
            <div className="p-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500 text-center">
                    💡 Kliknij prompt aby użyć go w rozmowie
                </p>
            </div>
        </div>
    );
};
