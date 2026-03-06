import React from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

type ViewMode = 'week' | 'month' | 'timeline' | 'map';

interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: ViewMode;
    onDateChange: (date: Date) => void;
    onViewModeChange: (mode: ViewMode) => void;
    onRefresh: () => void;
    onToggleSidebar: () => void;
    onToggleTeamPanel: () => void;
    sidebarOpen: boolean;
    teamPanelOpen: boolean;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    currentDate,
    viewMode,
    onDateChange,
    onViewModeChange,
    onRefresh,
    onToggleSidebar,
    onToggleTeamPanel,
    sidebarOpen,
    teamPanelOpen
}) => {
    const handlePrevious = () => {
        if (viewMode === 'week') onDateChange(subWeeks(currentDate, 1));
        else onDateChange(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === 'week') onDateChange(addWeeks(currentDate, 1));
        else onDateChange(addMonths(currentDate, 1));
    };

    const getDateLabel = () => {
        if (viewMode === 'week') {
            const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
            const we = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(ws, 'd', { locale: pl })} – ${format(we, 'd MMM yyyy', { locale: pl })}`;
        }
        return format(currentDate, 'MMMM yyyy', { locale: pl });
    };

    return (
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sticky top-0 z-20">
            <div className="flex items-center justify-between gap-3">
                {/* Left side */}
                <div className="flex items-center gap-2">
                    {/* Sidebar toggle */}
                    <button
                        onClick={onToggleSidebar}
                        className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${sidebarOpen
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        title="Backlog"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </button>

                    {/* Prev / Today / Next */}
                    <button onClick={handlePrevious} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDateChange(new Date())}
                        className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                    >
                        Dziś
                    </button>
                    <button onClick={handleNext} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Date label — no truncation */}
                    <span className="text-sm sm:text-base font-bold text-slate-800 capitalize whitespace-nowrap">
                        {getDateLabel()}
                    </span>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* View mode */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => onViewModeChange('week')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'week'
                                ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Tydzień
                        </button>
                        <button
                            onClick={() => onViewModeChange('month')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'month'
                                ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Miesiąc
                        </button>
                    </div>

                    {/* Team panel */}
                    <button
                        onClick={onToggleTeamPanel}
                        className={`p-1.5 rounded-lg transition-all hidden lg:block ${teamPanelOpen
                            ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Zespoły"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        title="Odśwież"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
