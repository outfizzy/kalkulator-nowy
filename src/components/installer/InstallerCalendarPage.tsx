import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { InstallerSessionService, type WorkSession } from '../../services/database/installer-session.service';
import { useAuth } from '../../contexts/AuthContext';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const MONTHS_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

interface DayData {
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    installations: Installation[];
    session?: WorkSession;
}

export const InstallerCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [sessions, setSessions] = useState<WorkSession[]>([]);
    const [myTeam, setMyTeam] = useState<InstallationTeam | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUser, currentMonth]);

    const loadData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const teams = await InstallationTeamService.getTeams();
            const team = teams.find(t => t.members.some(m => m.id === currentUser.id));
            setMyTeam(team || null);

            const allInstallations = await DatabaseService.getInstallations();
            const filtered = team
                ? allInstallations.filter(i => i.teamId === team.id)
                : allInstallations;
            setInstallations(filtered);

            // Load work sessions for this month
            if (team) {
                const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
                const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
                const monthSessions = await InstallerSessionService.getWeekSessions(team.id, startDate, endDate);
                setSessions(monthSessions);
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania kalendarza');
        } finally {
            setLoading(false);
        }
    };

    // Build calendar grid
    const calendarDays = useMemo((): DayData[] => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Monday-based week: getDay() returns 0=Sun, adjust so Mon=0
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        const today = new Date().toISOString().split('T')[0];
        const days: DayData[] = [];

        // Previous month filler days
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === today,
                installations: installations.filter(inst => inst.scheduledDate?.split('T')[0] === dateStr),
                session: sessions.find(s => s.sessionDate === dateStr),
            });
        }

        // Current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const d = new Date(year, month, day);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === today,
                installations: installations.filter(inst => inst.scheduledDate?.split('T')[0] === dateStr),
                session: sessions.find(s => s.sessionDate === dateStr),
            });
        }

        // Next month filler to complete last row
        const remaining = 7 - (days.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(year, month + 1, i);
                const dateStr = d.toISOString().split('T')[0];
                days.push({
                    date: d,
                    dateStr,
                    isCurrentMonth: false,
                    isToday: dateStr === today,
                    installations: installations.filter(inst => inst.scheduledDate?.split('T')[0] === dateStr),
                    session: sessions.find(s => s.sessionDate === dateStr),
                });
            }
        }

        return days;
    }, [currentMonth, installations, sessions]);

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const goToday = () => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    // Stats for the month
    const monthStats = useMemo(() => {
        const monthInstallations = installations.filter(i => {
            if (!i.scheduledDate) return false;
            const d = new Date(i.scheduledDate);
            return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
        });

        const completedSessions = sessions.filter(s => s.status === 'completed');
        const totalHours = completedSessions.reduce((sum, s) => sum + (s.totalWorkMinutes || 0) / 60, 0);
        const totalCost = completedSessions.reduce((sum, s) => sum + s.totalCost, 0);

        return {
            installationCount: monthInstallations.length,
            completedCount: monthInstallations.filter(i => i.status === 'completed').length,
            totalHours: Math.round(totalHours * 10) / 10,
            totalCost: Math.round(totalCost * 100) / 100,
        };
    }, [installations, sessions, currentMonth]);

    const openNavigation = (inst: Installation) => {
        const addr = encodeURIComponent(`${inst.client.address}, ${inst.client.postalCode || ''} ${inst.client.city}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <Link to="/installer" className="text-slate-400 hover:text-slate-600 p-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-800">Kalendarz</h1>
                        <button onClick={goToday} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50">
                            Dziś
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Month Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
                        <p className="text-2xl font-bold text-indigo-600">{monthStats.installationCount}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Montaże</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{monthStats.completedCount}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Ukończone</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
                        <p className="text-2xl font-bold text-amber-600">{monthStats.totalHours}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Godzin</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
                        <p className="text-lg font-bold text-slate-700">{monthStats.totalCost.toFixed(0)}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">EUR koszt</p>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600">
                        <button onClick={prevMonth} className="text-white/80 hover:text-white p-1 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="text-white font-bold text-lg">
                            {MONTHS_PL[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                        <button onClick={nextMonth} className="text-white/80 hover:text-white p-1 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {WEEKDAYS.map(day => (
                            <div key={day} className="text-center py-2 text-xs font-semibold text-slate-400 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, idx) => {
                            const hasInstallation = day.installations.length > 0;
                            const hasSession = !!day.session;
                            const isCompleted = day.session?.status === 'completed';
                            const isSelected = selectedDay?.dateStr === day.dateStr;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDay(isSelected ? null : day)}
                                    className={`
                                        relative aspect-square flex flex-col items-center justify-center
                                        border-b border-r border-slate-50 transition-all
                                        ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                        ${day.isToday ? 'bg-indigo-50' : ''}
                                        ${isSelected ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-400' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <span className={`
                                        text-sm font-medium
                                        ${day.isToday ? 'bg-indigo-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}
                                        ${!day.isToday && day.isCurrentMonth ? 'text-slate-700' : ''}
                                    `}>
                                        {day.date.getDate()}
                                    </span>

                                    {/* Dots indicator */}
                                    <div className="flex items-center gap-0.5 mt-1">
                                        {hasInstallation && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                day.installations.some(i => i.status === 'completed') 
                                                    ? 'bg-emerald-500' 
                                                    : 'bg-blue-500'
                                            }`} />
                                        )}
                                        {day.installations.length > 1 && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                                        )}
                                        {isCompleted && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        )}
                                    </div>

                                    {/* Multi-day indicator */}
                                    {day.installations.some(i => (i.expectedDuration || 1) > 1) && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Montaż</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Zakończony</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Sesja pracy</span>
                </div>

                {/* Selected Day Detail */}
                {selectedDay && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
                            <h3 className="text-white font-bold">
                                {selectedDay.date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button onClick={() => setSelectedDay(null)} className="text-white/60 hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Installations for this day */}
                            {selectedDay.installations.length > 0 ? (
                                selectedDay.installations.map(inst => (
                                    <div key={inst.id} className="bg-slate-50 rounded-xl p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800">
                                                        {inst.client.firstName} {inst.client.lastName}
                                                    </h4>
                                                    {inst.status === 'completed' && (
                                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✅</span>
                                                    )}
                                                    {inst.status === 'scheduled' && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">📅</span>
                                                    )}
                                                </div>
                                                {inst.contractNumber && (
                                                    <p className="text-xs text-slate-400">{inst.contractNumber}</p>
                                                )}
                                                <p className="text-sm text-slate-600">{inst.client.address}</p>
                                                <p className="text-sm text-slate-600">{inst.client.postalCode} {inst.client.city}</p>
                                                <p className="text-xs text-slate-400 mt-1">{inst.productSummary}</p>

                                                {(inst.expectedDuration || 1) > 1 && (
                                                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                                        📅 {inst.expectedDuration} dni montażu
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                                    {inst.partsReady || inst.partsStatus === 'all_delivered' ? (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✅ Materiały OK</span>
                                                    ) : inst.partsStatus === 'partial' ? (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⚠️ Częściowo</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ Brak materiałów</span>
                                                    )}
                                                </div>

                                                {inst.notes && (
                                                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                                                        ⚠️ {inst.notes}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 ml-3">
                                                <button
                                                    onClick={() => openNavigation(inst)}
                                                    className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                                                    title="Nawiguj"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                    </svg>
                                                </button>
                                                <a href={`tel:${inst.client.phone}`} className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition-colors" title="Zadzwoń">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Brak montaży tego dnia
                                </div>
                            )}

                            {/* Work Session info */}
                            {selectedDay.session && (
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                    <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Sesja pracy
                                        {selectedDay.session.status === 'completed' && (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-auto">Zakończona</span>
                                        )}
                                        {selectedDay.session.status === 'started' && (
                                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full ml-auto animate-pulse">W trakcie</span>
                                        )}
                                    </h4>
                                    <div className="mt-2 space-y-1 text-xs text-amber-700">
                                        {selectedDay.session.startedAt && (
                                            <p>
                                                ⏱️ {new Date(selectedDay.session.startedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                {selectedDay.session.endedAt && (
                                                    <> → {new Date(selectedDay.session.endedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</>
                                                )}
                                            </p>
                                        )}
                                        {selectedDay.session.totalWorkMinutes != null && (
                                            <p>⏰ {Math.floor(selectedDay.session.totalWorkMinutes / 60)}h {selectedDay.session.totalWorkMinutes % 60}min</p>
                                        )}
                                        {selectedDay.session.status === 'completed' && (
                                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-amber-200">
                                                <span>👷 {selectedDay.session.laborCost.toFixed(2)} EUR</span>
                                                {selectedDay.session.fuelCost > 0 && <span>⛽ {selectedDay.session.fuelCost.toFixed(2)} EUR</span>}
                                                {selectedDay.session.hotelCost > 0 && <span>🏨 {selectedDay.session.hotelCost.toFixed(2)} EUR</span>}
                                                <span className="font-bold ml-auto">💰 {selectedDay.session.totalCost.toFixed(2)} EUR</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Crew */}
                                    {selectedDay.session.crewMembers && selectedDay.session.crewMembers.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedDay.session.crewMembers.map((m, i) => (
                                                <span key={i} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                                                    {m.firstName} {m.lastName}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
