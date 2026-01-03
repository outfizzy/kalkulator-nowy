import React, { useEffect, useState, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
    installationId: string;
}

export const InstallationTimeTracking: React.FC<Props> = ({ installationId }) => {
    const { currentUser } = useAuth();
    const [isWorking, setIsWorking] = useState(false);
    const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
    const [loading, setLoading] = useState(true);

    const loadStatus = useCallback(async () => {
        try {
            const logs = await DatabaseService.getWorkLogs(installationId);
            const activeLog = logs.find(l => !l.endTime);

            if (activeLog) {
                setIsWorking(true);
                setCurrentSessionStart(new Date(activeLog.startTime));
            } else {
                setIsWorking(false);
                setCurrentSessionStart(null);
            }
        } catch (error) {
            console.error('Failed to load work logs:', error);
        } finally {
            setLoading(false);
        }
    }, [installationId]);

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 60000);
        return () => clearInterval(interval);
    }, [loadStatus]);

    useEffect(() => {
        if (!isWorking || !currentSessionStart) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - currentSessionStart.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsedTime(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [isWorking, currentSessionStart]);

    const handleStartWork = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Assuming current user plus team members? 
            // For now, let's just log the current user or assume previous assignment logic
            // The service takes userIds array. We can pass just current user, or fetch team.
            // Simplified: Just log current user. The backend/Service creates the log.
            // Ideally we want to log ALL present members. 
            // Let's rely on the service to maybe pull team members? 
            // No, the service inserts what we pass. 
            // For MVP: Log the current user. Later add "Select Team Members".
            await DatabaseService.startWorkDay(installationId, [currentUser.id]);
            await loadStatus();
        } catch (error) {
            console.error('Failed to start work:', error);
            alert('Błąd podczas rozpoczynania pracy');
        } finally {
            setLoading(false);
        }
    };

    const handleEndWork = async () => {
        if (!confirm('Czy na pewno chcesz zakończyć dzień pracy?')) return;
        setLoading(true);
        try {
            await DatabaseService.endWorkDay(installationId);
            await loadStatus();
        } catch (error) {
            console.error('Failed to end work:', error);
            alert('Błąd podczas kończenia pracy');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-4">Ładowanie...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Czas Pracy</h3>

            {isWorking ? (
                <div className="text-center">
                    <div className="text-3xl font-mono font-bold text-accent mb-2">
                        {elapsedTime}
                    </div>
                    <p className="text-slate-500 mb-6">Czas trwania obecnej sesji</p>

                    <button
                        onClick={handleEndWork}
                        className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        KOŃCZĘ DZIEŃ
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Kliknij, gdy dojedziesz do bazy/hotelu</p>
                </div>
            ) : (
                <button
                    onClick={handleStartWork}
                    className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    START PRACY
                </button>
            )}
        </div>
    );
};
