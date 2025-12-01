import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import type { Installation } from '../../types';
import { InstallationCalendar } from './InstallationCalendar';
import { InstallationDetailsModal } from './InstallationDetailsModal';

export const InstallerInstallationsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState<{ completedCount: number }>({ completedCount: 0 });

    useEffect(() => {
        const load = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const [data, statsData] = await Promise.all([
                    DatabaseService.getInstallationsForInstaller(currentUser.id),
                    DatabaseService.getInstallerStats(currentUser.id)
                ]);
                setInstallations(data);
                setStats(statsData);
            } catch (e) {
                console.error('Error loading installer installations:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser]);

    const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);

    if (loading) return <div className="p-8 text-center text-slate-500">Ładowanie...</div>;

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Mój kalendarz montaży</h1>
                        <p className="text-slate-500 text-sm">
                            Wszystkie montaże przypisane do Twojego konta
                        </p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Zrealizowane</p>
                            <p className="text-lg font-bold text-slate-800">{stats.completedCount}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <InstallationCalendar
                    installations={installations}
                    teams={[]}
                    onEdit={(inst) => setEditingInstallation(inst)}
                />
            </div>

            {editingInstallation && (
                <InstallationDetailsModal
                    installation={editingInstallation}
                    isOpen={!!editingInstallation}
                    onClose={() => setEditingInstallation(null)}
                    onUpdate={() => {
                        // Reload data
                        if (currentUser) {
                            DatabaseService.getInstallationsForInstaller(currentUser.id).then(setInstallations);
                        }
                    }}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                    readOnly={true} // Installers can only update status/notes/photos, not client data
                />
            )}
        </div>
    );
};
