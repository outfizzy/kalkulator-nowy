import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PdfRebrandTool } from '../components/tools/PdfRebrandTool';

type ActiveTool = null | 'pdf-rebrand';

const TOOLS = [
    {
        id: 'dachrechner' as const,
        title: 'Kalkulator Dachowy',
        titleDe: 'Dachrechner',
        description: 'Automatyczne obliczanie wymiarów konstrukcji na podstawie modelu i parametrów technicznych.',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        color: 'bg-emerald-100 text-emerald-600',
        borderColor: 'border-emerald-200 hover:border-emerald-300',
        action: 'navigate' as const,
        path: '/dachrechner',
    },
    {
        id: 'ai-assistant' as const,
        title: 'Asystent AI',
        titleDe: 'KI-Assistent',
        description: 'Wbudowany asystent AI — tłumaczenia, propozycje tekstów, korespondencja z klientami i więcej.',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
        color: 'bg-violet-100 text-violet-600',
        borderColor: 'border-violet-200 hover:border-violet-300',
        action: 'navigate' as const,
        path: '/ai-assistant',
    },
    {
        id: 'pdf-rebrand' as const,
        title: 'Przerób PDF',
        titleDe: 'PDF Rebranding',
        description: 'Zamień logo Teranda w rysunkach technicznych i wizualizacjach 3D na logo Polendach24.',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 11l2 2 4-4" />
            </svg>
        ),
        color: 'bg-indigo-100 text-indigo-600',
        borderColor: 'border-indigo-200 hover:border-indigo-300',
        action: 'inline' as const,
    },
    {
        id: 'product-images' as const,
        title: 'Zdjęcia Produktów',
        titleDe: 'Produktbilder',
        description: 'Zarządzaj zdjęciami modeli — zmień zdjęcie główne i galerię w ofercie interaktywnej.',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        color: 'bg-cyan-100 text-cyan-600',
        borderColor: 'border-cyan-200 hover:border-cyan-300',
        action: 'navigate' as const,
        path: '/admin/product-images',
    },
];

export const ToolsPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTool, setActiveTool] = useState<ActiveTool>(null);

    const handleToolClick = (tool: typeof TOOLS[number]) => {
        if (tool.action === 'navigate') {
            navigate(tool.path!);
        } else if (tool.action === 'external') {
            window.open(tool.url!, '_blank', 'noopener');
        } else if (tool.action === 'inline') {
            setActiveTool(activeTool === tool.id ? null : tool.id as ActiveTool);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <svg className="w-4.5 h-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    Narzędzia
                </h1>
                <p className="text-sm text-slate-500 mt-1">Narzędzia sprzedażowe — kalkulator, AI i obróbka dokumentów</p>
            </div>

            {/* Tool cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TOOLS.map(tool => {
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool)}
                            className={`relative text-left p-5 rounded-xl border-2 bg-white transition-all group ${
                                isActive
                                    ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-md'
                                    : tool.borderColor
                            } hover:shadow-md`}
                        >
                            <div className="flex items-start gap-3.5">
                                <div className={`w-11 h-11 rounded-xl ${tool.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                                    {tool.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-800">{tool.title}</h3>
                                        {tool.action === 'external' && (
                                            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">{tool.titleDe}</p>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5">{tool.description}</p>
                                </div>
                            </div>
                            {isActive && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Inline tool area */}
            {activeTool === 'pdf-rebrand' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">PDF Rebranding</h2>
                                <p className="text-[10px] text-slate-400">Teranda → Polendach24</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveTool(null)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <PdfRebrandTool />
                </div>
            )}
        </div>
    );
};
