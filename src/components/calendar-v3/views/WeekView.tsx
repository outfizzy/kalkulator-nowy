import React from 'react';
import { format, addDays, startOfWeek, isSameDay, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { Installation, InstallationTeam } from '../../../types';
import { InstallationCard } from '../InstallationCard';
import { DroppableDay } from '../DroppableDay';
import { useState } from 'react';

interface WeekViewProps {
    currentDate: Date;
    installations: Installation[];
    teams: InstallationTeam[];
    onRefresh: () => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
    currentDate,
    installations,
    teams,
    onRefresh
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Get week days (Monday to Sunday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Group installations by date
    const installationsByDate = installations.reduce((acc, installation) => {
        const dateKey = installation.startDate.split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(installation);
        return acc;
    }, {} as Record<string, Installation[]>);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Handle drop logic here
        console.log('Dropped', active.id, 'on', over.id);
        // TODO: Implement installation rescheduling
        onRefresh();
    };

    const activeInstallation = activeId
        ? installations.find(i => i.id === activeId)
        : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col">
                {/* Week Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {weekDays.map((day) => {
                        const isToday = isSameDay(day, new Date());
                        const isWeekendDay = isWeekend(day);

                        return (
                            <div
                                key={day.toISOString()}
                                className={`p-4 text-center border-r border-slate-200 last:border-r-0 ${isWeekendDay ? 'bg-slate-100' : ''
                                    }`}
                            >
                                <div className={`text-sm font-medium ${isToday ? 'text-accent' : 'text-slate-600'
                                    }`}>
                                    {format(day, 'EEEE', { locale: pl })}
                                </div>
                                <div className={`text-2xl font-bold mt-1 ${isToday
                                        ? 'text-accent'
                                        : isWeekendDay
                                            ? 'text-slate-500'
                                            : 'text-slate-900'
                                    }`}>
                                    {format(day, 'd')}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {format(day, 'MMM', { locale: pl })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Week Grid */}
                <div className="flex-1 grid grid-cols-7 overflow-auto">
                    {weekDays.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayInstallations = installationsByDate[dateKey] || [];
                        const isWeekendDay = isWeekend(day);

                        return (
                            <DroppableDay
                                key={dateKey}
                                date={day}
                                dateKey={dateKey}
                                installations={dayInstallations}
                                teams={teams}
                                isWeekend={isWeekendDay}
                                onRefresh={onRefresh}
                            />
                        );
                    })}
                </div>
            </div>

            <DragOverlay>
                {activeInstallation ? (
                    <div className="opacity-90 rotate-2 cursor-grabbing">
                        <InstallationCard
                            installation={activeInstallation}
                            teams={teams}
                            isDragging={true}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
