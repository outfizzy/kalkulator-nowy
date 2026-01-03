import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { geocodeAddress } from '../../utils/geocoding';
import { getOfferPhotos, addOfferPhoto, removeOfferPhoto } from '../../utils/offerPhotos';
import { generateInstallationProtocolPDF, generateInstallationProtocolPDFAsBlob } from '../../utils/installationProtocolPDF';
import { PhotoGallery } from '../PhotoGallery';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { Installation, InstallationTeam, InstallationStatus, User } from '../../types';
import { SchedulerService, type ScheduleSuggestion } from '../../services/SchedulerService';

interface InstallationDetailsModalProps {
    installation: Installation;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onSave: (installation: Installation) => Promise<void>;
    readOnly?: boolean;
}

export const InstallationDetailsModal: React.FC<InstallationDetailsModalProps> = ({
    installation,
    isOpen,
    onClose,
    onUpdate,
    onSave,
    readOnly = false
}) => {
    const { currentUser } = useAuth();
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [formData, setFormData] = useState<Partial<Installation>>({});
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [assignedInstallerIds, setAssignedInstallerIds] = useState<string[]>([]);
    const [installers, setInstallers] = useState<User[]>([]);
    const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [allInstallations, setAllInstallations] = useState<Installation[]>([]);

    const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
    const [hasConflict, setHasConflict] = useState(false);

    const canManageAssignments = !readOnly && (currentUser?.role === 'admin' || currentUser?.role === 'manager');

    useEffect(() => {
        if (isOpen) {
            void (async () => {
                try {
                    const [dbTeams, assignedIds, allInstallers, allInst] = await Promise.all([
                        DatabaseService.getTeams(),
                        DatabaseService.getAssignmentsForInstallation(installation.id),
                        DatabaseService.getInstallers(),
                        DatabaseService.getInstallations()
                    ]);

                    setTeams(dbTeams);
                    setAssignedInstallerIds(assignedIds);
                    setInstallers(allInstallers);
                    setAllInstallations(allInst);
                } catch (error) {
                    console.error('Error loading teams/assignments/installers:', error);
                }
            })();

            setFormData({
                ...installation,
                client: { ...installation.client }
            });
            setPhotos(installation.offerId ? getOfferPhotos(installation.offerId) : []);
        }
    }, [isOpen, installation]);

    // Check availability whenever team, date or duration changes
    useEffect(() => {
        const checkAvailability = () => {
            if (formData.teamId && formData.scheduledDate) {
                // Strict Conflict Check
                const isAvailable = SchedulerService.isTeamAvailable(
                    formData.teamId,
                    formData.scheduledDate,
                    formData.expectedDuration || 1,
                    // Filter out CURRENT installation if it's being edited
                    allInstallations.filter(i => i.id !== installation.id)
                );

                if (!isAvailable) {
                    setHasConflict(true);
                    setAvailabilityWarning('⚠️ KONFLIKT TERMINÓW: Zespół jest już zajęty w tym czasie!');
                } else {
                    setHasConflict(false);
                    // Optional: Check soft availability (e.g. busy but not full blocking?)
                    // For now, clear warning if no strict conflict.
                    setAvailabilityWarning(null);
                }
            } else {
                setAvailabilityWarning(null);
                setHasConflict(false);
            }
        };

        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }, [formData.teamId, formData.scheduledDate, formData.expectedDuration, allInstallations, installation.id]);



    if (!isOpen) return null;

    const handleChange = (field: keyof Installation, value: any) => {
        if (readOnly && field !== 'status' && field !== 'notes') return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleClientChange = (field: string, value: string) => {
        if (readOnly) return;
        setFormData(prev => ({
            ...prev,
            client: {
                ...prev.client!,
                [field]: value
            }
        }));
    };

    const handleSuggest = () => {
        setIsThinking(true);
        // Simulate thinking delay for effect
        setTimeout(() => {
            try {
                const results = SchedulerService.findOptimalSlots(
                    { ...installation, expectedDuration: formData.expectedDuration || 1 }, // Use current duration local state
                    allInstallations,
                    teams
                );
                setSuggestions(results);
                if (results.length === 0) {
                    toast('Nie znaleziono oczywistych sugestii w najbliższym miesiącu', { icon: '🤔' });
                }
            } catch (e) {
                console.error(e);
                toast.error('Błąd algorytmu');
            } finally {
                setIsThinking(false);
            }
        }, 800);
    };

    const applySuggestion = (s: ScheduleSuggestion) => {
        setFormData(prev => ({
            ...prev,
            scheduledDate: s.date,
            teamId: s.teamId
        }));
        setSuggestions([]); // Clear after selection
        toast.success(`Wybrano termin: ${s.date}`);
    };

    const handleSave = async () => {
        if (!formData.id) return;
        setSaving(true);

        try {
            // Check if address changed, if so, re-geocode
            if (
                !readOnly &&
                (formData.client?.address !== installation.client.address ||
                    formData.client?.city !== installation.client.city)
            ) {
                setIsGeocoding(true);
                const coords = await geocodeAddress(formData.client!.address, formData.client!.city);
                if (coords) {
                    setFormData(prev => ({
                        ...prev,
                        client: {
                            ...prev.client!,
                            coordinates: coords
                        }
                    }));
                    toast.success('Zaktualizowano współrzędne GPS');
                } else {
                    toast.error('Nie udało się znaleźć współrzędnych dla nowego adresu');
                }
                setIsGeocoding(false);
            }

            await onSave(formData as Installation);
            toast.success('Zapisano zmiany');
            onUpdate(); // Call onUpdate without arguments
            onClose();
        } catch (error) {
            console.error('Error saving installation:', error);
            toast.error('Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:rounded-xl shadow-xl overflow-y-auto animate-scale-in flex flex-col md:block">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">Szczegóły Montażu</h2>
                        {installation.offerId && (
                            <a
                                href={`/offers/edit/${installation.offerId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Otwórz Ofertę
                            </a>
                        )}
                        {formData.status === 'scheduled' && (
                            <button
                                onClick={() => {
                                    handleChange('status', 'confirmed');
                                    toast.success('Status zmieniony na Potwierdzony. Zapisz zmiany.');
                                }}
                                className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm animate-pulse-slow font-bold"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Potwierdź Termin
                            </button>
                        )}
                        {formData.status === 'confirmed' && (
                            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md border border-green-200 flex items-center gap-1 font-bold">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Termin Potwierdzony
                            </div>
                        )}
                        <button
                            onClick={async () => {
                                const toastId = toast.loading('Generowanie protokołu...');
                                try {
                                    const { generateInstallationProtocolPDF } = await import('../../utils/installationProtocolPDF');
                                    await generateInstallationProtocolPDF(formData as Installation);
                                    toast.success('Pobrano protokół', { id: toastId });
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Błąd generowania PDF', { id: toastId });
                                }
                            }}
                            className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1 border border-emerald-200"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Pobierz Protokół (PDF)
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status & Assignment */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value as InstallationStatus)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="pending">Oczekujący</option>
                                <option value="scheduled">Zaplanowany</option>
                                <option value="confirmed">Potwierdzony</option>
                                <option value="completed">Zakończony</option>
                                <option value="issue">Problem</option>
                                <option value="cancelled">Anulowany</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ekipa</label>
                            <select
                                value={formData.teamId || ''}
                                onChange={(e) => handleChange('teamId', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="">-- Nieprzypisana --</option>
                                {teams
                                    .filter(t => t.isActive !== false || t.id === formData.teamId)
                                    .map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} {t.isActive === false ? '(Nieaktywna)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input
                                type="date"
                                value={formData.scheduledDate || ''}
                                onChange={(e) => handleChange('scheduledDate', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>
                    {availabilityWarning && (
                        <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${hasConflict ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {availabilityWarning}
                        </div>
                    )}

                    {/* Planning Stats (New) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                        <div className="flex items-center gap-2 relative">
                            <input
                                type="checkbox"
                                id="partsReady"
                                checked={formData.partsReady || false}
                                onChange={(e) => handleChange('partsReady', e.target.checked)}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <label htmlFor="partsReady" className="font-medium text-slate-800 cursor-pointer">
                                Materiały skompletowane (Gotowe do montażu)
                            </label>

                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Przewidywany czas (dni)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="14"
                                    value={formData.expectedDuration || 1}
                                    onChange={(e) => handleChange('expectedDuration', parseInt(e.target.value) || 1)}
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || readOnly || hasConflict}
                            className={`px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2 ${saving || readOnly || hasConflict ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Zapisywanie...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Zapisz Zmiany
                                </>
                            )}
                        </button>
                    </div>

                    {/* AI Scheduling & Auto-Reschedule */}
                    <div className="flex flex-col md:flex-row gap-3 mt-6">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={formData.scheduledDate || ''}
                                    onChange={(e) => handleChange('scheduledDate', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                />
                                <button
                                    onClick={handleSuggest}
                                    disabled={isThinking || readOnly}
                                    className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1 transition-all"
                                >
                                    {isThinking ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="animate-pulse">Analizuję...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Sugestie AI
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Suggestions Display */}
                            {suggestions.length > 0 && (
                                <div className="mt-3 space-y-2 animate-scale-in">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        ✨ Rekomendowane Terminy
                                    </h4>
                                    {suggestions.map((sug, idx) => {
                                        const teamName = teams.find(t => t.id === sug.teamId)?.name || 'Nieznany Zespół';
                                        return (
                                            <button
                                                key={`${sug.date}-${sug.teamId}-${idx}`}
                                                onClick={() => applySuggestion(sug)}
                                                className="w-full text-left p-3 rounded-lg border border-violet-100 bg-violet-50/50 hover:bg-violet-50 hover:border-violet-300 transition-all group relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                            {new Date(sug.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                            <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-violet-200 text-violet-700">
                                                                {teamName}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {sug.reason}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-sm font-bold ${sug.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {Math.round(sug.score)}%
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">zgodności</span>
                                                    </div>
                                                </div>
                                                {/* Hover effect bar */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div >
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Przypisani monterzy</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {assignedInstallerIds.length === 0 && (
                                    <span className="text-xs text-slate-400">Brak przypisanych monterów</span>
                                )}
                                {assignedInstallerIds.map(id => {
                                    const installer = installers.find(i => i.id === id);
                                    if (!installer) return null;
                                    return (
                                        <span
                                            key={id}
                                            className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700"
                                        >
                                            {installer.firstName} {installer.lastName}
                                            {canManageAssignments && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await DatabaseService.unassignInstaller(installation.id, id);
                                                            setAssignedInstallerIds(prev => prev.filter(x => x !== id));
                                                            toast.success('Usunięto montera z montażu');
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast.error('Błąd usuwania montera');
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                            {canManageAssignments && installers.length > 0 && (
                                <select
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                    defaultValue=""
                                    onChange={async (e) => {
                                        const installerId = e.target.value;
                                        if (!installerId) return;
                                        if (assignedInstallerIds.includes(installerId)) {
                                            toast('Ten monter jest już przypisany');
                                            e.target.value = '';
                                            return;
                                        }
                                        try {
                                            await DatabaseService.assignInstaller(installation.id, installerId);
                                            setAssignedInstallerIds(prev => [...prev, installerId]);
                                            toast.success('Przypisano montera');
                                        } catch (error) {
                                            console.error(error);
                                            toast.error('Błąd przypisywania montera');
                                        } finally {
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">+ Dodaj montera</option>
                                    {installers.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.firstName} {inst.lastName}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Client Details */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-bold text-slate-700 mb-3">Dane Klienta i Lokalizacja</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Imię i Nazwisko</label>
                                    <div className="font-medium">{formData.client?.firstName} {formData.client?.lastName}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Telefon</label>
                                    <div className="font-medium">{formData.client?.phone}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Ulica i Numer</label>
                                    <input
                                        type="text"
                                        value={formData.client?.address || ''}
                                        onChange={(e) => handleClientChange('address', e.target.value)}
                                        className="w-full p-1 border border-slate-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Miasto</label>
                                    <input
                                        type="text"
                                        value={formData.client?.city || ''}
                                        onChange={(e) => handleClientChange('city', e.target.value)}
                                        className="w-full p-1 border border-slate-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                                <span>GPS: {formData.client?.coordinates ? `${formData.client.coordinates.lat.toFixed(4)}, ${formData.client.coordinates.lng.toFixed(4)}` : 'Brak'}</span>
                                {isGeocoding && <span className="text-blue-500">Aktualizowanie...</span>}
                            </div>
                        </div>



                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notatki dla Ekipy</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Np. kod do bramy, uwaga na psa, specyficzne warunki montażu..."
                                className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-2 focus:ring-accent outline-none resize-none"
                            />
                        </div>

                        {/* Photos Section */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Zdjęcia Montażu</label>

                            {/* Upload Button */}
                            <div className="mb-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const imageData = event.target?.result as string;
                                                if (installation.offerId) {
                                                    addOfferPhoto(installation.offerId, imageData);
                                                    setPhotos(getOfferPhotos(installation.offerId));
                                                } else {
                                                    toast.error('Brak ID oferty - nie można dodać zdjęć (wymagana implementacja dla ręcznych montaży)');
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                        e.target.value = ''; // Reset input
                                    }}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label
                                    htmlFor="photo-upload"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg cursor-pointer transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Dodaj Zdjęcia
                                </label>
                                <span className="ml-3 text-sm text-slate-500">
                                    {photos.length} {photos.length === 1 ? 'zdjęcie' : 'zdjęć'}
                                </span>
                            </div>

                            {/* Photo Gallery */}
                            <PhotoGallery
                                photos={photos}
                                onDelete={(index) => {
                                    if (installation.offerId) {
                                        removeOfferPhoto(installation.offerId, index);
                                        setPhotos(getOfferPhotos(installation.offerId));
                                        toast.success('Usunięto zdjęcie');
                                    }
                                }}
                            />
                        </div>

                        {/* Client Acceptance Section */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Odbiór przez Klienta
                            </h3>

                            {formData.acceptance ? (
                                <div className="bg-green-50 text-green-800 p-3 rounded border border-green-200 text-sm">
                                    <p className="font-bold">✅ Montaż odebrany</p>
                                    <p>Przez: {formData.acceptance.clientName}</p>
                                    <p>Data: {new Date(formData.acceptance.acceptedAt).toLocaleString()}</p>
                                    {formData.acceptance.notes && <p className="italic mt-1">"{formData.acceptance.notes}"</p>}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600">
                                        Potwierdź odbiór prac przez klienta. Status montażu zostanie zmieniony na "Zakończony".
                                    </p>
                                    {!readOnly || (readOnly && formData.status !== 'completed') ? (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('Czy na pewno chcesz ręcznie potwierdzić montaż? Spowoduje to wysłanie emaila do klienta i zamknięcie zlecenia.')) return;

                                                // Check if there are photos for protocol
                                                const offerPhotos = installation.offerId ? getOfferPhotos(installation.offerId) : [];
                                                if (!offerPhotos || offerPhotos.length === 0) {
                                                    if (!window.confirm('Brak zdjęć montażu. Czy chcesz kontynuować bez protokołu?')) {
                                                        return;
                                                    }
                                                }

                                                const acceptanceData = {
                                                    acceptedAt: new Date().toISOString(),
                                                    clientName: `${formData.client?.firstName} ${formData.client?.lastName}`, // Client is still the "accepting party" technically
                                                    notes: `Zakończono manualnie przez biuro: ${currentUser?.email || 'Admin'}`
                                                };

                                                setFormData(prev => ({
                                                    ...prev,
                                                    status: 'completed',
                                                    acceptance: acceptanceData
                                                }));

                                                // Save immediately
                                                try {
                                                    setSaving(true);
                                                    // Use updateInstallationAcceptance to trigger emails and tasks
                                                    await DatabaseService.updateInstallationAcceptance(installation.id, acceptanceData);

                                                    // Try to find and save protocol to CRM
                                                    if (offerPhotos && offerPhotos.length > 0) {
                                                        try {
                                                            toast.loading('Generowanie protokołu...', { id: 'protocol' });

                                                            // Generate protocol PDF
                                                            const protocolBlob = await generateInstallationProtocolPDFAsBlob(formData as Installation);

                                                            // Find contract by offer ID
                                                            const contract = installation.offerId ? await DatabaseService.findContractByOfferId(installation.offerId) : null;

                                                            if (contract) {
                                                                // Save protocol to contract attachments
                                                                await DatabaseService.addProtocolToContract(contract.id, protocolBlob, installation.id);
                                                                toast.success('Protokół zapisany w CRM!', { id: 'protocol' });
                                                            } else {
                                                                toast('Montaż ukończony. Brak powiązanego kontraktu - protokół nie został zapisany w CRM.', {
                                                                    id: 'protocol',
                                                                    icon: '⚠️',
                                                                    duration: 5000
                                                                });
                                                            }
                                                        } catch (protocolError) {
                                                            console.error('Error saving protocol to CRM:', protocolError);
                                                            toast.error('Błąd zapisu protokołu w CRM (montaż ukończony)', { id: 'protocol' });
                                                        }
                                                    }

                                                    await onUpdate();
                                                    onClose();
                                                    toast.success('Zakończono montaż i wysłano powiadomienie!');
                                                } catch (e) {
                                                    console.error(e);
                                                    toast.error('Błąd zapisu odbioru');
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }}
                                            disabled={saving}
                                            className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {saving ? 'Zapisywanie...' : 'Wymuś Zakończenie (Biuro)'}
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div >

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white md:rounded-b-xl sticky bottom-0 z-10">
                        {/* Download Protocol PDF Button */}
                        <button
                            onClick={() => {
                                const offerPhotos = installation.offerId ? getOfferPhotos(installation.offerId) : [];
                                if (offerPhotos && offerPhotos.length > 0) {
                                    generateInstallationProtocolPDF(formData as Installation);
                                    toast.success('Generowanie protokołu PDF...');
                                } else {
                                    toast.error('Brak zdjęć montażu do wygenerowania protokołu.');
                                }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Pobierz Protokół PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
