import React from 'react';
import { Link } from 'react-router-dom';
import type { Lead } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface StaleLeadsWidgetProps {
    leads: Lead[];
}

export const StaleLeadsWidget: React.FC<StaleLeadsWidgetProps> = ({ leads }) => {
    if (leads.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Leady wymagające uwagi
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full">
                    {leads.length}
                </span>
            </div>
            <div className="flex-1 overflow-auto p-0 max-h-[400px]">
                <div className="divide-y divide-slate-50">
                    {leads.map((lead) => (
                        <Link
                            key={lead.id}
                            to={`/leads/${lead.id}`}
                            className="block p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-slate-700 truncate pr-2">
                                    {lead.customerData.firstName} {lead.customerData.lastName}
                                    {lead.customerData.companyName && ` (${lead.customerData.companyName})`}
                                </span>
                                <span className="text-xs whitespace-nowrap text-slate-400">
                                    {formatDistanceToNow(lead.updatedAt, { addSuffix: true, locale: pl })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                    {lead.status}
                                </span>
                                {lead.assignee && (
                                    <span>
                                        {lead.assignee.firstName} {lead.assignee.lastName[0]}.
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
