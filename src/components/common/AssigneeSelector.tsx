import React, { useEffect, useState } from 'react';
import { UserService } from '../../services/database/user.service';
import type { User } from '../../types';

interface AssigneeSelectorProps {
    currentAssigneeId?: string;
    onAssign: (userId: string) => Promise<void>;
    onCancel: () => void;
}

export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ currentAssigneeId, onAssign, onCancel }) => {
    const [assignees, setAssignees] = useState<User[]>([]);
    const [selectedId, setSelectedId] = useState<string>(currentAssigneeId || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadReps = async () => {
            try {
                const reps = await UserService.getSalesReps();
                setAssignees(reps.filter(u => u.status === 'active'));
            } catch (e) {
                console.error('Failed to load reps', e);
            }
        };
        loadReps();
    }, []);

    const handleSave = async () => {
        if (!selectedId || selectedId === currentAssigneeId) {
            onCancel();
            return;
        }

        setLoading(true);
        try {
            await onAssign(selectedId);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="p-1 px-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-white"
                disabled={loading}
                autoFocus
            >
                <option value="">-- Wybierz --</option>
                {assignees.map(user => (
                    <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                    </option>
                ))}
            </select>
            <button
                onClick={handleSave}
                disabled={loading || !selectedId}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                title="Zapisz"
            >
                {loading ? (
                    <span className="w-4 h-4 block rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>
            <button
                onClick={onCancel}
                disabled={loading}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                title="Anuluj"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};
