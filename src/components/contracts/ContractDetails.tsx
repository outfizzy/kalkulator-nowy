import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateInstallationProtocolPDF } from '../../utils/installationProtocolPDF';
import type { Contract, ContractComment, ContractAttachment, User, Installation, InstallationTeam } from '../../types';
import { StorageService } from '../../services/database/storage.service';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { ContractService } from '../../services/database/contract.service';
import { InstallationService } from '../../services/database/installation.service';
import { UserService } from '../../services/database/user.service';
import { useAuth } from '../../contexts/AuthContext';
import { OrderedItemsModule } from './OrderedItemsModule';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';
import { InstallationStatusCard } from '../installations/InstallationStatusCard';
import { ProjectMeasurementsList } from '../measurements/ProjectMeasurementsList';

export const ContractDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState<any>(null);
    const [costLoading, setCostLoading] = useState(false);

    // Installation State
    const [installation, setInstallation] = useState<Installation | null>(null);
    const [isInstallationModalOpen, setIsInstallationModalOpen] = useState(false);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);

    const [salesReps, setSalesReps] = useState<User[]>([]);

    useEffect(() => {
        if (!id) return;

        const loadContract = async () => {
            try {
                const contracts = await DatabaseService.getContracts();
                const found = contracts.find(c => c.id === id);
                if (found) {
                    setContract(found);
                    const existingInstallation = await InstallationService.getInstallationByOfferId(found.offerId);
                    setInstallation(existingInstallation);
                } else {
                    toast.error('Nie znaleziono umowy');
                    navigate('/contracts');
                }
            } catch (error) {
                console.error('Error loading contract:', error);
                toast.error('Błąd ładowania umowy');
                navigate('/contracts');
            }
        };

        loadContract();
        InstallationService.getTeams().then(setTeams).catch(console.error);

        // Load cost breakdown
        setCostLoading(true);
        ContractService.getContractCostBreakdown(id)
            .then(setCostBreakdown)
            .catch(err => console.error('Cost breakdown error:', err))
            .finally(() => setCostLoading(false));

        if (isAdmin()) {
            UserService.getSalesReps().then(setSalesReps).catch(console.error);
        }
    }, [id, navigate, isAdmin]);

    const handleSave = async () => {
        if (!contract) return;

        if (contract.status === 'signed') {
            if (!window.confirm('Czy na pewno oznaczyć jako PODPISANĄ? Umowa stanie się dostępna do montażu.')) {
                return;
            }
        }

        try {
            await DatabaseService.updateContract(contract.id, contract);
            toast.success('Zapisano zmiany');
            setIsEditing(false);

            if (contract.status === 'signed') {
                toast.success('Umowa podpisana! Przejdź do "Planowanie Montaży" aby utworzyć montaż.', { duration: 5000 });
            }
        } catch (error) {
            console.error('Error updating contract:', error);
            toast.error('Błąd zapisu umowy');
        }
    };

    const handleAddComment = async () => {
        if (!contract || !newComment.trim()) return;

        const comment: ContractComment = {
            id: crypto.randomUUID(),
            text: newComment,
            author: 'Aktualny Użytkownik',
            createdAt: new Date()
        };

        const updatedContract: Contract = {
            ...contract,
            comments: [...contract.comments, comment]
        };

        setContract(updatedContract);
        try {
            await DatabaseService.updateContract(updatedContract.id, updatedContract);
            setNewComment('');
            toast.success('Dodano komentarz');
        } catch (error) {
            console.error('Error updating contract with comment:', error);
            toast.error('Błąd dodawania komentarza');
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const uploadAttachment = async (file: File, type: 'document' | 'image') => {
        if (!contract) return;
        setIsUploading(true);
        const toastId = toast.loading('Wgrywanie pliku...');

        try {
            const path = `contracts/${contract.id}`;
            const publicUrl = await StorageService.uploadFile(file, 'attachments', path);

            const attachment: ContractAttachment = {
                id: crypto.randomUUID(),
                name: file.name,
                url: publicUrl,
                type: type,
                createdAt: new Date()
            };

            const updatedContract: Contract = {
                ...contract,
                attachments: [...contract.attachments, attachment],
                ...(file.name.toLowerCase().includes('podpisan') && type === 'document' ? { status: 'signed', signedAt: new Date() } : {})
            };

            setContract(updatedContract);
            await DatabaseService.updateContract(updatedContract.id, updatedContract);
            toast.success('Plik wgrany pomyślnie', { id: toastId });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Błąd wgrywania pliku', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSignedContractUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            toast.error('Tylko pliki PDF są dozwolone');
            return;
        }
        const renamedFile = new File([file], `UMOWA-PODPISANA-${contract?.contractNumber.replace(/\//g, '-')}.pdf`, { type: file.type });
        uploadAttachment(renamedFile, 'document');
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        Array.from(e.target.files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            uploadAttachment(file, 'image');
        });
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        uploadAttachment(file, 'document');
    };

    const handlePlanInstallation = async () => {
        if (!contract) return;

        if (installation) {
            toast.error('Montaż już zaplanowany');
            return;
        }

        try {
            await DatabaseService.createInstallation({
                offerId: contract.offerId,
                status: 'pending',
                client: {
                    firstName: contract.client.firstName,
                    lastName: contract.client.lastName,
                    city: contract.client.city,
                    postalCode: contract.client.postalCode,
                    address: `${contract.client.street} ${contract.client.houseNumber}`.trim(),
                    phone: contract.client.phone,
                    email: contract.client.email || '',
                },
                productSummary: `${contract.product.modelId} ${contract.product.width}x${contract.product.projection} mm`,
                notes: [
                    contract.requirements.constructionProject ? 'Projekt' : '',
                    contract.requirements.powerSupply ? 'Prąd' : '',
                    contract.requirements.foundation ? 'Fundament' : '',
                    contract.requirements.other,
                    contract.installationNotes ? `\n📋 NOTATKI DLA EKIPY:\n${contract.installationNotes}` : ''
                ].filter(Boolean).join(', '),
                expectedDuration: contract.installation_days_estimate || 1
            });

            const newInstallation = await InstallationService.getInstallationByOfferId(contract.offerId);
            setInstallation(newInstallation);
            setIsInstallationModalOpen(true);
            toast.success('Utworzono zlecenie montażu');
        } catch (error) {
            console.error('Error creating installation:', JSON.stringify(error, null, 2));
            toast.error(`Błąd tworzenia montażu: ${(error as any)?.message || 'Nieznany błąd'}`);
        }
    };

    if (!contract) return <div className="flex items-center justify-center h-full text-slate-400">Ładowanie...</div>;

    const netPrice = contract.pricing?.finalPriceNet || contract.pricing?.sellingPriceNet || 0;
    const grossPrice = netPrice * 1.23;
    const commissionRate = netPrice > 0 ? ((contract.commission || 0) / netPrice) * 100 : 0;
    const advancePercent = contract.pricing?.advancePayment ? Math.round((contract.pricing.advancePayment / grossPrice) * 100) : 0;
    const allImages = (contract.attachments || []).filter(a => a.type === 'image');
    const allDocuments = (contract.attachments || []).filter(a => a.type === 'document');

    return (
        <div className="h-full flex flex-col bg-slate-50 p-4 md:p-6 overflow-y-auto">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={() => navigate('/contracts')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                            {isEditing && isAdmin() ? (
                                <input
                                    value={contract.contractNumber}
                                    onChange={e => setContract({ ...contract, contractNumber: e.target.value })}
                                    className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 w-48 md:w-64"
                                    placeholder="PL/0000/DD/MM/YYYY"
                                />
                            ) : (
                                <>Umowa {contract.contractNumber}</>
                            )}
                        </h1>
                        {isEditing ? (
                            <select
                                value={contract.status}
                                onChange={e => setContract({ ...contract, status: e.target.value as Contract['status'] })}
                                className="px-3 py-1 text-xs font-bold rounded-full border-2 border-purple-300 focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="draft">Szkic</option>
                                <option value="signed">Podpisana</option>
                                <option value="completed">Zakończona</option>
                                <option value="cancelled">Anulowana</option>
                            </select>
                        ) : (
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${contract.status === 'signed' ? 'bg-green-100 text-green-700' :
                                contract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    contract.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-200 text-slate-700'
                                }`}>
                                {contract.status === 'signed' ? 'Podpisana' :
                                    contract.status === 'completed' ? 'Zakończona' :
                                        contract.status === 'cancelled' ? 'Anulowana' : 'Szkic'}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 ml-9 mt-1 text-sm">
                        Utworzono:{' '}
                        {isEditing && isAdmin() ? (
                            <input
                                type="date"
                                value={new Date(contract.createdAt).toISOString().split('T')[0]}
                                onChange={e => setContract({ ...contract, createdAt: new Date(e.target.value) })}
                                className="border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 text-slate-700 font-medium"
                            />
                        ) : (
                            new Date(contract.createdAt).toLocaleDateString()
                        )}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm">
                                Anuluj
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors text-sm">
                                💾 Zapisz Zmiany
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm">
                            ✏️ Edytuj
                        </button>
                    )}
                </div>
            </div>

            {/* ── ADVANCE PAYMENT (Zaliczka) ── */}
            <div className={`mb-6 p-4 rounded-xl shadow-sm border-2 ${contract.advancePaid ? 'bg-green-50 border-green-300' : (contract.advanceAmount && contract.advanceAmount > 0) ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${contract.advancePaid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            <span className="text-lg">{contract.advancePaid ? '✅' : '💰'}</span>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase">Zaliczka</div>
                            {isEditing ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={contract.advanceAmount || ''}
                                        onChange={e => setContract({ ...contract, advanceAmount: parseFloat(e.target.value) || 0 })}
                                        className="w-32 px-2 py-1 border rounded text-sm font-bold"
                                        placeholder="Kwota zaliczki"
                                    />
                                    <span className="text-sm text-slate-500">€</span>
                                    <input
                                        value={contract.advanceNotes || ''}
                                        onChange={e => setContract({ ...contract, advanceNotes: e.target.value })}
                                        className="w-48 px-2 py-1 border rounded text-sm"
                                        placeholder="Notatka..."
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-bold text-lg ${contract.advancePaid ? 'text-green-700' : 'text-amber-700'}`}>
                                        {contract.advanceAmount ? `${contract.advanceAmount.toFixed(2)} €` : 'Nie ustawiona'}
                                    </span>
                                    {contract.advancePaid ? (
                                        <span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full uppercase">Opłacona</span>
                                    ) : contract.advanceAmount && contract.advanceAmount > 0 ? (
                                        <span className="text-[10px] font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full uppercase animate-pulse">Nieopłacona</span>
                                    ) : null}
                                </div>
                            )}
                            {/* Who confirmed & when */}
                            {contract.advancePaid && contract.advancePaidAt && (
                                <div className="text-[10px] text-green-600 mt-0.5">
                                    Potwierdzona {new Date(contract.advancePaidAt).toLocaleDateString('pl-PL')} o {new Date(contract.advancePaidAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    {contract.advancePaidByUser && ` przez ${contract.advancePaidByUser.firstName} ${contract.advancePaidByUser.lastName}`}
                                </div>
                            )}
                            {contract.advanceNotes && !isEditing && (
                                <div className="text-xs text-slate-500 mt-0.5">📝 {contract.advanceNotes}</div>
                            )}
                        </div>
                    </div>

                    {/* Mark as paid / unpaid button */}
                    {!isEditing && contract.advanceAmount && contract.advanceAmount > 0 && (
                        <button
                            onClick={async () => {
                                const newPaidState = !contract.advancePaid;
                                if (!newPaidState && !window.confirm('Czy na pewno cofnąć potwierdzenie zaliczki?')) return;
                                try {
                                    await DatabaseService.updateContract(contract.id, { advancePaid: newPaidState } as any);
                                    // Reload to get updated advancePaidBy/At
                                    const contracts = await DatabaseService.getContracts();
                                    const updated = contracts.find(c => c.id === contract.id);
                                    if (updated) setContract(updated);
                                    toast.success(newPaidState ? '✅ Zaliczka potwierdzona!' : '↩️ Potwierdzenie zaliczki cofnięte');
                                } catch (err) {
                                    toast.error('Błąd aktualizacji zaliczki');
                                }
                            }}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
                                contract.advancePaid
                                    ? 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                            }`}
                        >
                            {contract.advancePaid ? '↩️ Cofnij potwierdzenie' : '✅ Potwierdź wpłatę zaliczki'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Key Info Bar ── */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Handlowiec */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Handlowiec</div>
                        {isEditing && isAdmin() ? (
                            <select value={contract.salesRepId || ''} onChange={(e) => setContract({ ...contract, salesRepId: e.target.value })} className="p-1 border rounded text-sm w-full">
                                <option value="">Wybierz...</option>
                                {salesReps.map(rep => (<option key={rep.id} value={rep.id}>{rep.firstName} {rep.lastName}</option>))}
                            </select>
                        ) : (
                            <div className="font-medium text-slate-800 text-sm truncate">{contract.salesRep ? `${contract.salesRep.firstName} ${contract.salesRep.lastName}` : '—'}</div>
                        )}
                    </div>
                </div>
                {/* Podpisana */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Podpisana</div>
                        <div className="font-medium text-slate-800 text-sm truncate">
                            {contract.signedByUser ? `${contract.signedByUser.firstName} ${contract.signedByUser.lastName}` : '—'}
                        </div>
                        {contract.signedAt && <div className="text-[10px] text-slate-400">{new Date(contract.signedAt).toLocaleDateString()}</div>}
                    </div>
                </div>
                {/* Wartość */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Wartość Netto</div>
                        <div className="font-bold text-slate-800 text-sm">{netPrice.toFixed(2)} €</div>
                    </div>
                </div>
                {/* Montaż */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Montaż (dni)</div>
                        {isEditing ? (
                            <input type="number" min="1" max="14" value={contract.installation_days_estimate || 1} onChange={(e) => setContract({ ...contract, installation_days_estimate: parseInt(e.target.value) || 1 })} className="w-16 p-1 border rounded text-sm font-bold" />
                        ) : (
                            <div className="font-bold text-slate-800 text-sm">{contract.installation_days_estimate || 1} dni</div>
                        )}
                    </div>
                </div>
                {/* Planowany montaż (tygodnie) */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Montaż za (tyg.)</div>
                        {isEditing ? (
                            <input type="number" min="1" max="52" value={contract.plannedInstallationWeeks || ''} onChange={(e) => setContract({ ...contract, plannedInstallationWeeks: parseInt(e.target.value) || undefined })} className="w-16 p-1 border rounded text-sm font-bold" placeholder="—" />
                        ) : (
                            <div className="font-bold text-slate-800 text-sm">{contract.plannedInstallationWeeks ? `${contract.plannedInstallationWeeks} tyg.` : '—'}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ─── LEFT: Client + Requirements + Measurements ─── */}
                <div className="space-y-6">
                    {/* Dane Klienta */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Dane Klienta
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Imię i Nazwisko</label>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <input value={contract.client.firstName} onChange={e => setContract({ ...contract, client: { ...contract.client, firstName: e.target.value } })} className="w-full p-2 border rounded-lg text-sm" placeholder="Imię" />
                                        <input value={contract.client.lastName} onChange={e => setContract({ ...contract, client: { ...contract.client, lastName: e.target.value } })} className="w-full p-2 border rounded-lg text-sm" placeholder="Nazwisko" />
                                    </div>
                                ) : (
                                    <div className="text-slate-800 font-medium">{contract.client.firstName} {contract.client.lastName}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Adres</label>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input value={contract.client.street} onChange={e => setContract({ ...contract, client: { ...contract.client, street: e.target.value } })} className="w-full p-2 border rounded-lg text-sm" placeholder="Ulica" />
                                        <div className="flex gap-2">
                                            <input value={contract.client.houseNumber || ''} onChange={e => setContract({ ...contract, client: { ...contract.client, houseNumber: e.target.value } })} className="w-1/4 p-2 border rounded-lg text-sm" placeholder="Nr" />
                                            <input value={contract.client.postalCode} onChange={e => setContract({ ...contract, client: { ...contract.client, postalCode: e.target.value } })} className="w-1/4 p-2 border rounded-lg text-sm" placeholder="Kod" />
                                            <input value={contract.client.city} onChange={e => setContract({ ...contract, client: { ...contract.client, city: e.target.value } })} className="w-1/2 p-2 border rounded-lg text-sm" placeholder="Miasto" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-700">
                                        {contract.client.street} {contract.client.houseNumber}<br />
                                        {contract.client.postalCode} {contract.client.city}
                                    </div>
                                )}
                            </div>
                            {/* Phone & Email */}
                            {(contract.client.phone || contract.client.email) && !isEditing && (
                                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                                    {contract.client.phone && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Telefon</label>
                                            <a href={`tel:${contract.client.phone}`} className="text-blue-600 hover:underline font-medium">{contract.client.phone}</a>
                                        </div>
                                    )}
                                    {contract.client.email && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">E-mail</label>
                                            <a href={`mailto:${contract.client.email}`} className="text-blue-600 hover:underline font-medium text-xs">{contract.client.email}</a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Wymagania Techniczne */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Wymagania Techniczne
                        </h3>
                        <div className="space-y-2">
                            {([
                                { key: 'constructionProject' as const, label: 'Projekt Budowlany', icon: '📐' },
                                { key: 'foundation' as const, label: 'Fundamenty', icon: '🧱' },
                                { key: 'powerSupply' as const, label: 'Doprowadzenie Prądu', icon: '⚡' }
                            ]).map(req => (
                                <label key={req.key} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={contract.requirements[req.key]}
                                        onChange={e => isEditing && setContract({ ...contract, requirements: { ...contract.requirements, [req.key]: e.target.checked } })}
                                        disabled={!isEditing}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{req.icon} {req.label}</span>
                                    {contract.requirements[req.key] && <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">TAK</span>}
                                </label>
                            ))}
                            {isEditing ? (
                                <div className="mt-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inne uwagi</label>
                                    <textarea value={contract.requirements.other || ''} onChange={e => setContract({ ...contract, requirements: { ...contract.requirements, other: e.target.value } })} className="w-full p-2 border rounded-lg text-sm resize-none" rows={2} placeholder="Dodatkowe wymagania..." />
                                </div>
                            ) : contract.requirements.other ? (
                                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                    <span className="font-bold text-[10px] uppercase text-amber-600 block mb-1">Inne</span>
                                    {contract.requirements.other}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* ── Notatki dla Ekipy Montażowej ── */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-200">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <span className="text-base">🔧</span>
                            Notatki dla Ekipy Montażowej
                        </h3>
                        <p className="text-[10px] text-slate-400 mb-2">Te notatki pojawią się w kalendarzu montaży i w dashboardzie monterów.</p>
                        {isEditing ? (
                            <textarea
                                value={contract.installationNotes || ''}
                                onChange={e => setContract({ ...contract, installationNotes: e.target.value })}
                                className="w-full p-3 border border-orange-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-400 outline-none"
                                rows={3}
                                placeholder="Np. kod do bramy 1234, uwaga na psa, klient prosi o wcześniejszy kontakt, specjalne warunki..."
                            />
                        ) : contract.installationNotes ? (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 whitespace-pre-wrap">
                                {contract.installationNotes}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Brak notatek — kliknij "Edytuj" aby dodać</p>
                        )}
                    </div>

                    {/* Pomiary Techniczne */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                            Pomiary Techniczne
                        </h3>
                        <ProjectMeasurementsList customerId={contract.client.id} contractId={contract.id} />
                    </div>
                </div>

                {/* ─── CENTER: Product + Financials ─── */}
                <div className="space-y-6">
                    {/* Produkt / Zlecenie */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            Produkt / Zlecenie
                        </h3>

                        {/* Main product card */}
                        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 mb-4">
                            <div className="text-base font-bold text-slate-800">{contract.product?.modelId ? contract.product.modelId.toUpperCase() : 'Brak produktu'}</div>
                            {contract.product?.width && contract.product?.projection && (
                                <div className="text-sm text-slate-600 mt-1">{contract.product.width} × {contract.product.projection} mm</div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {contract.product.color && (
                                    <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">Kolor: {contract.product.color}</span>
                                )}
                                {contract.product.roofType && contract.product.roofType !== 'other' && (
                                    <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">Dach: {contract.product.roofType}</span>
                                )}
                                {contract.product.numberOfPosts && (
                                    <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">Słupy: {contract.product.numberOfPosts}</span>
                                )}
                                {contract.product.numberOfFields && (
                                    <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">Pola: {contract.product.numberOfFields}</span>
                                )}
                                {(contract.product as any).installationType && (
                                    <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                                        {{ wall: '🔩 Ściana', ceiling: '🔩 Sufit', freestanding: '🏗️ Wolnostojący' }[(contract.product as any).installationType] || (contract.product as any).installationType}
                                    </span>
                                )}
                                {(contract.product as any).drainageDirection && (
                                    <span className="text-[10px] font-bold uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-emerald-700">
                                        🌧️ {{ links: '← Links', rechts: 'Rechts →', beidseitig: '← Beids. →' }[(contract.product as any).drainageDirection] || (contract.product as any).drainageDirection}
                                    </span>
                                )}
                            </div>

                            {/* Measurement details */}
                            {(contract.product as any).measurements && (() => {
                                const m = (contract.product as any).measurements;
                                const hasMeasurements = m.unterkRinne || m.unterkWand || m.wallType || m.hasElectrical || m.hasDrainage || m.needsLevelingProfiles;
                                if (!hasMeasurements) return null;
                                return (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Dane Pomiarowe</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.unterkRinne && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">H3: {m.unterkRinne}mm</span>}
                                            {m.unterkWand && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">H1: {m.unterkWand}mm</span>}
                                            {m.wallType && <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                                {{ massiv: 'Massivwand', daemmung: 'Dämmung', holz: 'Holz', blech: 'Blech', fertighaus: 'Fertighaus' }[m.wallType as string] || m.wallType}
                                            </span>}
                                            {m.hasElectrical && <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium">⚡ Strom</span>}
                                            {m.hasDrainage && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">🌧️ Entwässerung</span>}
                                            {m.needsLevelingProfiles && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                                                    📐 Ausgleichsprofile {m.slopeLeft || m.slopeFront || m.slopeRight ?
                                                        `(L:${m.slopeLeft || 0}/V:${m.slopeFront || 0}/R:${m.slopeRight || 0}mm)` : ''}
                                                </span>
                                            )}
                                        </div>
                                        {m.technicalNotes && (
                                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">{m.technicalNotes}</div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Planned Installation & Delivery */}
                        {((contract.product as any).plannedInstallDate || (contract.product as any).deliveryAddress) && (
                            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg mb-4">
                                <div className="flex flex-wrap gap-4">
                                    {(contract.product as any).plannedInstallDate && (
                                        <div>
                                            <div className="text-[10px] font-bold text-violet-500 uppercase">📅 Planowany montaż</div>
                                            <div className="text-sm font-bold text-violet-800">
                                                {new Date((contract.product as any).plannedInstallDate).toLocaleDateString('de-DE')}
                                            </div>
                                        </div>
                                    )}
                                    {(contract.product as any).deliveryAddress && (
                                        <div>
                                            <div className="text-[10px] font-bold text-violet-500 uppercase">📦 Adres dostawy (inny niż klient)</div>
                                            <div className="text-sm font-medium text-violet-800">
                                                {(contract.product as any).deliveryAddress.street}{' '}
                                                {(contract.product as any).deliveryAddress.city}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Items (manual contract) */}
                        {contract.product.customItems && contract.product.customItems.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Elementy Zlecenia</h4>
                                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                            <tr>
                                                <th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Nazwa</th>
                                                <th className="p-2 text-center text-[10px] font-bold text-slate-500 uppercase w-14">Ilość</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {contract.product.customItems.map((item, i) => (
                                                <tr key={i} className="hover:bg-white"><td className="p-2 font-medium text-slate-700">{item.name}</td><td className="p-2 text-center font-bold text-slate-800">{item.quantity}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Addons */}
                        {(!contract.product.customItems || contract.product.customItems.length === 0) && contract.product.addons && contract.product.addons.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Dodatki</h4>
                                <ul className="space-y-1">
                                    {contract.product.addons.map((addon, i) => (
                                        <li key={i} className="text-sm text-slate-600 flex justify-between p-2 bg-slate-50 rounded-lg">
                                            <span>{addon.name}</span>
                                            <span className="font-bold text-slate-700">×{addon.quantity || 1}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Manual description */}
                        {contract.product.manualDescription && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                <span className="font-bold text-[10px] uppercase text-blue-600 block mb-1">Opis Zlecenia</span>
                                <div className="whitespace-pre-wrap">{contract.product.manualDescription}</div>
                            </div>
                        )}
                    </div>

                    {/* Finanse */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Finanse
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                <span className="text-slate-600">Wartość Netto</span>
                                <span className="font-bold text-slate-800">{netPrice.toFixed(2)} €</span>
                            </div>

                            {isEditing ? (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kwota Brutto (EUR)</label>
                                        <input type="number" step="0.01" value={grossPrice.toFixed(2)} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setContract({ ...contract, pricing: { ...contract.pricing, finalPriceNet: v / 1.23 } }); }} className="w-full p-2 border rounded-lg font-bold text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zaliczka %</label>
                                            <div className="relative">
                                                <input type="number" min="0" max="100" value={advancePercent || ''} onChange={(e) => { const p = parseFloat(e.target.value); if (!isNaN(p)) setContract({ ...contract, pricing: { ...contract.pricing, advancePayment: (grossPrice * p) / 100 } }); }} className="w-full p-2 border rounded-lg text-sm pr-6" />
                                                <span className="absolute right-2 top-2 text-slate-400 font-bold text-sm">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kwota Zaliczki</label>
                                            <div className="p-2 bg-white border rounded-lg text-sm text-slate-600 font-medium">{contract.pricing.advancePayment ? contract.pricing.advancePayment.toFixed(2) : '0.00'} €</div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metoda Płatności</label>
                                        <select value={contract.pricing.paymentMethod || 'transfer'} onChange={(e) => setContract({ ...contract, pricing: { ...contract.pricing, paymentMethod: e.target.value as any } })} className="w-full p-2 border rounded-lg text-sm">
                                            <option value="transfer">Przelew</option>
                                            <option value="cash">Gotówka</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Wartość Brutto</span>
                                        <span className="font-bold text-slate-800">{grossPrice.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Zaliczka ({advancePercent}%)</span>
                                        <span className="font-bold text-green-600">{contract.pricing.advancePayment?.toFixed(2) || '0.00'} €</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600">Metoda Płatności</span>
                                        <span className="font-medium text-slate-800">{contract.pricing.paymentMethod === 'cash' ? 'Gotówka' : 'Przelew'}</span>
                                    </div>
                                </>
                            )}

                            {/* Advance Payment Status */}
                            <div className={`flex justify-between items-center py-3 px-3 rounded-lg text-sm ${contract.advancePaid ? 'bg-green-50' : 'bg-amber-50'}`}>
                                <span className={`font-medium ${contract.advancePaid ? 'text-green-800' : 'text-amber-800'}`}>
                                    {contract.advancePaid ? '✅ Zaliczka wpłacona' : '⚠️ Zaliczka niewpłacona'}
                                </span>
                                <div className="flex items-center gap-2">
                                    {contract.advancePaidAt && (
                                        <span className="text-[10px] text-slate-500">{new Date(contract.advancePaidAt).toLocaleDateString('pl-PL')}</span>
                                    )}
                                    {isEditing ? (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={contract.advancePaid || false}
                                                onChange={e => setContract({
                                                    ...contract,
                                                    advancePaid: e.target.checked,
                                                    advancePaidAt: e.target.checked ? new Date().toISOString() : undefined
                                                })}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-xs font-bold text-slate-600">Wpłacona</span>
                                        </label>
                                    ) : (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${contract.advancePaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {contract.advancePaid ? 'TAK' : 'NIE'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Remaining Payment */}
                            {contract.pricing.advancePayment && contract.pricing.advancePayment > 0 && (
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                    <span className="text-slate-600">Do zapłaty (po montażu)</span>
                                    <span className="font-bold text-slate-800">{(grossPrice - (contract.pricing.advancePayment || 0)).toFixed(2)} €</span>
                                </div>
                            )}

                            {/* Commission */}
                            <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg text-sm">
                                <span className="text-green-800 font-medium">Prowizja ({commissionRate.toFixed(1)}%)</span>
                                <span className="font-bold text-green-700">{(contract.commission || 0).toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>

                    {/* Bilans Kosztów */}
                    {isAdmin() && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <span className="text-base">📊</span>
                                Bilans Kosztów
                            </h3>
                            {costLoading ? (
                                <div className="text-center text-slate-400 text-sm py-8">Ładowanie kosztów...</div>
                            ) : costBreakdown ? (
                                <div className="space-y-3">
                                    {/* Logistics */}
                                    <div className="py-2 border-b border-slate-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 flex items-center gap-2">
                                                <span className="text-base">📦</span> Towar (logistyka)
                                            </span>
                                            <span className={`font-bold ${costBreakdown.logistics.total > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {costBreakdown.logistics.total > 0 ? `-${costBreakdown.logistics.total.toFixed(2)} €` : '0.00 €'}
                                            </span>
                                        </div>
                                        {costBreakdown.logistics.items.length > 0 && (
                                            <div className="mt-1 pl-7 space-y-0.5">
                                                {costBreakdown.logistics.items.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-[11px] text-slate-500">
                                                        <span>{item.name}</span>
                                                        <span>{item.cost.toFixed(2)} €</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fuel Cost — per-contract share (replaces old "Koszty operacyjne") */}
                                    <div className="py-2 border-b border-slate-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 flex items-center gap-2">
                                                <span className="text-base">⛽</span> Paliwo {costBreakdown.fuelCost ? `(${costBreakdown.fuelCost.salesRepName})` : ''}
                                            </span>
                                            <span className={`font-bold ${costBreakdown.fuelCost && costBreakdown.fuelCost.total > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {costBreakdown.fuelCost && costBreakdown.fuelCost.total > 0 ? `-${costBreakdown.fuelCost.total.toFixed(2)} €` : '0.00 €'}
                                            </span>
                                        </div>
                                        {costBreakdown.fuelCost && costBreakdown.fuelCost.total > 0 && (
                                            <div className="mt-1 pl-7 space-y-0.5">
                                                <div className="flex justify-between text-[11px] text-slate-500">
                                                    <span>Mies. koszt: {costBreakdown.fuelCost.monthlyTotalPLN?.toFixed(2) || costBreakdown.fuelCost.monthlyTotal?.toFixed(2)} PLN → {costBreakdown.fuelCost.monthlyTotal.toFixed(2)} € ({costBreakdown.fuelCost.totalLiters.toFixed(1)} L)</span>
                                                    <span>÷ {costBreakdown.fuelCost.contractsInMonth} umów</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-slate-500">
                                                    <span>💳 {costBreakdown.fuelCost.internalCount} wewn. / 🧾 {costBreakdown.fuelCost.externalCount} zewn.</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Commission */}
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                                        <span className="text-slate-600 flex items-center gap-2">
                                            <span className="text-base">🤝</span> Prowizja
                                        </span>
                                        <span className={`font-bold ${costBreakdown.commission > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {costBreakdown.commission > 0 ? `-${costBreakdown.commission.toFixed(2)} €` : '0.00 €'}
                                        </span>
                                    </div>

                                    {/* Installation */}
                                    <div className="py-2 border-b border-slate-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 flex items-center gap-2">
                                                <span className="text-base">🔧</span> Montaż (realne koszty)
                                            </span>
                                            <span className={`font-bold ${costBreakdown.installation.total > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {costBreakdown.installation.total > 0 ? `-${costBreakdown.installation.total.toFixed(2)} €` : '0.00 €'}
                                            </span>
                                        </div>
                                        {costBreakdown.installation.total > 0 && (
                                            <div className="mt-1 pl-7 space-y-0.5">
                                                {costBreakdown.installation.laborHours > 0 && (
                                                    <div className="flex justify-between text-[11px] text-slate-500">
                                                        <span>Robocizna ({costBreakdown.installation.laborHours.toFixed(1)}h × 25€)</span>
                                                        <span>{costBreakdown.installation.laborCost.toFixed(2)} €</span>
                                                    </div>
                                                )}
                                                {costBreakdown.installation.fuelCost > 0 && (
                                                    <div className="flex justify-between text-[11px] text-slate-500">
                                                        <span>Paliwo (dojazd)</span>
                                                        <span>{costBreakdown.installation.fuelCost.toFixed(2)} €</span>
                                                    </div>
                                                )}
                                                {costBreakdown.installation.hotelCost > 0 && (
                                                    <div className="flex justify-between text-[11px] text-slate-500">
                                                        <span>Hotel / noclegi</span>
                                                        <span>{costBreakdown.installation.hotelCost.toFixed(2)} €</span>
                                                    </div>
                                                )}
                                                {costBreakdown.installation.consumablesCost > 0 && (
                                                    <div className="flex justify-between text-[11px] text-slate-500">
                                                        <span>Materiały eksploatacyjne</span>
                                                        <span>{costBreakdown.installation.consumablesCost.toFixed(2)} €</span>
                                                    </div>
                                                )}
                                                {costBreakdown.installation.additionalCosts > 0 && (
                                                    <div className="flex justify-between text-[11px] text-slate-500">
                                                        <span>Koszty dodatkowe</span>
                                                        <span>{costBreakdown.installation.additionalCosts.toFixed(2)} €</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grand Total */}
                                    <div className="flex justify-between items-center py-3 bg-red-50 px-3 rounded-lg text-sm">
                                        <span className="text-red-800 font-bold">SUMA KOSZTÓW</span>
                                        <span className="font-bold text-red-700 text-base">
                                            -{costBreakdown.grandTotal.toFixed(2)} €
                                        </span>
                                    </div>

                                    {/* Profit/Loss */}
                                    {(() => {
                                        const profit = netPrice - costBreakdown.grandTotal;
                                        const profitPercent = netPrice > 0 ? (profit / netPrice) * 100 : 0;
                                        const isPositive = profit >= 0;
                                        return (
                                            <div className={`flex justify-between items-center py-3 px-3 rounded-lg text-sm ${isPositive ? 'bg-green-50' : 'bg-red-100'}`}>
                                                <span className={`font-bold ${isPositive ? 'text-green-800' : 'text-red-800'}`}>
                                                    {isPositive ? '✅ ZYSK' : '❌ STRATA'} ({profitPercent.toFixed(1)}%)
                                                </span>
                                                <span className={`font-bold text-base ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                                    {isPositive ? '+' : ''}{profit.toFixed(2)} €
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 text-xs py-4 italic">Brak danych kosztowych</div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── RIGHT: Comments + Attachments + Installation ─── */}
                <div className="space-y-6">
                    {/* Komentarze */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col" style={{ maxHeight: '340px' }}>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            Komentarze
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                            {contract.comments.length === 0 && <div className="text-center text-slate-400 text-xs py-6">Brak komentarzy</div>}
                            {contract.comments.map(comment => (
                                <div key={comment.id} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-700">{comment.author}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Dodaj komentarz..." className="flex-1 p-2 border rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                            <button onClick={handleAddComment} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Dokumenty & Zdjęcia */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Dokumenty & Zdjęcia
                        </h3>

                        {/* Upload buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <label className="cursor-pointer px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">
                                <input type="file" accept="application/pdf" onChange={handleSignedContractUpload} className="hidden" />
                                📄 Podpisana Umowa
                            </label>
                            <label className={`cursor-pointer px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors ${isUploading ? 'opacity-50' : ''}`}>
                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} className="hidden" />
                                📸 Zdjęcia
                            </label>
                            <label className={`cursor-pointer px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors ${isUploading ? 'opacity-50' : ''}`}>
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleDocumentUpload} disabled={isUploading} className="hidden" />
                                📎 Plik
                            </label>
                        </div>

                        {/* Photos */}
                        {allImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {allImages.map((photo, idx) => (
                                    <div key={photo.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setLightboxIndex(idx)}>
                                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Documents */}
                        <div className="space-y-2">
                            {allDocuments.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${doc.name.toLowerCase().includes('podpisan') ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div className="truncate">
                                            <div className="text-xs font-bold text-slate-700 truncate">{doc.name}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            ))}
                            {allDocuments.length === 0 && allImages.length === 0 && (
                                <div className="text-center text-xs text-slate-400 py-4 italic">Brak załączników</div>
                            )}
                        </div>
                    </div>

                    {/* Montaż */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Montaż
                        </h3>
                        {installation ? (
                            <>
                                <InstallationStatusCard installation={installation} team={teams.find(t => t.id === installation.teamId)} variant="full" onEdit={() => setIsInstallationModalOpen(true)} showCalendarLink={true} />

                                {/* ── Protokół Odbioru ── */}
                                {(installation as any).completionReport ? (() => {
                                    const report = (installation as any).completionReport;
                                    return (
                                        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                            <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                <span className="text-base">✅</span>
                                                Protokół Odbioru
                                                {report.submittedAt && (
                                                    <span className="ml-auto text-[10px] text-emerald-600 font-normal normal-case">
                                                        {new Date(report.submittedAt).toLocaleDateString('pl-PL')} {new Date(report.submittedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </h4>

                                            {/* Checklist */}
                                            {report.checklist && (
                                                <div className="space-y-1 mb-3">
                                                    {Object.entries(report.checklist).map(([key, val]: [string, any]) => (
                                                        <div key={key} className="flex items-center gap-2 text-xs">
                                                            <span className={val ? 'text-emerald-600' : 'text-red-400'}>{val ? '✅' : '❌'}</span>
                                                            <span className="text-slate-700">{key}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {report.notes && (
                                                <div className="bg-white p-2.5 rounded-lg text-xs text-slate-700 mb-3 border border-emerald-100">
                                                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">Uwagi</span>
                                                    {report.notes}
                                                </div>
                                            )}

                                            {/* Photos */}
                                            {report.photos && report.photos.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1.5">📸 Zdjęcia ({report.photos.length})</span>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {report.photos.map((url: string, i: number) => (
                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity">
                                                                <img src={url} alt={`Zdjęcie ${i + 1}`} className="w-full h-full object-cover" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Signature */}
                                            {report.signatureData && (
                                                <div>
                                                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">✍️ Podpis klienta</span>
                                                    <div className="bg-white rounded-lg p-2 border border-emerald-100 inline-block">
                                                        <img src={report.signatureData} alt="Podpis" className="h-16 w-auto" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : installation.status === 'completed' || installation.status === 'verification' ? (
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                                        <span>⚠️</span>
                                        <span>Brak protokołu odbioru — oczekuje na wypełnienie przez ekipę montażową</span>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <div className="space-y-3">
                                <button onClick={handlePlanInstallation} disabled={contract.status !== 'signed'} title={contract.status !== 'signed' ? 'Podpisz umowę aby zaplanować montaż' : ''} className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-white transition-colors text-sm ${contract.status === 'signed' ? 'bg-purple-600 hover:bg-purple-700 shadow-md' : 'bg-slate-300 cursor-not-allowed'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Utwórz Montaż
                                </button>
                                {contract.status !== 'signed' && <div className="text-center text-xs text-slate-400">Wymagany status: Podpisana</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* ── Ordered Items (full-width below the grid) ── */}
            <OrderedItemsModule
                contract={contract}
                onUpdate={(items) => setContract({ ...contract, orderedItems: items })}
                isEditing={isEditing}
            />

            {/* ── Installation Details Modal ── */}
            {
                installation && (
                    <InstallationDetailsModal
                        installation={installation}
                        isOpen={isInstallationModalOpen}
                        onClose={() => setIsInstallationModalOpen(false)}
                        onUpdate={async () => {
                            const fresh = await InstallationService.getInstallationByOfferId(contract.offerId);
                            setInstallation(fresh);
                        }}
                        onSave={async (updated) => {
                            await InstallationService.updateInstallation(updated.id, updated);
                            const fresh = await InstallationService.getInstallationByOfferId(contract.offerId);
                            setInstallation(fresh);
                            setIsInstallationModalOpen(false);
                            toast.success('Zaktualizowano montaż');
                        }}
                    />
                )
            }

            {/* ── Lightbox ── */}
            {
                lightboxIndex !== null && (
                    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxIndex(null)}>
                        <button className="absolute top-4 right-4 text-white/50 hover:text-white p-2" onClick={() => setLightboxIndex(null)}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev - 1 + allImages.length) % allImages.length : 0); }}>
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev + 1) % allImages.length : 0); }}>
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <img src={allImages[lightboxIndex].url} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm" onClick={(e) => e.stopPropagation()} />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                            {lightboxIndex + 1} / {allImages.length}
                        </div>
                    </div>
                )
            }
        </div >
    );
};
