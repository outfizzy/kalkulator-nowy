import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchService, type SearchResult } from '../services/database/search.service';

interface GlobalSearchProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, setIsOpen }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                const data = await SearchService.searchAll(query);
                setResults(data);
                setActiveIndex(-1); // Reset selection
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && results[activeIndex]) {
                handleSelect(results[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        navigate(result.url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-32 p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 transform transition-all">
                <div className="relative">
                    <svg
                        className="pointer-events-none absolute left-4 top-3.5 h-6 w-6 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className="h-14 w-full border-0 bg-transparent pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-base outline-none"
                        placeholder="Szukaj (Klienci, Oferty, Umowy, Leady)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <ul className="max-h-[60vh] overflow-y-auto border-t border-slate-100 py-2 scroll-py-2 text-sm text-slate-800">
                        {results.map((item, index) => (
                            <li
                                key={item.id}
                                className={`cursor-pointer select-none px-4 py-3 flex items-center gap-3 transition-colors ${index === activeIndex ? 'bg-accent text-white' : 'hover:bg-slate-50'
                                    }`}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${index === activeIndex ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {getIconForType(item.type)}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`font-medium ${index === activeIndex ? 'text-white' : 'text-slate-900'}`}>
                                        {item.title}
                                    </span>
                                    <span className={`truncate text-xs ${index === activeIndex ? 'text-white/80' : 'text-slate-500'}`}>
                                        {item.subtitle}
                                    </span>
                                </div>
                                <div className={`text-xs uppercase tracking-wider font-bold ${index === activeIndex ? 'text-white/60' : 'text-slate-300'
                                    }`}>
                                    {item.type}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {query.length >= 2 && results.length === 0 && (
                    <div className="p-12 text-center border-t border-slate-100">
                        <p className="text-slate-500 text-sm">Nie znaleziono wyników dla "{query}".</p>
                    </div>
                )}

                {query.length < 2 && (
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                        <span>Szukaj wpisując min. 2 znaki</span>
                        <span>ESC aby zamknąć</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function getIconForType(type: string) {
    switch (type) {
        case 'customer':
            return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            );
        case 'offer':
            return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        case 'contract':
            return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            );
    }
}
