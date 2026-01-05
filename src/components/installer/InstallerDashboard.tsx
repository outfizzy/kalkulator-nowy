import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { DatabaseService } from '../../services/database';
import type { Installation } from '../../types';
import { InstallationTimeTracking } from './InstallationTimeTracking';

export const InstallerDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [todayInstallation, setTodayInstallation] = useState<Installation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const loadTodayInstallation = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }
            try {
                console.log('Loading installations for installer dashboard...');
                // Get all installations - since installation_assignments table may not exist yet
                const installations = await DatabaseService.getInstallations();
                console.log('Loaded installations:', installations.length);

                const today = new Date().toISOString().split('T')[0];

                const todayInst = installations.find(inst =>
                    inst.scheduledDate?.split('T')[0] === today
                );

                console.log('Today\'s installation:', todayInst);
                setTodayInstallation(todayInst || null);
                setError(null);
            } catch (error) {
                console.error('Error loading today\'s installation:', error);
                setError(error instanceof Error ? error.message : t('common.error'));
                // Set null to show "no installation" message instead of crashing
                setTodayInstallation(null);
            } finally {
                setLoading(false);
            }
        };
        loadTodayInstallation();
    }, [currentUser, t]);

    const openGoogleMaps = () => {
        if (!todayInstallation) return;
        const address = encodeURIComponent(
            `${todayInstallation.client.address}, ${todayInstallation.client.city}`
        );
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    };

    const openAppleMaps = () => {
        if (!todayInstallation) return;
        const address = encodeURIComponent(
            `${todayInstallation.client.address}, ${todayInstallation.client.city}`
        );
        window.open(`http://maps.apple.com/?q=${address}`, '_blank');
    };

    const tiles = [
        {
            title: t('tiles.requests.title'),
            description: t('tiles.requests.desc'),
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            path: '/installer/requests',
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: t('tiles.fuel.title'),
            description: t('tiles.fuel.desc'),
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            path: '/installer/fuel',
            color: 'from-emerald-500 to-emerald-600'
        },
        {
            title: t('tiles.failure.title'),
            description: t('tiles.failure.desc'),
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            path: '/installer/failure-report',
            color: 'from-red-500 to-red-600'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-xl font-bold text-slate-800">{t('common.error')}</h2>
                    </div>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                    >
                        Odśwież stronę
                    </button>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
                <div className="text-slate-500">Zaloguj się, aby rozpocząć</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {t('dashboard.welcome')}, {currentUser?.firstName}!
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Today's Installation Card */}
                {todayInstallation ? (
                    <>
                        <InstallationTimeTracking installationId={todayInstallation.id} />

                        <div className="bg-gradient-to-br from-accent to-accent-dark rounded-2xl shadow-lg p-6 text-white">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <h2 className="text-xl font-bold">{t('dashboard.todayInstallation')}</h2>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold">{todayInstallation.client.firstName} {todayInstallation.client.lastName}</p>
                                        <p className="text-sm opacity-90">{todayInstallation.client.phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium">{todayInstallation.client.address}</p>
                                        <p className="text-sm opacity-90">{todayInstallation.client.city}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-sm">{todayInstallation.productSummary}</p>
                                </div>
                            </div>

                            {/* Action Buttons Grid */}
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={openGoogleMaps}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    <span className="text-[10px] font-medium">Google</span>
                                </button>
                                <button
                                    onClick={openAppleMaps}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    <span className="text-[10px] font-medium">Apple</span>
                                </button>
                                <a
                                    href={`tel:${todayInstallation.client.phone}`}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-[10px] font-medium">Zadzwoń</span>
                                </a>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className={`bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 flex flex-col items-center justify-center gap-1 transition-all ${showDetails ? 'bg-white/40 ring-2 ring-white/50' : ''}`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[10px] font-medium">Info</span>
                                </button>
                            </div>

                            {/* Expanded Details */}
                            {showDetails && (
                                <div className="mt-4 pt-4 border-t border-white/20 text-sm space-y-2 animate-fadeIn">
                                    <p><span className="opacity-75">Produkt:</span> <strong>{todayInstallation.productSummary}</strong></p>
                                    {todayInstallation.notes && <p><span className="opacity-75">Notatki:</span> {todayInstallation.notes}</p>}
                                    {/* Add more details here if available, e.g. dimensions */}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-slate-500">{t('dashboard.noInstallation')}</p>
                    </div>
                )}

                {/* Installation Acceptance Tile */}
                {todayInstallation && (
                    <Link
                        to={`/installer/acceptance/${todayInstallation.id}`}
                        className="block bg-white rounded-2xl shadow-sm border-2 border-purple-200 hover:border-purple-400 p-6 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-100 p-3 rounded-xl">
                                    <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{t('dashboard.acceptance')}</h3>
                                    <p className="text-sm text-slate-500">{t('dashboard.acceptanceDesc')}</p>
                                </div>
                            </div>
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                )}

                {/* Action Tiles */}
                <div className="grid grid-cols-1 gap-4 mt-6">
                    {tiles.map((tile, index) => (
                        <Link
                            key={index}
                            to={tile.path}
                            className="group"
                        >
                            <div className={`bg-gradient-to-br ${tile.color} rounded-2xl shadow-lg p-6 text-white transform transition-transform group-hover:scale-[1.02]`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                            {tile.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{tile.title}</h3>
                                            <p className="text-sm opacity-90">{tile.description}</p>
                                        </div>
                                    </div>
                                    <svg className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Calendar Link */}
                <Link
                    to="/installer/calendar"
                    className="block bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 p-4 transition-all"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium text-slate-700">{t('dashboard.viewFullCalendar')}</span>
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </Link>
            </div>
        </div>
    );
};
