import React from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

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
        if (viewMode === 'day') {
            onDateChange(subDays(currentDate, 1));
        } else if (viewMode === 'week') {
            onDateChange(subWeeks(currentDate, 1));
        } else {
            onDateChange(subMonths(currentDate, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            onDateChange(addDays(currentDate, 1));
        } else if (viewMode === 'week') {
            onDateChange(addWeeks(currentDate, 1));
        } else {
            onDateChange(addMonths(currentDate, 1));
        }
    };

    const handleToday = () => {
        onDateChange(new Date());
    };

    const getDateLabel = () => {
        if (viewMode === 'day') {
            return format(currentDate, 'EEEE, d MMMM yyyy', { locale: pl });
        } else if (viewMode === 'week') {
            return format(currentDate, "'Tydzień' w, MMMM yyyy", { locale: pl });
        } else {
            return format(currentDate, 'MMMM yyyy', { locale: pl });
        }
    };

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left: Title & Navigation */}
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">Kalendarz Montaży</h1>

                    <div className="flex items-center gap-2 ml-6">
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Dziś
                        </button>

                        <div className="flex items-center border border-slate-300 rounded-lg">
                            <button
                                onClick={handlePrevious}
                                className="p-1.5 hover:bg-slate-50 rounded-l-lg"
                            >
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNext}
                                className="p-1.5 hover:bg-slate-50 rounded-r-lg border-l border-slate-300"
                            >
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <span className="text-lg font-semibold text-slate-900 min-w-[250px]">
                            {getDateLabel()}
                        </span>
                    </div>
                </div>

                {/* Right: View Mode & Actions */}
                <div className="flex items-center gap-3">
                    {/* View Mode Switcher */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => onViewModeChange('day')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'day'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Dzień
                        </button>
                        <button
                            onClick={() => onViewModeChange('week')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Tydzień
                        </button>
                        <button
                            onClick={() => onViewModeChange('month')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Miesiąc
                        </button>
                    </div>

                    {/* Sidebar Toggle */}
                    <button
                        onClick={onToggleSidebar}
                        className={`p-2 rounded-lg transition-colors ${sidebarOpen
                                ? 'bg-accent text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        title="Pokaż/Ukryj Backlog"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Team Panel Toggle */}
                    <button
                        onClick={onToggleTeamPanel}
                        className={`p-2 rounded-lg transition-colors ${teamPanelOpen
                                ? 'bg-accent text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        title="Pokaż/Ukryj Zespoły"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={onRefresh}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Odśwież"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
