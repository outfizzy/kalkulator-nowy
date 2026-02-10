import React, { useEffect, useState } from 'react';
import { FuelPriceService, type FuelPrice } from '../../services/fuel-price.service';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';

export const FuelPriceManager: React.FC = () => {
    const [prices, setPrices] = useState<FuelPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        price_per_liter: '',
        valid_from: '',
        valid_to: ''
    });

    useEffect(() => {
        loadPrices();
    }, []);

    const loadPrices = async () => {
        try {
            const data = await FuelPriceService.getPrices();
            setPrices(data);
        } catch (error) {
            console.error('Error loading prices:', error);
            toast.error('Błąd ładowania cen');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const price = parseFloat(formData.price_per_liter);
            if (isNaN(price) || price <= 0) {
                toast.error('Podaj prawidłową cenę');
                return;
            }

            if (!formData.valid_from) {
                toast.error('Podaj datę rozpoczęcia');
                return;
            }

            await FuelPriceService.addPrice({
                price_per_liter: price,
                valid_from: formData.valid_from,
                valid_to: formData.valid_to || null
            });

            toast.success('Cena dodana!');
            setFormData({ price_per_liter: '', valid_from: '', valid_to: '' });
            setShowAddForm(false);
            loadPrices();
        } catch (error: any) {
            console.error('Error adding price:', error);
            if (error.message?.includes('overlapping')) {
                toast.error('Okresy nie mogą się nakładać');
            } else {
                toast.error('Błąd dodawania ceny');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Czy na pewno chcesz usunąć tę cenę?')) return;

        try {
            await FuelPriceService.deletePrice(id);
            toast.success('Cena usunięta');
            loadPrices();
        } catch (error) {
            console.error('Error deleting price:', error);
            toast.error('Błąd usuwania ceny');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ceny Paliwa</h1>
                    <p className="text-slate-500 text-sm">Zarządzaj cenami paliwa dla różnych okresów</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {showAddForm ? 'Anuluj' : '+ Dodaj Cenę'}
                </button>
            </div>

            {/* Add Price Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Dodaj Nową Cenę</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Cena za litr (PLN) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_liter}
                                    onChange={(e) => setFormData({ ...formData, price_per_liter: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="6.50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Obowiązuje od <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Obowiązuje do <span className="text-slate-400 text-xs">(opcjonalnie)</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.valid_to}
                                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Pozostaw puste dla "do odwołania"</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({ price_per_liter: '', valid_from: '', valid_to: '' });
                                }}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Zapisz
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Prices Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Obowiązuje od</th>
                                <th className="px-4 py-3">Obowiązuje do</th>
                                <th className="px-4 py-3">Cena za litr</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {prices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        Brak zdefiniowanych cen. Dodaj pierwszą cenę.
                                    </td>
                                </tr>
                            ) : (
                                prices.map((price) => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const isActive = price.valid_from <= today && (!price.valid_to || price.valid_to >= today);

                                    return (
                                        <tr key={price.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                {format(new Date(price.valid_from), 'dd MMM yyyy', { locale: pl })}
                                            </td>
                                            <td className="px-4 py-3">
                                                {price.valid_to
                                                    ? format(new Date(price.valid_to), 'dd MMM yyyy', { locale: pl })
                                                    : <span className="text-slate-400">Do odwołania</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600">
                                                {price.price_per_liter.toFixed(2)} PLN
                                            </td>
                                            <td className="px-4 py-3">
                                                {isActive ? (
                                                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                        Aktywna
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                                                        Nieaktywna
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDelete(price.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Usuń
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Jak to działa?</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>Koszt tankowania jest automatycznie przeliczany na podstawie ceny z danego okresu</li>
                            <li>Okresy nie mogą się nakładać</li>
                            <li>Jeśli nie podasz daty końcowej, cena będzie obowiązywać "do odwołania"</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
