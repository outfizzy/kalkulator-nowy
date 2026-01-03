import React from 'react';
import type { Task } from '../../types';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDragStart }) => {

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'call':
                return (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                );
            case 'email':
                return (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                );
            case 'meeting':
                return (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            default: // task
                return (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                );
        }
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={() => onEdit(task)}
            className="group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-accent/40 transition-all cursor-move active:cursor-grabbing mb-3"
        >
            <div className="flex justify-between items-start mb-2 gap-2">
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                    {getTypeIcon(task.type)}
                    {task.priority === 'medium' ? 'Średni' : task.priority === 'high' ? 'Wysoki' : 'Niski'}
                </span>

                {task.dueDate && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        {new Date(task.dueDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    </span>
                )}
            </div>

            <h4 className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-accent transition-colors line-clamp-2">
                {task.title}
            </h4>

            {task.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {task.description}
                </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 border border-slate-200">
                        {task.assignee ?
                            `${(task.assignee.firstName || '')[0]}${(task.assignee.lastName || '')[0]}`
                            : '👤'
                        }
                    </div>
                    {task.assignee && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                            {task.assignee.lastName}
                        </span>
                    )}
                </div>

                {/* Status Indicator (if needed within card) */}
                {/* <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} /> */}
            </div>
        </div>
    );
};
