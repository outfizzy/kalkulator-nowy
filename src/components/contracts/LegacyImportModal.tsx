import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ContractService } from '../../services/database/contract.service';
import { OfferService } from '../../services/database/offer.service';
import { CustomerService } from '../../services/database/customer.service';
import type { Customer } from '../../types';

interface LegacyImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LegacyImportModal: React.FC<LegacyImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [contractNumber, setContractNumber] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Extended Fields
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Ensure Customer
            const customerInput: Customer = {
                salutation: companyName ? 'Firma' : 'Herr',
                companyName: companyName,
                firstName: firstName,
                lastName: lastName,
                street: street || 'Nieznana 1',
                houseNumber: houseNumber || '',
                postalCode: postalCode || '00-000',
                city: city || 'Nieznane',
                phone: phone || '',
                email: email || '',
                country: 'Deutschland'
            };
            const customer = await CustomerService.ensureCustomerSecure(customerInput);

            // 2. Create "Shadow" Offer (Sold)
            const offer = await OfferService.createLegacyOffer(customer.id!, price, new Date(date));

            // 3. Create Contract (with specific number)
            await ContractService.createContract({
                offerId: offer.id,
                contractNumber: contractNumber, // Manual Override
                client: customer,
                product: offer.product,
                pricing: offer.pricing,
                status: 'signed',
                commission: 0,
                requirements: { constructionProject: false, powerSupply: false, foundation: false },
                comments: [],
                attachments: [],
                orderedItems: [],
                signedAt: new Date(date),
                signedBy: undefined // Or current user
            } as any);

            toast.success('Umowa archiwalna zaimportowana!');
            onSuccess();
            onClose();

            // Reset form
            setFirstName('');
            setLastName('');
            setCompanyName('');
            setContractNumber('');
            setPrice(0);
            setEmail('');
            setPhone('');
            setStreet('');
            setHouseNumber('');
            setPostalCode('');
            setCity('');

        } catch (error) {
            console.error('Import Fail:', error);
            toast.error('Błąd importu umowy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800">Import Archiwalnej Umowy</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 mb-4">
                        To narzędzie służy do ręcznego wprowadzenia "starych" umów.
                        System automatycznie stworzy Klienta, Ofertę (Sold) i Umowę.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Imię</label>
                            <input
                                required
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko</label>
                            <input
                                required
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Firma (opcjonalnie)</label>
                        <input
                            className="w-full border border-slate-300 rounded p-2 text-sm"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                            <input
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Ulica</label>
                            <input
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={street}
                                onChange={e => setStreet(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nr Domu</label>
                            <input
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={houseNumber}
                                onChange={e => setHouseNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Kod Pocztowy</label>
                            <input
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={postalCode}
                                onChange={e => setPostalCode(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Miasto</label>
                            <input
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Numer Umowy</label>
                            <input
                                required
                                placeholder="np. UM/2024/001"
                                className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                                value={contractNumber}
                                onChange={e => setContractNumber(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Data Podpisania</label>
                            <input
                                required
                                type="date"
                                className="w-full border border-slate-300 rounded p-2 text-sm"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Kwota Brutto (EUR)</label>
                        <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full border border-slate-300 rounded p-2 text-sm font-bold"
                            value={price}
                            onChange={e => setPrice(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Anuluj</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50"
                        >
                            {loading ? 'Importowanie...' : 'Importuj Umowę'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
