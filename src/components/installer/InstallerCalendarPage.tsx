import React, { useEffect, useState } from 'react';
import { InstallationCalendar } from '../installations/InstallationCalendar';
import { DatabaseService } from '../../services/database';
import { useTranslation } from '../../contexts/TranslationContext';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';

export const InstallerCalendarPage: React.FC = () => {
    const { t } = useTranslation();
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch ALL installations and teams, enabled by the new RLS policy
                const [dbInstallations, dbTeams] = await Promise.all([
                    DatabaseService.getInstallations(),
                    DatabaseService.getTeams()
                ]);
                setInstallations(dbInstallations);
                setTeams(dbTeams);
            } catch (error) {
                console.error('Error loading calendar data:', error);
                toast.error(t('calendar.error'));
            } finally {
                setLoading(false);
            }
        };
        void loadData();
    }, [t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('calendar.title')}</h1>
                    <p className="text-slate-500 text-sm">
                        {t('calendar.subtitle')}
                    </p>
                </div>
            </div>
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <InstallationCalendar
                    installations={installations}
                    teams={teams}
                    onEdit={() => { }} // Read-only: no edit action
                // onDragDrop is undefined, so drag-and-drop is disabled
                />
            </div>
        </div>
    );
};
