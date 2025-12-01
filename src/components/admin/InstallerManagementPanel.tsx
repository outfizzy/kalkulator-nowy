import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';
import type { User, Installation } from '../../types';
import { toast } from 'react-hot-toast';

interface InstallerStats {
    installer: User;
    totalAssignments: number;
    completedInstallations: number;
    inProgressInstallations: number;
    nextScheduledInstallation?: Installation;
}

export const InstallerManagementPanel: React.FC = () => {
    const [stats, setStats] = useState<InstallerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedInstallerId, setExpandedInstallerId] = useState<string | null>(null);
    const [installerInstallations, setInstallerInstallations] = useState<Record<string, Installation[]>>({});
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await DatabaseService.getInstallerManagementStats();
            setStats(data);
        } catch (error) {
            console.error('Error loading installer stats:', error);
            toast.error('Błąd ładowania statystyk montażystów');
        } finally {
            setLoading(false);
        }
    };

    const loadInstallerInstallations = async (installerId: string) => {
        if (installerInstallations[installerId]) {
            // Already loaded
            return;
        }

        try {
            const installations = await DatabaseService.getInstallationsForInstaller(installerId);
            setInstallerInstallations(prev => ({ ...prev, [installerId]: installations }));
        } catch (error) {
            console.error('Error loading installer installations:', error);
            toast.error('Błąd ładowania montaży');
        }
    };

    const toggleExpand = async (installerId: string) => {
        if (expandedInstallerId === installerId) {
            setExpandedInstallerId(null);
        } else {
            setExpandedInstallerId(installerId);
            await loadInstallerInstallations(installerId);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Ładowanie statystyk montażystów...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Zarządzanie Montażystami</h1>
                    <p className="text-slate-500 mt-1">Podgląd wszystkich montażystów i ich przypisanych montaży</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500">Aktywni monterzy</div>
                    <div className="text-2xl font-bold text-slate-800">{stats.length}</div>
                </div>
            </div>

            <div className="space-y-3">
                {stats.map((installerStat) => {
                    const isExpanded = expandedInstallerId === installerStat.installer.id;
                    const installations = installerInstallations[installerStat.installer.id] || [];

                    return (
                        <div key={installerStat.installer.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            {/* Installer Header */}
                            <button
                                onClick={() => toggleExpand(installerStat.installer.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center font-bold">
                                        {installerStat.installer.firstName[0]}{installerStat.installer.lastName[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800">
                                            {installerStat.installer.firstName} {installerStat.installer.lastName}
                                        </div>
                                        {installerStat.installer.phone && (
                                            <div className="text-sm text-slate-500">{installerStat.installer.phone}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 mr-4">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase">Przypisane</div>
                                        <div className="text-lg font-bold text-slate-800">{installerStat.totalAssignments}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase">Ukończone</div>
                                        <div className="text-lg font-bold text-green-600">{installerStat.completedInstallations}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 uppercase">W trakcie</div>
                                        <div className="text-lg font-bold text-blue-600">{installerStat.inProgressInstallations}</div>
                                    </div>
                                    {installerStat.nextScheduledInstallation && (
                                        <div className="text-center">
                                            <div className="text-xs text-slate-500 uppercase">Następny</div>
                                            <div className="text-sm font-medium text-slate-700">
                                                {new Date(installerStat.nextScheduledInstallation.scheduledDate!).toLocaleDateString('pl-PL')}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <svg
                                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Expanded: Installations List */}
                            {isExpanded && (
                                <div className="border-t border-slate-200 bg-slate-50">
                                    {installations.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            Brak przypisanych montaży
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-200">
                                            {installations.map((installation) => (
                                                <div
                                                    key={installation.id}
                                                    onClick={() => setSelectedInstallation(installation)}
                                                    className="p-4 hover:bg-white transition-colors cursor-pointer flex items-center justify-between"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium text-slate-800">
                                                            {installation.client.firstName} {installation.client.lastName}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                            {installation.client.address}, {installation.client.city}
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            {installation.productSummary}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {installation.scheduledDate && (
                                                            <div className="text-sm text-slate-600">
                                                                {new Date(installation.scheduledDate).toLocaleDateString('pl-PL')}
                                                            </div>
                                                        )}
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${installation.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                installation.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                                    installation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                            }`}>
                                                            {installation.status === 'completed' ? 'Ukończony' :
                                                                installation.status === 'scheduled' ? 'Zaplanowany' :
                                                                    installation.status === 'pending' ? 'Oczekujący' : 'Problem'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Installation Details Modal */}
            {selectedInstallation && (
                <InstallationDetailsModal
                    installation={selectedInstallation}
                    isOpen={!!selectedInstallation}
                    onClose={() => setSelectedInstallation(null)}
                    onUpdate={() => {
                        loadStats();
                        if (expandedInstallerId) {
                            setInstallerInstallations(prev => {
                                const newState = { ...prev };
                                delete newState[expandedInstallerId];
                                return newState;
                            });
                            loadInstallerInstallations(expandedInstallerId);
                        }
                    }}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                    readOnly={false}
                />
            )}
        </div>
    );
};
