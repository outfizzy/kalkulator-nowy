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
            case 'scheduled': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700">
                <button
                    onClick={handlePrevWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Poprzedni tydzień
                </button>

                <div className="text-lg font-semibold text-white">
                    {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
                </div>

                <button
                    onClick={handleNextWeek}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
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
                                min-h-[200px] bg-slate-800 rounded-lg border-2 p-3 transition-all
                                ${isToday(date) ? 'border-accent ring-2 ring-accent/20' : 'border-slate-700'}
                                ${isTargetDate ? 'border-blue-400 bg-blue-900/20' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, date)}
                            onDrop={(e) => handleDrop(e, date)}
                        >
                            <div className="mb-2">
                                <div className={`text-sm font-medium ${isToday(date) ? 'text-accent' : 'text-slate-400'}`}>
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
                                            p-2 rounded border cursor-pointer transition-all
                                            ${getStatusBadgeColor(measurement.status)}
                                            hover:bg-opacity-30 active:scale-95
                                            ${draggedItemId === measurement.id ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <div className="text-xs font-semibold mb-1">
                                            {measurement.customerName}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {measurement.salesRepName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {measurement.customerAddress}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="font-medium text-slate-300">Status:</div>
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
