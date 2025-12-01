import React from 'react';

interface GroupingControlsProps {
    groupBy: 'none' | 'region' | 'status' | 'team';
    onGroupByChange: (value: 'none' | 'region' | 'status' | 'team') => void;
    sortBy: 'date' | 'city' | 'status';
    onSortByChange: (value: 'date' | 'city' | 'status') => void;
}

export const GroupingControls: React.FC<GroupingControlsProps> = ({
    groupBy,
    onGroupByChange,
    sortBy,
    onSortByChange
}) => {
    return (
        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Grupuj:</span>
                <select
                    value={groupBy}
                    onChange={(e) => onGroupByChange(e.target.value as any)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="none">Bez grupowania</option>
                    <option value="region">Region</option>
                    <option value="status">Status</option>
                    <option value="team">Ekipa</option>
                </select>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Sortuj:</span>
                <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value as any)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="date">Data</option>
                    <option value="city">Miasto</option>
                    <option value="status">Status</option>
                </select>
            </div>
        </div>
    );
};
