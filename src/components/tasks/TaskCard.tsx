import React from 'react';
import type { Task } from '../../types';

interface TaskCardProps {
    task: Task;
    currentUserId: string;
    onEdit: (task: Task) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
    onDelete?: (taskId: string) => void;
    onQuickComplete?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, currentUserId, onEdit, onDragStart, onDelete, onQuickComplete }) => {

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'high': return { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Wysoki' };
            case 'medium': return { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400', label: 'Średni' };
            case 'low': return { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400', label: 'Niski' };
            default: return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: '—' };
        }
    };

    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'call': return { icon: '📞', label: 'Telefon' };
            case 'email': return { icon: '📧', label: 'Email' };
            case 'meeting': return { icon: '🤝', label: 'Spotkanie' };
            default: return { icon: '📋', label: 'Zadanie' };
        }
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isAssignedToMe = task.userId === currentUserId;
    const isCompleted = task.status === 'completed';
    const priority = getPriorityStyles(task.priority);
    const typeInfo = getTypeInfo(task.type);

    // Format relative date
    const formatDue = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Dziś';
        if (diffDays === 1) return 'Jutro';
        if (diffDays === -1) return 'Wczoraj';
        if (diffDays < -1) return `${Math.abs(diffDays)} dni temu`;
        if (diffDays < 7) return d.toLocaleDateString('pl-PL', { weekday: 'short' });
        return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-move active:cursor-grabbing ${
                isOverdue ? 'border-red-200 bg-red-50/30' :
                isCompleted ? 'border-slate-200 opacity-60' :
                'border-slate-200 hover:border-indigo-300'
            }`}
        >
            {/* Priority bar */}
            <div className={`h-1 rounded-t-xl ${priority.dot}`} />

            <div className="p-3">
                {/* Top row: type + priority + due date */}
                <div className="flex items-center justify-between mb-2 gap-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs">{typeInfo.icon}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${priority.badge}`}>
                            {priority.label}
                        </span>
                    </div>

                    {task.dueDate && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isOverdue ? 'bg-red-100 text-red-600 font-bold' : 
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {isOverdue && '⏰ '}{formatDue(task.dueDate)}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h4 
                    onClick={() => onEdit(task)}
                    className={`text-sm font-semibold mb-1 cursor-pointer transition-colors line-clamp-2 ${
                        isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-indigo-600'
                    }`}
                >
                    {task.title}
                </h4>

                {/* Description preview */}
                {task.description && (
                    <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">{task.description}</p>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                            isAssignedToMe 
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {task.assignee
                                ? `${(task.assignee.firstName || '')[0]}${(task.assignee.lastName || '')[0]}`
                                : '👤'
                            }
                        </div>
                        <span className={`text-[10px] truncate max-w-[80px] ${isAssignedToMe ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                            {isAssignedToMe ? 'Ja' : (task.assignee ? `${task.assignee.firstName} ${(task.assignee.lastName || '')[0]}.` : '—')}
                        </span>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onQuickComplete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onQuickComplete(task.id); }}
                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                                    isCompleted 
                                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                        : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'
                                }`}
                                title={isCompleted ? 'Przywróć' : 'Zakończ'}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                            title="Edytuj"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        {onDelete && (isAssignedToMe || true) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                title="Usuń"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Customer tag */}
                {task.customerName && (
                    <div className="mt-1.5">
                        <span className="text-[9px] text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100">
                            🏠 {task.customerName}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
