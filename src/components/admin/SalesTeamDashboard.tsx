import React from 'react';
import { SalesTeamStats } from './SalesTeamStats';

export const SalesTeamDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-700">Statystyki Zespołu</h1>
            <SalesTeamStats />
        </div>
    );
};
