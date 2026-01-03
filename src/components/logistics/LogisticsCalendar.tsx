import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { ProcurementService } from '../../services/database/procurement.service';
import type { Installation, ProcurementItem } from '../../types';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const LogisticsCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [instData, procData] = await Promise.all([
                DatabaseService.getAllInstallations(),
                ProcurementService.getItems()
            ]);
            setInstallations(instData);
            setProcurementItems(procData);
        } catch (error) {
            console.error('Error loading logistics:', error);
            toast.error('Błąd ładowania kalendarza');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    // Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Monday start
    };

    // Week string "2026-W05" -> Date (Monday)
    const getDateFromWeek = (weekStr: string): Date | null => {
        if (!weekStr) return null;
        const match = weekStr.match(/^(\d{4})-W(\d{1,2})$/);
        if (!match) return null;

        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        const d = new Date(year, 0, 1);
        const dayNum = d.getDay() || 7;
        d.setDate(d.getDate() + 4 - dayNum + 7 * (week - 1));
        const res = new Date(d.valueOf());
        res.setDate(res.getDate() - (res.getDay() || 7) + 1); // Get Monday
        return res;
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50 border border-slate-100"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // 1. Existing Installations
            const dayInstalls = installations.filter(i => i.scheduledDate === dateStr);

            // 2. Deliveries (Confirmed Date OR Start of Week)
            const dayDeliveries = procurementItems.filter(item => {
                if (item.status !== 'ordered') return false;

                // Priority: Confirmed Date
                if (item.confirmed_delivery_date === dateStr) return true;

                // Fallback: Week (show on Monday)
                if (!item.confirmed_delivery_date && item.delivery_week) {
                    const mondayDate = getDateFromWeek(item.delivery_week);
                    if (mondayDate && mondayDate.toDateString() === dateObj.toDateString()) {
                        return true;
                    }
                }
                return false;
            });

            // 3. Suggestions (7 days after delivery if no install linked/scheduled)
            // Note: In real app, we need to link procurement item -> installation. 
            // Here assuming sourceType='installation' and sourceId is installationId or we check generic link.
            // For simplicity: If we have a delivery today, we suggest install in 7 days.
            // OR: We scan ALL deliveries, add 7 days, and if that lands on THIS day, we show suggestion.

            /* Logic for rendering 'Suggestions' on THIS day */
            const suggestedInstallations = procurementItems
                .filter(item => item.status === 'ordered')
                .map(item => {
                    let deliveryDate: Date | null = null;
                    if (item.confirmed_delivery_date) deliveryDate = new Date(item.confirmed_delivery_date);
                    else if (item.delivery_week) {
                        const d = getDateFromWeek(item.delivery_week);
                        if (d) {
                            // If only week known, suggest install next week Monday?
                            // Or let's say "Expected Delivery" + 7 days
                            deliveryDate = d;
                        }
                    }

                    if (!deliveryDate) return null;

                    // Suggest 7 days later
                    const suggestDate = new Date(deliveryDate);
                    suggestDate.setDate(suggestDate.getDate() + 7);

                    if (suggestDate.toDateString() === dateObj.toDateString()) {
                        return item; // This item suggests an install today
                    }
                    return null;
                })
                .filter((item): item is ProcurementItem => item !== null);


            days.push(
                <div key={day} className="min-h-[128px] bg-white border border-slate-200 p-2 relative hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-bold ${new Date().toDateString() === dateObj.toDateString()
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : 'text-slate-700'
                            }`}>
                            {day}
                        </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[100px]">
                        {/* Installations */}
                        {dayInstalls.map(inst => (
                            <Link
                                key={inst.id}
                                to={`/customers/${inst.client.phone ? 'find-by-phone/' + inst.client.phone : ''}`}
                                className={`block text-[10px] p-1.5 rounded border transition-all hover:scale-105 active:scale-95 text-left mb-1 shadow-sm ${inst.status === 'completed' ? 'bg-green-50 border-green-200 text-green-800' :
                                    inst.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-800 decoration-line-through' :
                                        'bg-orange-50 border-orange-200 text-orange-800'
                                    }`}
                                title={`Montaż: ${inst.productSummary} | ${inst.client.firstName} ${inst.client.lastName} | ${inst.client.address} | ${inst.contractNumber || '-'}`}
                            >
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold truncate max-w-[60%]">{inst.client.city}</span>
                                    {inst.contractNumber && (
                                        <span className="text-[9px] opacity-75 font-mono bg-white/50 px-1 rounded">{inst.contractNumber}</span>
                                    )}
                                </div>
                                <div className="truncate font-medium mb-0.5">
                                    {inst.client.firstName} {inst.client.lastName}
                                </div>
                                {inst.client.address && (
                                    <div className="truncate text-[9px] opacity-75 mb-0.5">
                                        {inst.client.address}
                                    </div>
                                )}
                                <div className="truncate opacity-75 text-[9px] border-t border-black/5 pt-0.5 mt-0.5">
                                    {inst.productSummary}
                                </div>
                            </Link>
                        ))}

                        {/* Deliveries */}
                        {dayDeliveries.map(item => (
                            <div
                                key={item.id}
                                className="block text-[10px] p-1.5 rounded border border-blue-200 bg-blue-50 text-blue-800 text-left mb-1 shadow-sm"
                                title={`Dostawa: ${item.itemName} | ${item.clientName} | ${item.referenceNumber}`}
                            >
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold truncate text-blue-900 flex items-center gap-1">
                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {item.clientCity}
                                    </span>
                                    <span className="text-[9px] opacity-75 font-mono bg-white/50 px-1 rounded">{item.referenceNumber}</span>
                                </div>
                                <div className="truncate font-medium mb-0.5 text-blue-900">
                                    {item.clientName}
                                </div>
                                <div className="truncate opacity-75 text-[9px] border-t border-blue-200/50 pt-0.5 mt-0.5">
                                    {item.itemName}
                                </div>
                            </div>
                        ))}

                        {/* Suggestions */}
                        {suggestedInstallations.map(item => (
                            <div
                                key={`suggest-${item.itemId}`}
                                className="block text-[10px] p-1.5 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-left mb-1 cursor-not-allowed opacity-75 grayscale hover:grayscale-0 transition-all"
                                title={`Sugerowany termin montażu dla: ${item.itemName}`}
                            >
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold truncate flex items-center gap-1">
                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Sugestia
                                    </span>
                                    <span className="text-[9px] opacity-75 font-mono bg-white/50 px-1 rounded">{item.referenceNumber}</span>
                                </div>
                                <div className="truncate font-medium mb-0.5">
                                    {item.clientName}
                                </div>
                                <div className="truncate opacity-75 text-[9px]">
                                    {item.itemName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie kalendarza...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Kalendarz Montaży i Dostaw</h1>
                <div className="flex gap-2 items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="font-bold px-4 w-32 text-center text-slate-800">
                        {currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map(day => (
                        <div key={day} className="p-3 text-center font-bold text-slate-500 text-xs uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 bg-slate-100 gap-px border-l border-slate-200">
                    {renderCalendarGrid()}
                </div>
            </div>

            <div className="text-xs text-slate-400 text-center flex justify-center gap-4">
                <span>Kliknij element, aby przejść do szczegółów. Legenda:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-200 rounded-full"></span> Montaż</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-200 rounded-full"></span> Dostawa</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-200 rounded-full border border-slate-300 border-dashed"></span> Sugestia</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-200 rounded-full"></span> Zakończone</span>
            </div>
        </div>
    );
};
