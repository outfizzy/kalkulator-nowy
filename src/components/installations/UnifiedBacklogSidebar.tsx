import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Installation, Contract, ServiceTicket } from '../../types';

interface UnifiedBacklogSidebarProps {
    contracts: Contract[];
    serviceTickets: ServiceTicket[];
    pendingInstallations: Installation[];
    onDragStart: (e: React.DragEvent, id: string, type: 'contract' | 'service' | 'installation') => void;
    onAutoSchedule?: (id: string, type: 'contract' | 'service' | 'installation') => void;
    onSchedule: (id: string, type: 'contract' | 'service') => void;
    onCreateManual: () => void;
}

export const UnifiedBacklogSidebar: React.FC<UnifiedBacklogSidebarProps> = ({
    contracts,
    serviceTickets,
    pendingInstallations,
    onDragStart,
    // onAutoSchedule,
    onSchedule,
    onCreateManual
}) => {
    const navigate = useNavigate();
    const [filterQuery, setFilterQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'contracts' | 'services'>('all');

    const filterItem = (text: string) => {
        if (!filterQuery) return true;
        return text.toLowerCase().includes(filterQuery.toLowerCase());
    };

    // Helper to determine parts status color
    const getPartsStatusColor = (contract: Contract) => {
        const items = contract.orderedItems || [];
        if (items.length === 0) return 'bg-slate-200'; // No items tracked
        const delivered = items.filter(i => i.status === 'delivered').length;
        if (delivered === items.length) return 'bg-emerald-500'; // All ready
        if (delivered > 0) return 'bg-amber-400'; // Partial
        return 'bg-red-400'; // None
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-80 flex-shrink-0">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-lg">Gotowe do montażu</h3>
                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-200">
                        {contracts.length + serviceTickets.length + pendingInstallations.length}
                    </span>
                </div>

                {/* Manual Create Button */}
                <button
                    onClick={onCreateManual}
                    className="w-full mb-4 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj Ręcznie
                </button>

                {/* Search */}
                <div className="relative mb-3">
                    <input
                        type="text"
                        placeholder="Szukaj..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-lg">
                    {['all', 'contracts', 'services'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${activeTab === tab
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab === 'all' ? 'Wszystkie' : tab === 'contracts' ? 'Umowy' : 'Serwisy'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 1. Contracts */}
                {(activeTab === 'all' || activeTab === 'contracts') && contracts.map(c => {
                    if (!filterItem(c.client.lastName + c.client.city)) return null;
                    return (
                        <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, c.id, 'contract')}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full ${getPartsStatusColor(c)}`} />
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{c.client.lastName}</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSchedule(c.id, 'contract');
                                            }}
                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1 rounded transition-colors"
                                            title="Zaplanuj montaż"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center">Umowa</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 mb-2 truncate">
                                    {c.product.modelId || 'Produkt'} {c.product.width}x{c.product.projection}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {c.client.city || 'Brak adresu'}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 2. Service Tickets */}
                {(activeTab === 'all' || activeTab === 'services') && serviceTickets.map(t => {
                    const clientName = t.client ? `${t.client.firstName || ''} ${t.client.lastName || ''}`.trim() : '';
                    const clientCity = t.client?.city || '';
                    if (!filterItem(clientName + clientCity + t.description)) return null;

                    const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
                        leak: { label: 'Nieszczelność', icon: '💧', color: 'bg-blue-100 text-blue-700' },
                        electrical: { label: 'Elektryka', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
                        visual: { label: 'Wizualne', icon: '👁️', color: 'bg-purple-100 text-purple-700' },
                        mechanical: { label: 'Mechaniczne', icon: '🔧', color: 'bg-slate-100 text-slate-700' },
                        repair: { label: 'Naprawa', icon: '🔨', color: 'bg-orange-100 text-orange-700' },
                        other: { label: 'Inne', icon: '📋', color: 'bg-slate-100 text-slate-600' },
                    };
                    const priorityLabels: Record<string, { label: string; color: string }> = {
                        critical: { label: 'Krytyczny', color: 'bg-red-100 text-red-700 border-red-200' },
                        high: { label: 'Wysoki', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                        medium: { label: 'Średni', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                        low: { label: 'Niski', color: 'bg-slate-50 text-slate-500 border-slate-200' },
                    };
                    const typeInfo = typeLabels[t.type] || typeLabels.other;
                    const prioInfo = priorityLabels[t.priority] || priorityLabels.medium;

                    // Clean description — strip manual client info lines
                    const cleanDesc = t.description
                        .replace(/Klient:.*\n?/gi, '')
                        .replace(/Adres:.*\n?/gi, '')
                        .replace(/Telefon:.*\n?/gi, '')
                        .replace(/---.*\n?/g, '')
                        .trim();

                    return (
                        <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, t.id, 'service')}
                            onClick={() => navigate(`/service/${t.id}`)}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 cursor-grab active:cursor-grabbing transition-all relative overflow-hidden group/item"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-400" />
                            <div className="pl-3">
                                {/* Row 1: Name + Schedule Button + Service Badge */}
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="min-w-0 flex-1">
                                        <span className="font-bold text-slate-800 text-sm block truncate">
                                            {clientName || t.customerName || 'Klient nieznany'}
                                        </span>
                                        {clientCity && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{clientCity}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0 ml-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSchedule(t.id, 'service');
                                            }}
                                            className="text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 p-1 rounded transition-colors"
                                            title="Zaplanuj serwis"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center">Serwis</span>
                                    </div>
                                </div>
                                {/* Row 2: Type + Priority tags */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${typeInfo.color}`}>
                                        <span className="text-[10px]">{typeInfo.icon}</span> {typeInfo.label}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${prioInfo.color}`}>
                                        {prioInfo.label}
                                    </span>
                                    {t.contractNumber && (
                                        <span className="text-[10px] text-slate-400 font-mono truncate ml-auto">{t.contractNumber}</span>
                                    )}
                                </div>
                                {/* Row 3: Description preview */}
                                <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {cleanDesc || t.description.slice(0, 60)}
                                </div>
                                {/* Row 4: Ticket number + date */}
                                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                                    <span className="font-mono">{t.ticketNumber}</span>
                                    <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('pl-PL') : ''}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 3. Pending Installations */}
                {/* These are existing installation records that got 'unscheduled' or were manually created */}
                {pendingInstallations.map(i => {
                    if (!filterItem(i.client.lastName + i.client.city)) return null;
                    return (
                        <div
                            key={i.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, i.id, 'installation')}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{i.client.lastName}</span>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {i.sourceType === 'manual' ? 'Ręczne' : 'Do Planowania'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mb-2 truncate">
                                    {i.productSummary || i.title || 'Brak opisu'}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {i.client.city}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {contracts.length === 0 && serviceTickets.length === 0 && pendingInstallations.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm px-4">
                        <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        Wszystko zaplanowane! 🎉
                    </div>
                )}
            </div>
        </div>
    );
};
