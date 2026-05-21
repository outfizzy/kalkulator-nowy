import React from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PanelLeft, ChevronLeft, ChevronRight, Users, CalendarDays, RefreshCw } from 'lucide-react';

type ViewMode = 'week' | 'month' | 'timeline' | 'map';

interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: ViewMode;
    onDateChange: (date: Date) => void;
    onViewModeChange: (mode: ViewMode) => void;
    onRefresh: () => void;
    onToggleSidebar: () => void;
    onToggleTeamPanel: () => void;
    onGoogleImport?: () => void;
    onGoogleAIImport?: () => void;
    showGoogleEvents?: boolean;
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
    onGoogleImport,
    onGoogleAIImport,
    showGoogleEvents,
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
                        <PanelLeft className="w-5 h-5" />
                    </button>

                    {/* Prev / Today / Next */}
                    <button onClick={handlePrevious} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onDateChange(new Date())}
                        className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                    >
                        Dziś
                    </button>
                    <button onClick={handleNext} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
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
                        <Users className="w-4 h-4" />
                    </button>

                    {/* Google Calendar Toggle */}
                    {onGoogleImport && (
                        <button
                            onClick={onGoogleImport}
                            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${showGoogleEvents
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'text-sky-500 hover:bg-sky-50 hover:text-sky-600'
                            }`}
                            title={showGoogleEvents ? 'Ukryj Google Calendar' : 'Pokaż Google Calendar'}
                        >
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-[10px] font-bold hidden sm:inline">Google</span>
                        </button>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        title="Odśwież"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
