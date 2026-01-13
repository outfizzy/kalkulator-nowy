import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateInstallationProtocolPDF } from '../../utils/installationProtocolPDF';
import { PhotoGallery } from '../PhotoGallery';
import { getOfferPhotos, addOfferPhoto, removeOfferPhoto } from '../../utils/offerPhotos';
import type { Contract, ContractComment, ContractAttachment, User } from '../../types';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { InstallationService } from '../../services/database/installation.service';
import { UserService } from '../../services/database/user.service';
import { useAuth } from '../../contexts/AuthContext';
import { OrderedItemsModule } from './OrderedItemsModule';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';
import type { Installation } from '../../types';

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

    const [salesReps, setSalesReps] = useState<User[]>([]);

    useEffect(() => {
        if (!id) return;

        const loadContract = async () => {
            try {
                const contracts = await DatabaseService.getContracts();
                const found = contracts.find(c => c.id === id);
                if (found) {
                    setContract(found);
                    setPhotos(getOfferPhotos(found.offerId));

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
        loadContract();

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!contract || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        // Simulate file upload
        const attachment: ContractAttachment = {
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file), // Temporary local URL
            type: file.type.startsWith('image/') ? 'image' : 'document',
            createdAt: new Date()
        };

        const updatedContract: Contract = {
            ...contract,
            attachments: [...contract.attachments, attachment]
        };

        setContract(updatedContract);
        try {
            await DatabaseService.updateContract(updatedContract.id, updatedContract);
            toast.success('Dodano załącznik');
        } catch (error) {
            console.error('Error updating contract with attachment:', error);
            toast.error('Błąd dodawania załącznika');
        }
    };

    const handleSignedContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!contract || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            toast.error('Tylko pliki PDF są dozwolone dla umowy');
            return;
        }

        // Simulate file upload - in real app upload to storage
        const attachment: ContractAttachment = {
            id: crypto.randomUUID(),
            name: `UMOWA POPDISANA - ${file.name}`,
            url: URL.createObjectURL(file), // Temporary local URL
            type: 'document',
            createdAt: new Date()
        };

        const updatedContract: Contract = {
            ...contract,
            attachments: [...contract.attachments, attachment],
            status: 'signed', // Auto-mark as signed when contract uploaded
            signedAt: new Date() // Set signed date
        };

        setContract(updatedContract);
        try {
            await DatabaseService.updateContract(updatedContract.id, updatedContract);
            toast.success('Wgrano podpisaną umowę');
        } catch (error) {
            console.error('Error updating contract with signed pdf:', error);
            toast.error('Błąd zapisu');
        }
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
                        <h1 className="text-2xl font-bold text-slate-800">Umowa {contract.contractNumber}</h1>
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
                    <p className="text-slate-500 ml-9 mt-1">Utworzono: {new Date(contract.createdAt).toLocaleDateString()}</p>
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

                            {/* Show uploaded signed contracts */}
                            {contract.attachments.filter(a => a.name.includes('UMOWA') || a.name.includes('podpisan')).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Wgrane dokumenty:</h4>
                                    {contract.attachments.filter(a => a.name.includes('UMOWA') || a.name.includes('podpisan')).map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded text-green-800 text-sm">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="truncate max-w-[180px]">{att.name}</span>
                                            </div>
                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline text-xs font-bold">Pobierz</a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Installation Button */}
                            <div className="pt-2 border-t border-slate-100">
                                {installation ? (
                                    <button
                                        onClick={() => setIsInstallationModalOpen(true)}
                                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 p-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Zarządzaj Montażem
                                    </button>
                                ) : (
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
                                )}
                                {contract.status !== 'signed' && !installation && (
                                    <div className="text-center text-xs text-slate-400 mt-2">
                                        Wymagany status: Podpisana
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Photos Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Zdjęcia</h3>
                            <label className="cursor-pointer text-accent hover:text-accent-dark text-sm font-bold flex items-center gap-1">
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
                                                addOfferPhoto(contract.offerId, imageData);
                                                setPhotos(getOfferPhotos(contract.offerId));
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                        e.target.value = '';
                                        toast.success('Dodano zdjęcia');
                                    }}
                                    className="hidden"
                                />
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Dodaj
                            </label>
                        </div>
                        <PhotoGallery
                            photos={photos}
                            onDelete={(index) => {
                                removeOfferPhoto(contract.offerId, index);
                                setPhotos(getOfferPhotos(contract.offerId));
                                toast.success('Usunięto zdjęcie');
                            }}
                        />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Załączniki</h3>
                            <label className="cursor-pointer text-accent hover:text-accent-dark text-sm font-bold flex items-center gap-1">
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Dodaj
                            </label>
                        </div>
                        <div className="space-y-2">
                            {contract.attachments.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-4">Brak załączników</div>
                            )}
                            {contract.attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50 group">
                                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                                        {att.type === 'image' ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800 truncate">{att.name}</div>
                                        <div className="text-xs text-slate-500">{new Date(att.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <a href={att.url} download={att.name} className="text-slate-400 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </a>
                                </div>
                            ))}
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
        </div >
    );
};
