import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { geocodeAddress } from '../../utils/geocoding';
import { getOfferPhotos, addOfferPhoto, removeOfferPhoto } from '../../utils/offerPhotos';
import { generateInstallationProtocolPDF, generateInstallationProtocolPDFAsBlob } from '../../utils/installationProtocolPDF';
import { PhotoGallery } from '../PhotoGallery';
import { DatabaseService } from '../../services/database';
import { InstallerSessionService, type WorkSession } from '../../services/database/installer-session.service';
import { InstallationService } from '../../services/database/installation.service';
import { supabase } from '../../lib/supabase';
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

type TabId = 'overview' | 'contract' | 'docs';

export const InstallationDetailsModal: React.FC<InstallationDetailsModalProps> = ({
    installation,
    isOpen,
    onClose,
    onUpdate,
    onSave,
    readOnly = false
}) => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('overview');
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
    const [contractDetails, setContractDetails] = useState<any>(null);
    const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
    const [editCosts, setEditCosts] = useState({ hotelCost: 0, consumablesCost: 0, additionalCosts: 0 });
    const [savingCosts, setSavingCosts] = useState(false);
    const canManageAssignments = !readOnly && (currentUser?.role === 'admin' || currentUser?.role === 'manager');

    // ---- Data Loading ----
    useEffect(() => {
        if (isOpen && installation.offerId) {
            void (async () => {
                const { data: contract } = await supabase.from('contracts').select('*, contract_data').eq('offer_id', installation.offerId).single();
                const { data: offer } = await supabase.from('offers').select('*, orders(*)').eq('id', installation.offerId).single();
                if (contract) setContractDetails({ ...contract, offerOrders: offer?.orders || [] });
            })();
        }
    }, [isOpen, installation.offerId]);

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
                    // Load work sessions for this installation's team
                    if (installation.teamId) {
                        try {
                            const allSessions = await InstallerSessionService.getAllSessions();
                            const installSessions = allSessions.filter(s =>
                                s.teamId === installation.teamId && s.installationId === installation.id
                            );
                            // If no sessions linked by installationId, try sessions on same date & team
                            if (installSessions.length === 0 && installation.scheduledDate) {
                                const dateSessions = allSessions.filter(s =>
                                    s.teamId === installation.teamId && s.sessionDate === installation.scheduledDate
                                );
                                setWorkSessions(dateSessions);
                            } else {
                                setWorkSessions(installSessions);
                            }
                        } catch (e) { console.error('Error loading sessions:', e); }
                    }
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            })();
            setFormData({ ...installation, client: { ...installation.client } });
            setEditCosts({
                hotelCost: installation.hotelCost || 0,
                consumablesCost: installation.consumablesCost || 0,
                additionalCosts: installation.additionalCosts || 0,
            });
            setPhotos(installation.offerId ? getOfferPhotos(installation.offerId) : []);
            setActiveTab('overview');
        }
    }, [isOpen, installation]);

    // Availability check
    useEffect(() => {
        const check = () => {
            if (formData.teamId && formData.scheduledDate) {
                const isAvailable = SchedulerService.isTeamAvailable(
                    formData.teamId, formData.scheduledDate, formData.expectedDuration || 1,
                    allInstallations.filter(i => i.id !== installation.id)
                );
                setHasConflict(!isAvailable);
                setAvailabilityWarning(!isAvailable ? '⚠️ KONFLIKT TERMINÓW: Zespół jest już zajęty!' : null);
            } else {
                setAvailabilityWarning(null);
                setHasConflict(false);
            }
        };
        const t = setTimeout(check, 500);
        return () => clearTimeout(t);
    }, [formData.teamId, formData.scheduledDate, formData.expectedDuration, allInstallations, installation.id]);

    if (!isOpen) return null;

    // ---- Handlers ----
    const handleChange = (field: keyof Installation, value: any) => {
        if (readOnly && field !== 'status' && field !== 'notes') return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleClientChange = (field: string, value: string) => {
        if (readOnly) return;
        setFormData(prev => ({ ...prev, client: { ...prev.client!, [field]: value } }));
    };

    const handleSuggest = () => {
        setIsThinking(true);
        setTimeout(() => {
            try {
                const results = SchedulerService.findOptimalSlots(
                    { ...installation, expectedDuration: formData.expectedDuration || 1 },
                    allInstallations, teams
                );
                setSuggestions(results);
                if (results.length === 0) toast('Brak sugestii w najbliższym miesiącu', { icon: '🤔' });
            } catch { toast.error('Błąd algorytmu'); }
            finally { setIsThinking(false); }
        }, 800);
    };

    const applySuggestion = (s: ScheduleSuggestion) => {
        setFormData(prev => ({ ...prev, scheduledDate: s.date, teamId: s.teamId }));
        setSuggestions([]);
        toast.success(`Wybrano: ${s.date}`);
    };

    const handleSave = async () => {
        if (!formData.id) return;
        setSaving(true);
        try {
            if (!readOnly && (formData.client?.address !== installation.client.address || formData.client?.city !== installation.client.city)) {
                setIsGeocoding(true);
                const coords = await geocodeAddress(formData.client!.address, formData.client!.city);
                if (coords) setFormData(prev => ({ ...prev, client: { ...prev.client!, coordinates: coords } }));
                setIsGeocoding(false);
            }
            await onSave(formData as Installation);
            toast.success('Zapisano zmiany');
            onUpdate();
            onClose();
        } catch { toast.error('Błąd zapisu'); }
        finally { setSaving(false); }
    };

    const handleRestoreToBacklog = async () => {
        if (readOnly || !window.confirm('Usunąć z kalendarza? Instalacja wróci do listy.')) return;
        setSaving(true);
        try { await DatabaseService.deleteInstallation(installation.id); toast.success('Przywrócono do listy'); onClose(); onUpdate(); }
        catch { toast.error('Błąd usuwania'); setSaving(false); }
    };

    const handleForceComplete = async () => {
        if (!window.confirm('Zakończyć montaż manualnie?')) return;
        const offerPhotos = installation.offerId ? getOfferPhotos(installation.offerId) : [];
        if (!offerPhotos.length && !window.confirm('Brak zdjęć. Kontynuować?')) return;

        const acceptanceData = {
            acceptedAt: new Date().toISOString(),
            clientName: `${formData.client?.firstName} ${formData.client?.lastName}`,
            notes: `Zakończono manualnie: ${currentUser?.email || 'Admin'}`
        };
        setFormData(prev => ({ ...prev, status: 'completed', acceptance: acceptanceData }));
        setSaving(true);
        try {
            await DatabaseService.updateInstallationAcceptance(installation.id, acceptanceData);
            if (offerPhotos.length > 0) {
                try {
                    toast.loading('Generowanie protokołu...', { id: 'protocol' });
                    const protocolBlob = await generateInstallationProtocolPDFAsBlob(formData as Installation);
                    const contract = installation.offerId ? await DatabaseService.findContractByOfferId(installation.offerId) : null;
                    if (contract) { await DatabaseService.addProtocolToContract(contract.id, protocolBlob, installation.id); toast.success('Protokół zapisany!', { id: 'protocol' }); }
                    else toast('Brak kontraktu — protokół nie zapisany', { id: 'protocol', icon: '⚠️' });
                } catch { toast.error('Błąd zapisu protokołu', { id: 'protocol' }); }
            }
            await onUpdate();
            onClose();
            toast.success('Montaż zakończony!');
        } catch { toast.error('Błąd zapisu odbioru'); }
        finally { setSaving(false); }
    };

    // ---- Derived Data ----
    const product = contractDetails?.contract_data?.product;
    const contractClient = contractDetails?.contract_data?.client || contractDetails?.contract_data?.customer;
    const contractNumber = contractDetails?.contract_number || contractDetails?.contract_data?.contractNumber;
    const teamName = teams.find(t => t.id === formData.teamId)?.name;

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        pending: { label: 'Oczekujący', color: 'text-slate-700', bg: 'bg-slate-100' },
        scheduled: { label: 'Zaplanowany', color: 'text-blue-700', bg: 'bg-blue-100' },
        confirmed: { label: 'Potwierdzony', color: 'text-green-700', bg: 'bg-green-100' },
        completed: { label: 'Zakończony', color: 'text-slate-500', bg: 'bg-slate-200' },
        issue: { label: 'Problem', color: 'text-red-700', bg: 'bg-red-100' },
        cancelled: { label: 'Anulowany', color: 'text-red-500', bg: 'bg-red-50' },
    };
    const currentStatus = statusConfig[formData.status || 'pending'] || statusConfig.pending;

    const TABS: { id: TabId; label: string; icon: string }[] = [
        { id: 'overview', label: 'Przegląd', icon: '📋' },
        { id: 'contract', label: 'Umowa', icon: '📄' },
        { id: 'docs', label: 'Dokumentacja', icon: '📸' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">

                {/* ============ HEADER ============ */}
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-4 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                {contractNumber && (
                                    <span className="bg-white/20 backdrop-blur text-white text-xs font-mono px-2 py-0.5 rounded">
                                        {contractNumber}
                                    </span>
                                )}
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentStatus.bg} ${currentStatus.color}`}>
                                    {currentStatus.label}
                                </span>
                                {installation.title && (
                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                        {installation.title}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg font-bold truncate">
                                {formData.client?.firstName} {formData.client?.lastName}
                                {formData.client?.city && <span className="font-normal text-slate-300 text-base"> — {formData.client.city}</span>}
                            </h2>
                            {installation.productSummary && (
                                <p className="text-sm text-slate-300 mt-0.5 truncate">{installation.productSummary}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {installation.offerId && (
                                <a href={`/offers/edit/${installation.offerId}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    Oferta
                                </a>
                            )}
                            <button onClick={onClose} className="text-white/60 hover:text-white p-1 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-3 -mb-4 px-0">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${activeTab === tab.id
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                                    }`}
                            >
                                <span className="mr-1.5">{tab.icon}</span>{tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ============ CONTENT ============ */}
                <div className="flex-1 overflow-y-auto">

                    {/* ---- TAB: OVERVIEW ---- */}
                    {activeTab === 'overview' && (
                        <div className="p-5 space-y-5">

                            {/* Conflict Warning */}
                            {availabilityWarning && (
                                <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${hasConflict ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700'}`}>
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    {availabilityWarning}
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                {/* LEFT: Client + Product */}
                                <div className="space-y-4">

                                    {/* Client Card */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                            <span className="text-base">👤</span>
                                            <h3 className="font-bold text-slate-700 text-sm">Dane Klienta</h3>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Imię i Nazwisko</label>
                                                    <p className="font-semibold text-slate-800">{formData.client?.firstName} {formData.client?.lastName}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Telefon</label>
                                                    {formData.client?.phone ? (
                                                        <a href={`tel:${formData.client.phone}`} className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                                            📞 {formData.client.phone}
                                                        </a>
                                                    ) : <p className="text-slate-400">—</p>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Email</label>
                                                {formData.client?.email ? (
                                                    <a href={`mailto:${formData.client.email}`} className="text-sm text-blue-600 hover:text-blue-800 block truncate">
                                                        ✉️ {formData.client.email}
                                                    </a>
                                                ) : <p className="text-sm text-slate-400">Brak emaila</p>}
                                            </div>
                                            <div className="border-t border-slate-200 pt-3">
                                                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Adres</label>
                                                <div className="grid grid-cols-3 gap-2 mt-1">
                                                    <div className="col-span-2">
                                                        <input type="text" value={formData.client?.address || ''} onChange={e => handleClientChange('address', e.target.value)}
                                                            className="w-full p-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" placeholder="Ulica i numer" />
                                                    </div>
                                                    <div>
                                                        <input type="text" value={formData.client?.postalCode || ''} onChange={e => handleClientChange('postalCode', e.target.value)}
                                                            className="w-full p-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" placeholder="Kod" />
                                                    </div>
                                                </div>
                                                <input type="text" value={formData.client?.city || ''} onChange={e => handleClientChange('city', e.target.value)}
                                                    className="w-full p-1.5 border border-slate-200 rounded text-sm mt-1.5 focus:ring-1 focus:ring-blue-400 outline-none" placeholder="Miasto" />
                                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                    📍 GPS: {formData.client?.coordinates ? `${formData.client.coordinates.lat.toFixed(4)}, ${formData.client.coordinates.lng.toFixed(4)}` : 'Brak'}
                                                    {isGeocoding && <span className="text-blue-500 animate-pulse">Aktualizuję...</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Card */}
                                    {product && (
                                        <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-indigo-100/70 border-b border-indigo-200 flex items-center gap-2">
                                                <span className="text-base">📦</span>
                                                <h3 className="font-bold text-indigo-800 text-sm">Produkt do Montażu</h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {product.modelId && (
                                                        <div>
                                                            <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Model</label>
                                                            <p className="font-bold text-indigo-900 text-base">{product.modelId}</p>
                                                        </div>
                                                    )}
                                                    {(product.width || product.projection) && (
                                                        <div>
                                                            <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Wymiary</label>
                                                            <p className="font-bold text-indigo-900 text-base font-mono">
                                                                {product.width && `${product.width}`}{product.projection && ` × ${product.projection}`} mm
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                {(product.color || product.colorName) && (
                                                    <div>
                                                        <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Kolor</label>
                                                        <p className="text-sm text-indigo-800">{product.colorName || product.color}{product.colorCode ? ` (${product.colorCode})` : ''}</p>
                                                    </div>
                                                )}
                                                {product.selectedAddons && product.selectedAddons.length > 0 && (
                                                    <div>
                                                        <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Dodatki</label>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {product.selectedAddons.map((addon: any, i: number) => (
                                                                <span key={i} className="bg-white text-indigo-700 text-[11px] px-2 py-0.5 rounded border border-indigo-200">
                                                                    {addon.name || addon.label || addon.id}
                                                                    {addon.quantity && addon.quantity > 1 && ` ×${addon.quantity}`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {product.wallEnclosures && product.wallEnclosures.length > 0 && (
                                                    <div>
                                                        <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Ściany</label>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {product.wallEnclosures.map((wall: any, i: number) => (
                                                                <span key={i} className="bg-white text-indigo-700 text-[11px] px-2 py-0.5 rounded border border-indigo-200">
                                                                    {wall.name || wall.side || wall.type || `Ściana ${i + 1}`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {product.customItems && product.customItems.length > 0 && (
                                                    <div>
                                                        <label className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold">Pozycje (umowa manualna)</label>
                                                        <ul className="mt-1 space-y-1">
                                                            {product.customItems.map((item: any, i: number) => (
                                                                <li key={i} className="text-sm text-indigo-800 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                                    {item.name}{item.quantity ? ` — ${item.quantity} szt.` : ''}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: Schedule + Installers */}
                                <div className="space-y-4">

                                    {/* Schedule Card */}
                                    <div className="bg-blue-50/50 rounded-xl border border-blue-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-blue-100/50 border-b border-blue-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">📅</span>
                                                <h3 className="font-bold text-blue-800 text-sm">Planowanie</h3>
                                            </div>
                                            {formData.status === 'scheduled' && (
                                                <button onClick={() => { handleChange('status', 'confirmed'); toast.success('Zmieniono na Potwierdzony'); }}
                                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 font-bold shadow-sm">
                                                    ✓ Potwierdź
                                                </button>
                                            )}
                                            {formData.status === 'confirmed' && (
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md border border-green-200 font-bold">✓ Potwierdzony</span>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                                    <select value={formData.status} onChange={e => handleChange('status', e.target.value as InstallationStatus)}
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 outline-none">
                                                        <option value="pending">Oczekujący</option>
                                                        <option value="scheduled">Zaplanowany</option>
                                                        <option value="confirmed">Potwierdzony</option>
                                                        <option value="completed">Zakończony</option>
                                                        <option value="issue">Problem</option>
                                                        <option value="cancelled">Anulowany</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Czas trwania (dni)</label>
                                                    <input type="number" min="1" max="14" value={formData.expectedDuration || 1}
                                                        onChange={e => handleChange('expectedDuration', parseInt(e.target.value) || 1)}
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 outline-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ekipa</label>
                                                <select value={formData.teamId || ''} onChange={e => handleChange('teamId', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 outline-none">
                                                    <option value="">— Nieprzypisana —</option>
                                                    {teams.filter(t => t.isActive !== false || t.id === formData.teamId).map(t => (
                                                        <option key={t.id} value={t.id}>{t.name} {t.isActive === false ? '(Nieaktywna)' : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data montażu</label>
                                                    <input type="date" value={formData.scheduledDate || ''} onChange={e => handleChange('scheduledDate', e.target.value)}
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 outline-none" />
                                                </div>
                                                <button onClick={handleSuggest} disabled={isThinking || readOnly}
                                                    className="self-end px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1 text-sm transition-all">
                                                    {isThinking ? <span className="animate-pulse">⚡ Analizuję...</span> : <><span>⚡</span> AI</>}
                                                </button>
                                            </div>

                                            {/* AI Suggestions */}
                                            {suggestions.length > 0 && (
                                                <div className="space-y-1.5 animate-scale-in">
                                                    <h4 className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">✨ Rekomendacje</h4>
                                                    {suggestions.map((sug, idx) => (
                                                        <button key={idx} onClick={() => applySuggestion(sug)}
                                                            className="w-full text-left p-2 rounded-lg border border-violet-100 bg-white hover:bg-violet-50 hover:border-violet-300 transition-all text-sm">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold text-slate-800">
                                                                    {new Date(sug.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                    <span className="text-xs text-violet-600 ml-2">{teams.find(t => t.id === sug.teamId)?.name}</span>
                                                                </span>
                                                                <span className={`text-xs font-bold ${sug.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(sug.score)}%</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">{sug.reason}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Materials Checkbox */}
                                            <label className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input type="checkbox" checked={formData.partsReady || false} onChange={e => handleChange('partsReady', e.target.checked)}
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                                <span className="text-sm font-medium text-slate-700">Materiały skompletowane ✅</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Installers Card */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                            <span className="text-base">👷</span>
                                            <h3 className="font-bold text-slate-700 text-sm">Monterzy</h3>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {assignedInstallerIds.length === 0 && <span className="text-xs text-slate-400 italic">Brak przypisanych</span>}
                                                {assignedInstallerIds.map(id => {
                                                    const inst = installers.find(i => i.id === id);
                                                    if (!inst) return null;
                                                    return (
                                                        <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700 shadow-sm">
                                                            {inst.firstName} {inst.lastName}
                                                            {canManageAssignments && (
                                                                <button type="button" onClick={async () => {
                                                                    try { await DatabaseService.unassignInstaller(installation.id, id); setAssignedInstallerIds(prev => prev.filter(x => x !== id)); toast.success('Usunięto'); }
                                                                    catch { toast.error('Błąd'); }
                                                                }} className="text-slate-400 hover:text-red-500">✕</button>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            {canManageAssignments && installers.length > 0 && (
                                                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" defaultValue=""
                                                    onChange={async e => {
                                                        const iid = e.target.value; if (!iid) return;
                                                        if (assignedInstallerIds.includes(iid)) { toast('Już przypisany'); e.target.value = ''; return; }
                                                        try { await DatabaseService.assignInstaller(installation.id, iid); setAssignedInstallerIds(prev => [...prev, iid]); toast.success('Przypisano'); }
                                                        catch { toast.error('Błąd'); }
                                                        finally { e.target.value = ''; }
                                                    }}>
                                                    <option value="">+ Dodaj montera</option>
                                                    {installers.map(inst => <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* ---- INSTALLATION DAYS SELECTOR ---- */}
                                    {!readOnly && (
                                        <div className="flex items-center gap-3 bg-indigo-50/50 rounded-xl border border-indigo-200 px-4 py-3">
                                            <span className="text-base">📅</span>
                                            <label className="text-sm font-bold text-indigo-800">Dni montażu:</label>
                                            <select
                                                value={installation.expectedDuration || 1}
                                                onChange={async (e) => {
                                                    const days = parseInt(e.target.value);
                                                    try {
                                                        await InstallationService.updateInstallation(installation.id, { expectedDuration: days });
                                                        toast.success(`Ustawiono ${days} ${days === 1 ? 'dzień' : 'dni'} montażu`);
                                                        if (onSaved) onSaved();
                                                    } catch { toast.error('Błąd zapisu'); }
                                                }}
                                                className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                                            >
                                                {[1,2,3,4,5,6,7].map(d => (
                                                    <option key={d} value={d}>{d} {d === 1 ? 'dzień' : 'dni'}</option>
                                                ))}
                                            </select>
                                            {(installation.expectedDuration || 1) > 1 && (
                                                <span className="text-xs text-indigo-500">
                                                    → widoczny w kalendarzu na {installation.expectedDuration} dni
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* ---- INLINE COST EDITING CARD ---- */}
                                    <div className="bg-purple-50/50 rounded-xl border border-purple-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-purple-100/50 border-b border-purple-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">💰</span>
                                                <h3 className="font-bold text-purple-800 text-sm">Koszty Montażu</h3>
                                            </div>
                                            {savingCosts && <span className="text-[10px] text-purple-500 animate-pulse font-bold">Zapisuję...</span>}
                                        </div>
                                        <div className="p-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-purple-600 mb-1">🏨 Hotel</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={editCosts.hotelCost || ''}
                                                            onChange={e => setEditCosts(prev => ({ ...prev, hotelCost: parseFloat(e.target.value) || 0 }))}
                                                            onBlur={async () => {
                                                                setSavingCosts(true);
                                                                try {
                                                                    await InstallationService.updateFinancials(installation.id, { hotelCost: editCosts.hotelCost });
                                                                    toast.success('Koszt hotelu zapisany', { id: 'cost-save' });
                                                                } catch { toast.error('Błąd zapisu'); }
                                                                finally { setSavingCosts(false); }
                                                            }}
                                                            className="w-full pl-7 pr-2 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute left-2.5 top-2.5 text-purple-400 text-xs">€</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-amber-600 mb-1">⛽ Materiały/Paliwo</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={editCosts.consumablesCost || ''}
                                                            onChange={e => setEditCosts(prev => ({ ...prev, consumablesCost: parseFloat(e.target.value) || 0 }))}
                                                            onBlur={async () => {
                                                                setSavingCosts(true);
                                                                try {
                                                                    await InstallationService.updateFinancials(installation.id, { consumablesCost: editCosts.consumablesCost });
                                                                    toast.success('Koszt materiałów zapisany', { id: 'cost-save' });
                                                                } catch { toast.error('Błąd zapisu'); }
                                                                finally { setSavingCosts(false); }
                                                            }}
                                                            className="w-full pl-7 pr-2 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute left-2.5 top-2.5 text-amber-400 text-xs">€</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">📦 Inne koszty</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={editCosts.additionalCosts || ''}
                                                            onChange={e => setEditCosts(prev => ({ ...prev, additionalCosts: parseFloat(e.target.value) || 0 }))}
                                                            onBlur={async () => {
                                                                setSavingCosts(true);
                                                                try {
                                                                    await InstallationService.updateFinancials(installation.id, { additionalCosts: editCosts.additionalCosts });
                                                                    toast.success('Koszty dodatkowe zapisane', { id: 'cost-save' });
                                                                } catch { toast.error('Błąd zapisu'); }
                                                                finally { setSavingCosts(false); }
                                                            }}
                                                            className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none bg-white"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">€</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(editCosts.hotelCost + editCosts.consumablesCost + editCosts.additionalCosts) > 0 && (
                                                <div className="mt-3 pt-3 border-t border-purple-100 flex justify-end">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-purple-500 font-bold uppercase">Suma kosztów</div>
                                                        <div className="text-lg font-bold text-purple-700">{(editCosts.hotelCost + editCosts.consumablesCost + editCosts.additionalCosts).toFixed(2)} €</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Live Crew Card — Montażyści dnia */}
                                    {workSessions.length > 0 && workSessions.some(ws => ws.crewMembers && ws.crewMembers.length > 0) && (
                                        <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-indigo-100/50 border-b border-indigo-200 flex items-center gap-2">
                                                <span className="text-base">👷</span>
                                                <h3 className="font-bold text-indigo-800 text-sm">Montażyści dnia</h3>
                                                {workSessions.some(ws => ws.status === 'started') && (
                                                    <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">AKTYWNA SESJA</span>
                                                )}
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {/* Show crew from the latest/active session */}
                                                {(() => {
                                                    const activeSession = workSessions.find(ws => ws.status === 'started') || workSessions[0];
                                                    const crew = activeSession?.crewMembers || [];
                                                    return crew.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {crew.map((cm: any) => (
                                                                <div key={cm.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                                        {cm.firstName?.[0]}{cm.lastName?.[0] || ''}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-700">{cm.firstName} {cm.lastName}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null;
                                                })()}
                                                <p className="text-[10px] text-indigo-400 italic">Skład pobierany z aktywnej sesji montażowej</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Work Sessions & Costs Card */}
                                    {(workSessions.length > 0 || (installation.hotelCost || 0) + (installation.consumablesCost || 0) + (installation.additionalCosts || 0) > 0) && (
                                        <div className="bg-green-50/50 rounded-xl border border-green-200 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-green-100/50 border-b border-green-200 flex items-center gap-2">
                                                <span className="text-base">⏱</span>
                                                <h3 className="font-bold text-green-800 text-sm">Sesje robocze i koszty</h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {/* Cost Summary */}
                                                {(() => {
                                                    const laborCost = workSessions.reduce((s, ws) => s + ws.laborCost, 0);
                                                    const fuelCost = workSessions.reduce((s, ws) => s + ws.fuelCost, 0) || (installation.consumablesCost || 0);
                                                    const hotelCost = workSessions.reduce((s, ws) => s + ws.hotelCost, 0) || (installation.hotelCost || 0);
                                                    const totalMinutes = workSessions.reduce((s, ws) => s + (ws.totalWorkMinutes || 0), 0);
                                                    const totalCost = laborCost + fuelCost + hotelCost;
                                                    return totalCost > 0 || totalMinutes > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-white p-2.5 rounded-lg border border-green-100">
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Czas pracy</div>
                                                                <div className="text-base font-bold text-blue-700">{Math.floor(totalMinutes / 60)}h {Math.round(totalMinutes % 60)}m</div>
                                                            </div>
                                                            <div className="bg-white p-2.5 rounded-lg border border-green-100">
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">Koszt łączny</div>
                                                                <div className="text-base font-bold text-red-600">{totalCost.toFixed(2)} €</div>
                                                            </div>
                                                            {laborCost > 0 && <div className="bg-white p-2 rounded-lg border border-green-100 text-xs"><span className="text-slate-400">👷 Robocizna:</span> <strong className="text-blue-700">{laborCost.toFixed(2)} €</strong></div>}
                                                            {fuelCost > 0 && <div className="bg-white p-2 rounded-lg border border-green-100 text-xs"><span className="text-slate-400">⛽ Paliwo:</span> <strong className="text-amber-700">{fuelCost.toFixed(2)} €</strong></div>}
                                                            {hotelCost > 0 && <div className="bg-white p-2 rounded-lg border border-green-100 text-xs"><span className="text-slate-400">🏨 Hotel:</span> <strong className="text-purple-700">{hotelCost.toFixed(2)} €</strong></div>}
                                                        </div>
                                                    ) : null;
                                                })()}

                                                {/* Session List */}
                                                {workSessions.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesje</h4>
                                                        {workSessions.map(ws => (
                                                            <div key={ws.id} className="bg-white p-2.5 rounded-lg border border-green-100 text-xs">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-slate-700">
                                                                        📅 {ws.sessionDate ? new Date(ws.sessionDate).toLocaleDateString('pl-PL') : '—'}
                                                                    </span>
                                                                    <span className="text-blue-600 font-bold">
                                                                        {Math.floor((ws.totalWorkMinutes || 0) / 60)}h {Math.round((ws.totalWorkMinutes || 0) % 60)}m
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {ws.crewMembers.map((cm: any) => (
                                                                        <span key={cm.id} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                                                            {cm.firstName} {cm.lastName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {ws.startedAt && ws.endedAt && (
                                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                                        {new Date(ws.startedAt).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})} – {new Date(ws.endedAt).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
                                                                        {(ws.breakMinutes || 0) > 0 && ` (przerwa: ${ws.breakMinutes} min)`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Measurement Tasks Card */}
                                    <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-amber-100 border-b border-amber-200 flex items-center gap-2">
                                            <span className="text-base">📐</span>
                                            <h3 className="font-bold text-amber-800 text-sm">Zadania do domierzenia</h3>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            {(!formData.measurementTasks || formData.measurementTasks.length === 0) && (
                                                <p className="text-xs text-amber-600 italic">Brak zadań — dodaj poniżej</p>
                                            )}
                                            {formData.measurementTasks?.map((task: any) => (
                                                <div key={task.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-100">
                                                    <span className={`mt-0.5 text-sm ${task.completed ? 'text-green-500' : 'text-amber-400'}`}>
                                                        {task.completed ? '✅' : '🔲'}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.description}</p>
                                                        {task.completed && task.completedAt && (
                                                            <p className="text-[10px] text-green-600 mt-0.5">Wykonano: {new Date(task.completedAt).toLocaleDateString('pl-PL')}</p>
                                                        )}
                                                    </div>
                                                    {canManageAssignments && !task.completed && (
                                                        <button type="button" onClick={() => {
                                                            handleChange('measurementTasks', (formData.measurementTasks || []).filter((t: any) => t.id !== task.id));
                                                        }} className="text-slate-400 hover:text-red-500 text-xs flex-shrink-0">✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            {canManageAssignments && (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Np. domierzyć wysokość okapu..."
                                                        className="flex-1 p-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                const newTask = { id: crypto.randomUUID(), description: val, completed: false };
                                                                handleChange('measurementTasks', [...(formData.measurementTasks || []), newTask]);
                                                                (e.target as HTMLInputElement).value = '';
                                                            }
                                                        }}
                                                    />
                                                    <button type="button" onClick={() => {
                                                        const input = document.querySelector('input[placeholder*="domierzyć"]') as HTMLInputElement;
                                                        if (input?.value.trim()) {
                                                            const newTask = { id: crypto.randomUUID(), description: input.value.trim(), completed: false };
                                                            handleChange('measurementTasks', [...(formData.measurementTasks || []), newTask]);
                                                            input.value = '';
                                                        }
                                                    }} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors">+</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---- TAB: CONTRACT ---- */}
                    {activeTab === 'contract' && (
                        <div className="p-5 space-y-5">
                            {contractDetails ? (
                                <>
                                    {/* Contract Header */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                            <span className="text-base">📄</span>
                                            <h3 className="font-bold text-slate-700 text-sm">Szczegóły Umowy</h3>
                                        </div>
                                        <div className="p-4">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Numer Umowy</label>
                                                    <p className="font-bold text-slate-800 font-mono">{contractNumber || '—'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Data Podpisania</label>
                                                    <p className="font-medium text-slate-800">{contractDetails.signed_at ? new Date(contractDetails.signed_at).toLocaleDateString('pl-PL') : '—'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Status Umowy</label>
                                                    <p className="font-medium text-slate-800 capitalize">{contractDetails.status || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contract Client */}
                                    {contractClient && (
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                                                <h3 className="font-bold text-slate-700 text-sm">👤 Dane Klienta z Umowy</h3>
                                            </div>
                                            <div className="p-4 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Klient</label>
                                                    <p className="text-sm text-slate-800 font-medium">{contractClient.firstName} {contractClient.lastName}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Telefon</label>
                                                    <p className="text-sm text-slate-800">{contractClient.phone || '—'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Email</label>
                                                    <p className="text-sm text-slate-800">{contractClient.email || '—'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Adres</label>
                                                    <p className="text-sm text-slate-800">
                                                        {contractClient.address || contractClient.street || '—'}
                                                        {contractClient.city && `, ${contractClient.postalCode || ''} ${contractClient.city}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Supply Status */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                                            <h3 className="font-bold text-slate-700 text-sm">📦 Status Materiałów</h3>
                                        </div>
                                        <div className="p-4">
                                            {contractDetails.offerOrders?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {contractDetails.offerOrders.map((o: any) => (
                                                        <div key={o.id} className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-lg">
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{o.order_number || 'Zamówienie'}</p>
                                                                <p className="text-xs text-slate-500">{o.items_summary || 'Materiał'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                    o.status === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                    {o.status === 'delivered' ? 'Dostarczono' : o.status === 'ordered' ? 'Zamówiono' : o.status}
                                                                </span>
                                                                {(o.delivery_date || o.planned_delivery_date) && (
                                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                                        {new Date(o.delivery_date || o.planned_delivery_date).toLocaleDateString('pl-PL')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">Brak powiązanych zamówień</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contract Comments */}
                                    {contractDetails.contract_data?.comments?.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                            <h4 className="font-bold text-yellow-800 text-sm mb-2">💬 Uwagi z Umowy</h4>
                                            {contractDetails.contract_data.comments.map((c: any, i: number) => (
                                                <p key={i} className="text-sm text-yellow-900 italic mb-1">"{c.text}"</p>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <span className="text-4xl mb-3 block">📄</span>
                                    <p className="font-medium">Brak powiązanej umowy</p>
                                    <p className="text-sm mt-1">Ten montaż nie jest powiązany z żadną umową.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ---- TAB: DOCUMENTATION ---- */}
                    {activeTab === 'docs' && (
                        <div className="p-5 space-y-5">

                            {/* Notes */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                                    <span className="text-base">📝</span>
                                    <h3 className="font-bold text-slate-700 text-sm">Notatki dla Ekipy</h3>
                                </div>
                                <div className="p-4">
                                    <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)}
                                        placeholder="Np. kod do bramy, uwaga na psa, specyficzne warunki montażu..."
                                        className="w-full p-3 border border-slate-200 rounded-lg h-28 focus:ring-2 focus:ring-blue-400 outline-none resize-none text-sm" />
                                </div>
                            </div>

                            {/* Photos */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">📸</span>
                                        <h3 className="font-bold text-slate-700 text-sm">Zdjęcia Montażu</h3>
                                        <span className="text-xs text-slate-400">({photos.length})</span>
                                    </div>
                                    <div>
                                        <input type="file" accept="image/*" multiple id="photo-upload" className="hidden"
                                            onChange={e => {
                                                Array.from(e.target.files || []).forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onload = ev => {
                                                        if (installation.offerId) { addOfferPhoto(installation.offerId, ev.target?.result as string); setPhotos(getOfferPhotos(installation.offerId)); }
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                                e.target.value = '';
                                            }} />
                                        <label htmlFor="photo-upload" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg cursor-pointer border border-slate-200 transition-colors">
                                            + Dodaj
                                        </label>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {photos.length > 0 ? (
                                        <PhotoGallery photos={photos} onDelete={i => {
                                            if (installation.offerId) { removeOfferPhoto(installation.offerId, i); setPhotos(getOfferPhotos(installation.offerId)); toast.success('Usunięto'); }
                                        }} />
                                    ) : (
                                        <p className="text-sm text-slate-400 italic text-center py-4">Brak zdjęć — dodaj dokumentację montażu</p>
                                    )}
                                </div>
                            </div>

                            {/* Client Acceptance */}
                            <div className="bg-green-50/50 rounded-xl border border-green-200 overflow-hidden">
                                <div className="px-4 py-2.5 bg-green-100/50 border-b border-green-200 flex items-center gap-2">
                                    <span className="text-base">✅</span>
                                    <h3 className="font-bold text-green-800 text-sm">Odbiór Klienta</h3>
                                </div>
                                <div className="p-4">
                                    {formData.acceptance ? (
                                        <div className="bg-green-100 text-green-800 p-3 rounded-lg border border-green-200 text-sm space-y-1">
                                            <p className="font-bold">✅ Montaż odebrany</p>
                                            <p>Przez: {formData.acceptance.clientName}</p>
                                            <p>Data: {new Date(formData.acceptance.acceptedAt).toLocaleString('pl-PL')}</p>
                                            {formData.acceptance.notes && <p className="italic">"{formData.acceptance.notes}"</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-600">Potwierdź odbiór prac przez klienta. Status zmieni się na "Zakończony".</p>
                                            {(!readOnly || formData.status !== 'completed') && (
                                                <button onClick={handleForceComplete} disabled={saving}
                                                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm">
                                                    {saving ? '⏳ Zapisywanie...' : '✅ Wymuś Zakończenie (Biuro)'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============ FOOTER ============ */}
                <div className="border-t border-slate-200 px-5 py-3 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={handleRestoreToBacklog} disabled={readOnly || saving}
                            className="px-3 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors">
                            🗑 Usuń z kalendarza
                        </button>
                        <button onClick={async () => {
                            try { await generateInstallationProtocolPDF(formData as Installation); toast.success('Pobrano PDF'); }
                            catch { toast.error('Błąd PDF'); }
                        }} className="px-3 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1">
                            📄 Protokół PDF
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors">
                            Anuluj
                        </button>
                        <button onClick={handleSave} disabled={saving || readOnly || hasConflict}
                            className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-2 text-sm ${saving || readOnly || hasConflict ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                                }`}>
                            {saving ? (
                                <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Zapisuję...</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Zapisz</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
