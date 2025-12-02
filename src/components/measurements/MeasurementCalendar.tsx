import React, { useState } from 'react';
import type { Measurement } from '../../types';

interface MeasurementCalendarProps {
    measurements: Measurement[];
    onEdit: (measurement: Measurement) => void;
    onDragDrop?: (measurementId: string, newDate: string) => Promise<void>;
}

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export const MeasurementCalendar: React.FC<MeasurementCalendarProps> = ({ measurements, onEdit, onDragDrop }) => {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        return getStartOfWeek(today);
    });
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ date: Date } | null>(null);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        return date;
    });

    const handlePrevWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart);
    };

    const handleNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ date });
    };

    const handleDrop = async (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        if (draggedItemId && onDragDrop) {
            await onDragDrop(draggedItemId, date.toISOString().split('T')[0]);
        }
        setDraggedItemId(null);
        setDropTarget(null);
    };

    const getMeasurementsForDate = (date: Date): Measurement[] => {
        const dateStr = date.toISOString().split('T')[0];
        return measurements.filter(m => {
            const mDateStr = new Date(m.scheduledDate).toISOString().split('T')[0];
            return mDateStr === dateStr;
        });
    };

    const getStatusBadgeColor = (status: Measurement['status']) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'completed': return 'bg-green-50 text-green-700 border-green-200';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pl-PL', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        }).format(date);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="space-y-4">
            {/* Header with week navigation */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <button
                    onClick={handlePrevWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Poprzedni tydzień
                </button>

                <div className="text-lg font-bold text-slate-800">
                    {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
                </div>

                <button
                    onClick={handleNextWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors font-medium"
                >
                    Następny tydzień
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, index) => {
                    const dayMeasurements = getMeasurementsForDate(date);
                    const isTargetDate = dropTarget && dropTarget.date.toDateString() === date.toDateString();

                    return (
                        <div
                            key={index}
                            className={`
                                min-h-[200px] bg-white rounded-xl border-2 p-3 transition-all shadow-sm
                                ${isToday(date) ? 'border-accent ring-2 ring-accent/10' : 'border-slate-100'}
                                ${isTargetDate ? 'border-blue-400 bg-blue-50' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDrop={(e) => handleDrop(e, date)}
                        >
                            <div className="mb-3 pb-2 border-b border-slate-50">
                                <div className={`text-sm font-bold ${isToday(date) ? 'text-accent' : 'text-slate-600'}`}>
                                    {formatDate(date)}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {dayMeasurements.map((measurement) => (
                                    <div
                                        key={measurement.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, measurement.id)}
                                        onClick={() => onEdit(measurement)}
                                        className={`
                                            p-3 rounded-lg border cursor-pointer transition-all shadow-sm
                                            ${getStatusBadgeColor(measurement.status)}
                                            hover:shadow-md active:scale-95
                                            ${draggedItemId === measurement.id ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <div className="text-xs font-bold mb-1 text-slate-800">
                                            {measurement.customerName}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {measurement.salesRepName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate">{measurement.customerAddress}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-700">Status:</div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('scheduled')}`}>
                        Zaplanowano
                    </span>
                    <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('completed')}`}>
                        Zrealizowano
                    </span>
                    <span className={`px-2 py-1 rounded border ${getStatusBadgeColor('cancelled')}`}>
                        Anulowano
                    </span>
                </div>
            </div>
        </div>
    );
};
