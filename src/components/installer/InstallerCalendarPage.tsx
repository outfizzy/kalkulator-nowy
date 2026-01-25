import React, { useEffect, useState } from 'react';
import { InstallationCalendar } from '../installations/InstallationCalendar';
import { DatabaseService } from '../../services/database';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import type { Installation, InstallationTeam } from '../../types';
import { toast } from 'react-hot-toast';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';

export const InstallerCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [myTeamIds, setMyTeamIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch teams first to find user's team
            const dbTeams = await InstallationTeamService.getTeams();

            // Find teams where current user is a member
            const userTeams = currentUser
                ? dbTeams.filter(team => team.members.some(m => m.id === currentUser.id))
                : [];
            const teamIds = userTeams.map(t => t.id);
            setMyTeamIds(teamIds);

            // Fetch all installations
            const dbInstallations = await DatabaseService.getInstallations();

            // Filter installations by user's teams (if they have any)
            const filteredInstallations = teamIds.length > 0
                ? dbInstallations.filter(inst => inst.teamId && teamIds.includes(inst.teamId))
                : dbInstallations; // Show all if user has no team (backward compatibility)

            setInstallations(filteredInstallations);
            setTeams(userTeams.length > 0 ? userTeams : dbTeams); // Show only user's teams or all
        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast.error(t('calendar.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [currentUser, t]);

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
                    onEdit={(inst) => setSelectedInstallation(inst)}
                // onDragDrop is undefined, so drag-and-drop is disabled
                />
            </div>

            {selectedInstallation && (
                <InstallationDetailsModal
                    installation={selectedInstallation}
                    isOpen={true}
                    onClose={() => setSelectedInstallation(null)}
                    onUpdate={() => {
                        void loadData();
                        setSelectedInstallation(null);
                    }}
                    onSave={async (updated) => {
                        // In read-only mode this shouldn't be called for major updates, 
                        // but if we allow status updates later, this connects it.
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                    readOnly={true}
                />
            )}
        </div>
    );
};
