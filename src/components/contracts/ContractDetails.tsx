import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateInstallationProtocolPDF } from '../../utils/installationProtocolPDF';
// import { PhotoGallery } from '../PhotoGallery';
// import { getOfferPhotos, addOfferPhoto, removeOfferPhoto } from '../../utils/offerPhotos';
import type { Contract, ContractComment, ContractAttachment, User, Installation, InstallationTeam } from '../../types';
import { StorageService } from '../../services/database/storage.service';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
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
    const [photos, setPhotos] = useState<string[]>([]);

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
                    // setPhotos(getOfferPhotos(found.offerId)); // Legacy photos removed

                    // Check for installation
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

        // Load teams for installation display
        InstallationService.getTeams().then(setTeams).catch(console.error);

        if (isAdmin()) {
            UserService.getSalesReps().then(setSalesReps).catch(console.error);
        }
    }, [id, navigate, isAdmin]);

    const handleSave = async () => {
        if (!contract) return;

        // If status changed to signed, confirm
        // We need to check original status, but we only have current state.
        // Ideally we should track original state or fetch it, but for now let's rely on the current value being 'signed'
        // and assuming if user clicks save with 'signed', they intend to sign it.
        // A better approach would be to check if it WAS NOT signed before.
        // For now, let's just confirm if saving as signed.

        if (contract.status === 'signed') {
            if (!window.confirm('Czy na pewno oznaczyć jako PODPISANĄ? Umowa stanie się dostępna do montażu.')) {
                return;
            }
        }

        try {
            // Pass the full contract object to ensure all edited fields (orderedItems, client, requirements) are saved
            await DatabaseService.updateContract(contract.id, contract);

            toast.success('Zapisano zmiany');
            setIsEditing(false);

            if (contract.status === 'signed') {
                toast.success('Umowa podpisana! Przejdź do "Planowanie Montaży" aby utworzyć montaż.', {
                    duration: 5000
                });
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
            author: 'Aktualny Użytkownik', // TODO: Get from AuthContext
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

    // Reuse StorageService for uploads
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
                // If it's a signed contract PDF, strictly update status if needed
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
        // Rename file for clarity
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
                },
                productSummary: `${contract.product.modelId} ${contract.product.width}x${contract.product.projection} mm`,
                notes: [
                    contract.requirements.constructionProject ? 'Projekt' : '',
                    contract.requirements.powerSupply ? 'Prąd' : '',
                    contract.requirements.foundation ? 'Fundament' : '',
                    contract.requirements.other
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

    // Helper calculations


    if (!contract) return <div>Ładowanie...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/contracts')} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {isEditing && isAdmin() ? (
                                <input
                                    value={contract.contractNumber}
                                    onChange={e => setContract({ ...contract, contractNumber: e.target.value })}
                                    className="text-2xl font-bold text-slate-800 border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 w-64"
                                    placeholder="KS/0000/DD/MM/YYYY"
                                />
                            ) : (
                                <>Umowa {contract.contractNumber}</>
                            )}
                        </h1>
                        {isEditing ? (
                            <select
                                value={contract.status}
                                onChange={e => setContract({ ...contract, status: e.target.value as Contract['status'] })}
                                className="px-3 py-1 text-sm font-bold rounded-full border-2 border-purple-300 focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="draft">Szkic</option>
                                <option value="signed">Podpisana</option>
                                <option value="completed">Zakończona</option>
                            </select>
                        ) : (
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${contract.status === 'signed' ? 'bg-green-100 text-green-700' :
                                contract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-200 text-slate-700'
                                }`}>
                                {contract.status === 'signed' ? 'Podpisana' :
                                    contract.status === 'completed' ? 'Zakończona' : 'Szkic'}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 ml-9 mt-1">
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
                <div className="flex gap-2">
                    {isEditing ? (
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                        >
                            Zapisz Zmiany
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                        >
                            Edytuj
                        </button>
                    )}
                    <button
                        onClick={() => {
                            const offerPhotos = getOfferPhotos(contract.offerId);
                            if (offerPhotos && offerPhotos.length > 0) {
                                const installationData = {
                                    id: contract.contractNumber,
                                    offerId: contract.offerId,
                                    client: {
                                        firstName: contract.client.firstName,
                                        lastName: contract.client.lastName,
                                        address: `${contract.client.street} ${contract.client.houseNumber}`,
                                        city: contract.client.city,
                                        phone: contract.client.phone
                                    },
                                    productSummary: `${contract.product.modelId} ${contract.product.width}x${contract.product.projection}mm`,
                                    status: 'pending' as any,
                                    notes: contract.comments.map(c => `${c.author}: ${c.text}`).join('\n'),
                                    scheduledDate: contract.signedAt ? new Date(contract.signedAt).toISOString() : undefined,
                                    createdAt: contract.createdAt
                                } as any;
                                generateInstallationProtocolPDF(installationData);
                                toast.success('Generowanie protokołu PDF...');
                            } else {
                                toast.error('Dodaj zdjęcia przed wygenerowaniem protokołu');
                            }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Protokół PDF
                    </button>
                    <button className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent-dark transition-colors flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Drukuj
                    </button>
                </div>
            </div>

            {/* Sales Rep and Signer Info - New Section */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Handlowiec (Opiekun)</div>
                        {isEditing && isAdmin() ? (
                            <select
                                value={contract.salesRepId || ''}
                                onChange={(e) => setContract({ ...contract, salesRepId: e.target.value })}
                                className="mt-1 p-1 border rounded text-sm min-w-[150px]"
                            >
                                <option value="">Wybierz...</option>
                                {salesReps.map(rep => (
                                    <option key={rep.id} value={rep.id}>
                                        {rep.firstName} {rep.lastName}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="font-medium text-slate-800">
                                {contract.salesRep ? `${contract.salesRep.firstName} ${contract.salesRep.lastName}` : 'Nie przypisano'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Podpisana Przez</div>
                        <div className="font-medium text-slate-800">
                            {contract.signedByUser ? (
                                <span>{contract.signedByUser.firstName} {contract.signedByUser.lastName}</span>
                            ) : (
                                <span className="text-slate-400">-</span>
                            )}
                        </div>
                        {contract.signedAt && (
                            <div className="text-xs text-slate-400">{new Date(contract.signedAt).toLocaleDateString()}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Column: Client & Requirements */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Dane Klienta
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500">Imię i Nazwisko</label>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={contract.client.firstName}
                                            onChange={e => setContract({ ...contract, client: { ...contract.client, firstName: e.target.value } })}
                                            className="w-full p-2 border rounded"
                                        />
                                        <input
                                            value={contract.client.lastName}
                                            onChange={e => setContract({ ...contract, client: { ...contract.client, lastName: e.target.value } })}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-slate-800 font-medium">{contract.client.firstName} {contract.client.lastName}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500">Adres</label>
                                {isEditing ? (
                                    <>
                                        <input
                                            value={contract.client.street}
                                            onChange={e => setContract({ ...contract, client: { ...contract.client, street: e.target.value } })}
                                            className="w-full p-2 border rounded mb-2"
                                            placeholder="Ulica"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                value={contract.client.postalCode}
                                                onChange={e => setContract({ ...contract, client: { ...contract.client, postalCode: e.target.value } })}
                                                className="w-1/3 p-2 border rounded"
                                                placeholder="Kod"
                                            />
                                            <input
                                                value={contract.client.city}
                                                onChange={e => setContract({ ...contract, client: { ...contract.client, city: e.target.value } })}
                                                className="w-2/3 p-2 border rounded"
                                                placeholder="Miasto"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-800">
                                        {contract.client.street} {contract.client.houseNumber}<br />
                                        {contract.client.postalCode} {contract.client.city}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4">Wymagania</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={contract.requirements.constructionProject}
                                    onChange={e => isEditing && setContract({
                                        ...contract,
                                        requirements: { ...contract.requirements, constructionProject: e.target.checked }
                                    })}
                                    disabled={!isEditing}
                                    className="w-5 h-5 text-accent rounded focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-slate-700">Projekt Budowlany</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={contract.requirements.foundation}
                                    onChange={e => isEditing && setContract({
                                        ...contract,
                                        requirements: { ...contract.requirements, foundation: e.target.checked }
                                    })}
                                    disabled={!isEditing}
                                    className="w-5 h-5 text-accent rounded focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-slate-700">Fundamenty</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={contract.requirements.powerSupply}
                                    onChange={e => isEditing && setContract({
                                        ...contract,
                                        requirements: { ...contract.requirements, powerSupply: e.target.checked }
                                    })}
                                    disabled={!isEditing}
                                    className="w-5 h-5 text-accent rounded focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-slate-700">Doprowadzenie Prądu</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="mb-4">
                            <h3 className="font-bold text-slate-800">Pomiary Techniczne</h3>
                            <p className="text-xs text-slate-500">Pomiary z modułu Dachrechner</p>
                        </div>
                        <ProjectMeasurementsList
                            customerId={contract.client.id}
                            contractId={contract.id}
                        />
                    </div>
                </div>

                {/* Middle Column: Product & Financials */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4">Produkt</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="text-sm font-bold text-slate-800">{contract.product.modelId.toUpperCase()}</div>
                                <div className="text-sm text-slate-600">
                                    {contract.product.width} x {contract.product.projection} mm
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Kolor: {contract.product.color} | Dach: {contract.product.roofType}
                                </div>
                            </div>

                            {/* Manual Contract Multiple Items Display */}
                            {contract.product.customItems && contract.product.customItems.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Elementy Umowy</h4>
                                    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2 text-left text-xs font-bold text-slate-500">Nazwa / Opis</th>
                                                    <th className="p-2 text-center text-xs font-bold text-slate-500">Ilość</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {contract.product.customItems.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="p-2">
                                                            <div className="font-medium text-slate-800">{item.name}</div>
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-slate-700">
                                                            {item.quantity}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {(!contract.product.customItems || contract.product.customItems.length === 0) && contract.product.addons && contract.product.addons.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Dodatki</h4>
                                    <ul className="space-y-1">

                                        {contract.product.addons.map((addon, i) => (
                                            <li key={i} className="text-sm text-slate-600 flex justify-between">
                                                <span>{addon.name}</span>
                                                <span className="font-medium">x{addon.quantity || 1}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4">Finanse</h3>
                        <div className="space-y-4">
                            {/* Financial Fields - Editable */}
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-slate-600">Wartość Netto</span>
                                <span className="font-bold text-slate-800">
                                    {(contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet).toFixed(2)} EUR
                                </span>
                            </div>

                            {isEditing ? (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Kwota Brutto (EUR)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={((contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet) * 1.23).toFixed(2)}
                                            onChange={(e) => {
                                                const newGross = parseFloat(e.target.value);
                                                if (!isNaN(newGross)) {
                                                    const newNet = newGross / 1.23;
                                                    setContract({
                                                        ...contract,
                                                        pricing: { ...contract.pricing, finalPriceNet: newNet }
                                                    });
                                                }
                                            }}
                                            className="w-full p-2 border rounded font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Zaliczka %</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={contract.pricing.advancePayment ? Math.round((contract.pricing.advancePayment / ((contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet) * 1.23)) * 100) : ''}
                                                    onChange={(e) => {
                                                        const percent = parseFloat(e.target.value);
                                                        if (!isNaN(percent)) {
                                                            const currentGross = (contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet) * 1.23;
                                                            const newAdvance = (currentGross * percent) / 100;
                                                            setContract({
                                                                ...contract,
                                                                pricing: { ...contract.pricing, advancePayment: newAdvance }
                                                            });
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded pr-6"
                                                />
                                                <span className="absolute right-2 top-2 text-slate-400 font-bold">%</span>
                                            </div>
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Kwota Zaliczki</label>
                                            <div className="p-2 bg-white border border-slate-200 rounded text-slate-600 font-medium">
                                                {contract.pricing.advancePayment ? contract.pricing.advancePayment.toFixed(2) : '0.00'} EUR
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Metoda Płatności</label>
                                        <select
                                            value={contract.pricing.paymentMethod || 'transfer'}
                                            onChange={(e) => setContract({
                                                ...contract,
                                                pricing: { ...contract.pricing, paymentMethod: e.target.value as any }
                                            })}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="transfer">Przelew</option>
                                            <option value="cash">Gotówka</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Wartość Brutto</span>
                                        <span className="font-bold text-slate-800">
                                            {((contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet) * 1.23).toFixed(2)} EUR
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Zaliczka ({contract.pricing.advancePayment ? Math.round((contract.pricing.advancePayment / ((contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet) * 1.23)) * 100) : 0}%)</span>
                                        <span className="font-bold text-green-600">
                                            {contract.pricing.advancePayment?.toFixed(2) || '0.00'} EUR
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Metoda Płatności</span>
                                        <span className="font-medium text-slate-800 capitalize">
                                            {contract.pricing.paymentMethod === 'cash' ? 'Gotówka' : 'Przelew'}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg mt-2">
                                {(() => {
                                    const netPrice = contract.pricing.finalPriceNet || contract.pricing.sellingPriceNet;
                                    const effectiveRate = netPrice > 0
                                        ? (contract.commission / netPrice) * 100
                                        : 0;
                                    return (
                                        <>
                                            <span className="text-green-800 font-medium">Prowizja ({effectiveRate.toFixed(1)}%)</span>
                                            <span className="font-bold text-green-700 text-lg">
                                                {contract.commission.toFixed(2)} EUR
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Installation Estimate Field */}
                            <div className="pt-3 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Szacowany czas montażu (dni)
                                    {isEditing && <span className="text-violet-600 ml-1 text-[10px] uppercase font-bold tracking-wider">(Dla Handlowca)</span>}
                                </label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min="1"
                                        max="14"
                                        value={contract.installation_days_estimate || 1}
                                        onChange={(e) => setContract({
                                            ...contract,
                                            installation_days_estimate: parseInt(e.target.value) || 1
                                        })}
                                        className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                ) : (
                                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium flex items-center justify-between">
                                        <span>{contract.installation_days_estimate || 1} dni</span>
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Comments & Attachments */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                        <h3 className="font-bold text-slate-800 mb-4">Komentarze</h3>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                            {contract.comments.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-8">Brak komentarzy</div>
                            )}
                            {contract.comments.map(comment => (
                                <div key={comment.id} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-700">{comment.author}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(comment.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Dodaj komentarz..."
                                className="flex-1 p-2 border rounded-lg text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            />
                            <button
                                onClick={handleAddComment}
                                className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Signed Contract & Installation Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Podpisana Umowa i Montaż
                        </h3>

                        <div className="space-y-4">
                            {/* PDF Upload */}
                            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-white transition-colors">
                                <label className="cursor-pointer block">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleSignedContractUpload}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <div className="font-bold text-slate-700">Wgraj podpisany skan (PDF)</div>
                                        <div className="text-xs text-slate-500">Kliknij aby wybrać plik</div>
                                    </div>
                                </label>
                            </div>

                            {/* Measurement Photos Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700">Zdjęcia z Pomiaru / Montażu</h4>
                                    <label className={`cursor-pointer px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                        {isUploading ? 'Wgrywanie...' : '+ Dodaj Zdjęcia'}
                                    </label>
                                </div>

                                {contract.attachments.filter(a => a.type === 'image').length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {contract.attachments.filter(a => a.type === 'image').map((photo, index) => {
                                            const allImages = contract.attachments.filter(a => a.type === 'image');
                                            const originalIndex = allImages.findIndex(img => img.id === photo.id);
                                            return (
                                                <div
                                                    key={photo.id}
                                                    className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                                                    onClick={() => setLightboxIndex(originalIndex)}
                                                >
                                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm">
                                        Brak zdjęć. Kliknij "+ Dodaj Zdjęcia" aby wgrać.
                                    </div>
                                )}
                            </div>

                            {/* Documents Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-700">Dokumenty / Pliki</h4>
                                    <label className={`cursor-pointer px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                            onChange={handleDocumentUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                        {isUploading ? 'Wgrywanie...' : '+ Dodaj Plik'}
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    {contract.attachments.filter(a => a.type === 'document').length === 0 && (
                                        <div className="text-center text-xs text-slate-400 italic">Brak dokumentów</div>
                                    )}
                                    {contract.attachments.filter(a => a.type === 'document').map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-2 rounded-lg flex-shrink-0 ${doc.name.toLowerCase().includes('podpisan') ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-sm font-bold text-slate-700 truncate" title={doc.name}>{doc.name}</div>
                                                    <div className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Otwórz / Pobierz"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Installation Status Card */}
                            <div className="pt-2 border-t border-slate-100">
                                {installation ? (
                                    <InstallationStatusCard
                                        installation={installation}
                                        team={teams.find(t => t.id === installation.teamId)}
                                        variant="full"
                                        onEdit={() => setIsInstallationModalOpen(true)}
                                        showCalendarLink={true}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handlePlanInstallation}
                                            disabled={contract.status !== 'signed'}
                                            title={contract.status !== 'signed' ? 'Podpisz umowę aby zaplanować montaż' : ''}
                                            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-white transition-colors ${contract.status === 'signed'
                                                ? 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
                                                : 'bg-slate-300 cursor-not-allowed'
                                                }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Utwórz Montaż
                                        </button>
                                        {contract.status !== 'signed' && (
                                            <div className="text-center text-xs text-slate-400">
                                                Wymagany status: Podpisana
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <OrderedItemsModule
                contract={contract}
                onUpdate={(items) => setContract({ ...contract, orderedItems: items })}
                isEditing={isEditing}
            />

            {installation && (
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
            )}

            {/* Lightbox Modal */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setLightboxIndex(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Navigation Buttons */}
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            const images = contract.attachments.filter(a => a.type === 'image');
                            setLightboxIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : 0);
                        }}
                    >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            const images = contract.attachments.filter(a => a.type === 'image');
                            setLightboxIndex((prev) => prev !== null ? (prev + 1) % images.length : 0);
                        }}
                    >
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <img
                        src={contract.attachments.filter(a => a.type === 'image')[lightboxIndex].url}
                        alt="Preview"
                        className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                        {lightboxIndex + 1} / {contract.attachments.filter(a => a.type === 'image').length}
                    </div>
                </div>
            )}
        </div>
    );
};
