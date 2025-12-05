import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { Installation } from '../../types';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const LogisticsCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch all installations
            // We need to implement getAllInstallations in DatabaseService
            const data = await DatabaseService.getAllInstallations();
            setInstallations(data);
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

    // Calendar logic helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50 border border-slate-100"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayInstalls = installations.filter(i => i.scheduledDate === dateStr);

            days.push(
                <div key={day} className="min-h-[128px] bg-white border border-slate-200 p-2 relative hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-bold ${new Date().toDateString() === new Date(year, month, day).toDateString()
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : 'text-slate-700'
                            }`}>
                            {day}
                        </span>
                    </div>

                    <div className="space-y-1">
                        {dayInstalls.map(inst => (
                            <Link
                                key={inst.id}
                                to={`/customers/${inst.client.phone ? 'find-by-phone/' + inst.client.phone : ''}`} // Ideally link to installation details or customer
                                className={`block text-[10px] p-1.5 rounded border truncate transition-all hover:scale-105 active:scale-95 ${inst.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                                    inst.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-700 decoration-line-through' :
                                        'bg-orange-50 border-orange-200 text-orange-700'
                                    }`}
                                title={`${inst.productSummary} - ${inst.client.city}`}
                            >
                                <div className="font-bold truncate">{inst.client.city}</div>
                                <div className="truncate opacity-75">{inst.productSummary}</div>
                            </Link>
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
                <h1 className="text-2xl font-bold text-slate-900">Kalendarz Montaży</h1>
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

            <div className="text-xs text-slate-400 text-center">
                Kliknij w montaż, aby przejść do klienta. Legenda:
                <span className="inline-block w-2 h-2 bg-orange-200 mx-1 rounded-full"></span> Zaplanowane
                <span className="inline-block w-2 h-2 bg-green-200 mx-1 rounded-full"></span> Zakończone
            </div>
        </div>
    );
};
