import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getAllOffers } from '../../utils/storage';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { MeasurementReport, Visit, Offer } from '../../types';

export const ReportForm: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);

    // Report State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [carPlate, setCarPlate] = useState('');
    const [odometerStart, setOdometerStart] = useState<number | ''>('');
    const [odometerEnd, setOdometerEnd] = useState<number | ''>('');
    const [totalKmManual, setTotalKmManual] = useState<number | ''>(''); // Manual km input
    const [withDriver, setWithDriver] = useState(false);
    const [carIssues, setCarIssues] = useState('');
    const [reportDescription, setReportDescription] = useState(''); // Report-level description

    // Visits State
    const [visits, setVisits] = useState<Visit[]>([]);

    // Visit Form State (for adding new visit)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [visitOutcome, setVisitOutcome] = useState<Visit['outcome']>('measured');
    const [visitNotes, setVisitNotes] = useState('');

    // Linked Offers State (for associating multiple offers with this measurement day)
    const [selectedLinkedOffers, setSelectedLinkedOffers] = useState<Offer[]>([]);

    // Load offers for autocomplete
    useEffect(() => {
        const loadedOffers = getAllOffers();
        setOffers(loadedOffers);
        console.log('Loaded offers:', loadedOffers.length); // Debug
        if (loadedOffers.length === 0) {
            console.warn('No offers found in localStorage');
        }
        // const profile = getSalesProfile();
        // Could auto-fill car plate if stored in profile
    }, []);

    // Filter offers for autocomplete
    const filteredOffers = searchQuery.length > 1
        ? offers
            .filter(o => {
                const query = searchQuery.toLowerCase();
                const lastName = (o.customer.lastName || '').toString().toLowerCase();
                const city = (o.customer.city || '').toString().toLowerCase();
                return (
                    lastName.includes(query) ||
                    o.id.includes(searchQuery) ||
                    city.includes(query)
                );
            })
            .slice(0, 5)
        : [];

    const handleSelectOffer = (offer: Offer) => {
        setSelectedOffer(offer);
        setSearchQuery(`${offer.customer.firstName} ${offer.customer.lastName} (${offer.customer.city})`);
    };

    const handleAddVisit = () => {
        if (!selectedOffer && !searchQuery) {
            toast.error('Wybierz ofertę lub wpisz klienta');
            return;
        }

        const newVisit: Visit = {
            id: crypto.randomUUID(),
            offerId: selectedOffer?.id,
            customerName: selectedOffer
                ? `${selectedOffer.customer.firstName} ${selectedOffer.customer.lastName}`
                : searchQuery, // Manual entry if no offer selected
            address: selectedOffer
                ? `${selectedOffer.customer.street} ${selectedOffer.customer.houseNumber}, ${selectedOffer.customer.postalCode} ${selectedOffer.customer.city}`
                : 'Adres ręczny', // Placeholder or add field for manual address
            productSummary: selectedOffer
                ? `${selectedOffer.product.modelId} ${selectedOffer.product.width}x${selectedOffer.product.projection}`
                : 'Inne',
            price: selectedOffer ? selectedOffer.pricing.sellingPriceGross : 0,
            outcome: visitOutcome,
            notes: visitNotes
        };

        setVisits([...visits, newVisit]);

        // Reset visit form
        setSearchQuery('');
        setSelectedOffer(null);
        setVisitOutcome('measured');
        setVisitNotes('');
        toast.success('Wizyta dodana');
    };

    const handleRemoveVisit = (id: string) => {
        setVisits(visits.filter(v => v.id !== id));
    };

    const handleSubmit = async () => {
        if (!carPlate) {
            toast.error('Podaj numer rejestracyjny pojazdu');
            return;
        }

        // Calculate total km: either from odometer readings or manual input
        let calculatedTotalKm = 0;

        if (odometerStart !== '' && odometerEnd !== '') {
            const start = Number(odometerStart);
            const end = Number(odometerEnd);

            if (end < start) {
                toast.error('Stan końcowy nie może być mniejszy niż początkowy');
                return;
            }
            calculatedTotalKm = end - start;
        } else if (totalKmManual !== '') {
            calculatedTotalKm = Number(totalKmManual);
        } else {
            toast.error('Podaj liczbę kilometrów (licznik lub całkowite km)');
            return;
        }

        const start = odometerStart !== '' ? Number(odometerStart) : 0;
        const end = odometerEnd !== '' ? Number(odometerEnd) : 0;

        const report: MeasurementReport = {
            id: crypto.randomUUID(),
            date,
            salesRepId: currentUser?.id || 'unknown', // Assign to current user
            carPlate,
            odometerStart: start,
            odometerEnd: end,
            totalKm: calculatedTotalKm,
            withDriver,
            carIssues,
            reportDescription, // Add report description
            visits,
            signedContractsCount: visits.filter(v => v.outcome === 'signed').length,
            offerIds: selectedLinkedOffers.map(o => o.id), // Link selected offers
            createdAt: new Date()
        };

        try {
            await DatabaseService.createReport(report);
            toast.success('Raport zapisany');
            navigate('/reports');
        } catch (error) {
            console.error('Error saving report:', error);
            toast.error('Błąd zapisu raportu');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Nowy Raport Pomiarowy</h1>
                <button onClick={() => navigate('/reports')} className="text-slate-500 hover:text-slate-700">
                    Anuluj
                </button>
            </div>

            {/* Car & Trip Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Dane Trasy</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nr Rejestracyjny</label>
                        <input
                            type="text"
                            value={carPlate}
                            onChange={e => setCarPlate(e.target.value.toUpperCase())}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            placeholder="np. WZ 12345"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Licznik Start (km)</label>
                        <input
                            type="number"
                            value={odometerStart}
                            onChange={e => setOdometerStart(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Licznik Stop (km)</label>
                        <input
                            type="number"
                            value={odometerEnd}
                            onChange={e => setOdometerEnd(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={withDriver}
                                onChange={e => setWithDriver(e.target.checked)}
                                className="w-5 h-5 text-primary rounded"
                            />
                            <span className="text-slate-700">Jazda z kierowcą</span>
                        </label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Uwagi do auta (usterki, komunikaty)</label>
                        <textarea
                            value={carIssues}
                            onChange={e => setCarIssues(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            rows={2}
                            placeholder="Brak uwag"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            LUB: Całkowite km przejechane <span className="text-xs text-slate-500">(jeśli nie znasz stanu licznika)</span>
                        </label>
                        <input
                            type="number"
                            value={totalKmManual}
                            onChange={e => setTotalKmManual(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            placeholder="np. 120"
                            disabled={odometerStart !== '' && odometerEnd !== ''}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Krótki opis raportu (opcjonalnie)</label>
                        <textarea
                            value={reportDescription}
                            onChange={e => setReportDescription(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            rows={2}
                            placeholder="np. Wizyta w okolicach Berlina, 3 klientów podpisało umowy..."
                        />
                    </div>
                </div>
            </div>

            {/* Linked Offers Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Powiązane Oferty</h2>
                <p className="text-sm text-slate-600 mb-4">
                    Wybierz oferty, które będą przypisane do tego dnia pomiarowego
                </p>

                {/* Offer Selection Dropdown */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dodaj ofertę</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg"
                        onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) return;

                            const offer = offers.find(o => o.id === selectedId);
                            if (offer && !selectedLinkedOffers.find(o => o.id === offer.id)) {
                                setSelectedLinkedOffers([...selectedLinkedOffers, offer]);
                            }
                            e.target.value = ''; // Reset selection
                        }}
                    >
                        <option value="">-- Wybierz ofertę --</option>
                        {offers
                            .filter(o => !selectedLinkedOffers.find(sel => sel.id === o.id))
                            .map(offer => (
                                <option key={offer.id} value={offer.id}>
                                    {offer.customer.firstName} {offer.customer.lastName} - {offer.customer.city} (#{offer.id.slice(0, 8)})
                                </option>
                            ))
                        }
                    </select>
                </div>

                {/* Selected Offers List */}
                {selectedLinkedOffers.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Wybrane oferty ({selectedLinkedOffers.length}):</p>
                        {selectedLinkedOffers.map(offer => (
                            <div
                                key={offer.id}
                                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800">
                                        {offer.customer.firstName} {offer.customer.lastName}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {offer.customer.city} • {offer.product.modelId}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedLinkedOffers(selectedLinkedOffers.filter(o => o.id !== offer.id));
                                    }}
                                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Usuń"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {selectedLinkedOffers.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Brak przypisanych ofert</p>
                )}
            </div>

            {/* Debug info for offers */}
            {offers.length > 0 && (
                <div className="text-xs text-slate-500 bg-accent-soft/60 p-2 rounded">
                    Załadowano {offers.length} ofert do wyszukiwania
                </div>
            )}
            {offers.length === 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Brak ofert w systemie. Możesz wpisać dane klientów ręcznie.
                </div>
            )}

            {/* Visits List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Lista Wizyt / Pomiarów</h2>

                {/* Add Visit Form */}
                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-600 mb-3">Dodaj Wizytę</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Szukaj Klienta / Oferty</label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    if (selectedOffer) setSelectedOffer(null);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                placeholder="Wpisz nazwisko lub nr oferty..."
                            />
                            {/* Autocomplete Dropdown */}
                            {filteredOffers.length > 0 && !selectedOffer && (
                                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {filteredOffers.map(offer => (
                                        <div
                                            key={offer.id}
                                            onClick={() => handleSelectOffer(offer)}
                                            className="p-2 hover:bg-slate-50 cursor-pointer text-sm"
                                        >
                                            <div className="font-bold">{offer.customer.firstName} {offer.customer.lastName}</div>
                                            <div className="text-xs text-slate-500">{offer.product.modelId} | {offer.customer.city}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Wynik Wizyty</label>
                            <select
                                value={visitOutcome}
                                onChange={e => setVisitOutcome(e.target.value as Visit['outcome'])}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                            >
                                <option value="measured">Tylko Pomiar</option>
                                <option value="signed">Umowa Podpisana</option>
                                <option value="rejected">Odrzucone</option>
                                <option value="pending">Do Decyzji</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Notatki</label>
                            <input
                                type="text"
                                value={visitNotes}
                                onChange={e => setVisitNotes(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                placeholder="Np. Klient prosi o zmianę koloru..."
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleAddVisit}
                        className="mt-4 w-full py-2 bg-white border-2 border-dashed border-primary text-primary font-bold rounded-lg hover:bg-accent-soft/60 transition-colors"
                    >
                        + Dodaj do listy
                    </button>
                </div>

                {/* Visits Table */}
                {visits.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="p-3">Klient</th>
                                    <th className="p-3">Adres</th>
                                    <th className="p-3">Produkt</th>
                                    <th className="p-3">Wynik</th>
                                    <th className="p-3">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visits.map(visit => (
                                    <tr key={visit.id}>
                                        <td className="p-3 font-medium">{visit.customerName}</td>
                                        <td className="p-3 text-slate-500 truncate max-w-[150px]">{visit.address}</td>
                                        <td className="p-3 text-slate-500">{visit.productSummary}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                ${visit.outcome === 'signed' ? 'bg-green-100 text-green-700' :
                                                    visit.outcome === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-accent-soft text-accent-dark'}`}>
                                                {visit.outcome === 'signed' ? 'Umowa' :
                                                    visit.outcome === 'rejected' ? 'Odrzucone' :
                                                        visit.outcome === 'measured' ? 'Pomiar' : 'Decyzja'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleRemoveVisit(visit.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Usuń
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        Brak dodanych wizyt.
                    </div>
                )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
                <div className="text-right mr-4">
                    <p className="text-sm text-slate-500">Podpisane Umowy</p>
                    <p className="text-2xl font-bold text-green-600">{visits.filter(v => v.outcome === 'signed').length}</p>
                </div>
                <button
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-accent-dark transition-colors"
                >
                    Zapisz Raport
                </button>
            </div>
        </div>
    );
};
