import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FairService } from '../../services/database/fair.service';
import type { Fair, Prize } from '../../services/database/fair.service';

export const FairManagement: React.FC = () => {
    const [fairs, setFairs] = useState<Fair[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFair, setEditingFair] = useState<Fair | null>(null);
    const [stats, setStats] = useState<Record<string, { totalLeads: number, prizesWon: Record<string, number> } | null>>({});
    const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

    // Form State
    const [formData, setFormData] = useState<Partial<Fair>>({
        name: '',
        location: '',
        start_date: '',
        end_date: '',
        is_active: false,
        prizes_config: []
    });

    const [newPrize, setNewPrize] = useState<Partial<Prize>>({
        label: '',
        type: 'discount',
        value: 0,
        probability: 10
    });

    useEffect(() => {
        loadFairs();
    }, []);

    const loadFairs = async () => {
        try {
            const data = await FairService.getAllFairs();
            setFairs(data);
        } catch (error) {
            toast.error('Błąd ładowania targów');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingFair) {
                await FairService.updateFair(editingFair.id, formData);
                toast.success('Zaktualizowano targi');
            } else {
                await FairService.createFair(formData as any);
                toast.success('Utworzono targi');
            }
            setIsModalOpen(false);
            loadFairs();
        } catch (error) {
            toast.error('Błąd zapisu');
            console.error(error);
        }
    };

    const handleAddPrize = () => {
        if (!newPrize.label || !newPrize.value) return;
        setFormData(prev => ({
            ...prev,
            prizes_config: [...(prev.prizes_config || []), newPrize as Prize]
        }));
        setNewPrize({ label: '', type: 'discount', value: 0, probability: 10 });
    };

    const removePrize = (index: number) => {
        setFormData(prev => ({
            ...prev,
            prizes_config: prev.prizes_config?.filter((_, i) => i !== index)
        }));
    };

    const toggleStats = async (fairId: string) => {
        if (stats[fairId]) {
            // Toggle off (optional, or just leave it)
            // For now, let's just re-fetch to refresh, or we can add logic to hide.
            // Let's make it a toggle visibility if we have data, but always refresh if clicked?
            // Actually, simplest is: if not present, fetch. If present, maybe just show/hide?
            // Let's simple load.
        }

        setLoadingStats(prev => ({ ...prev, [fairId]: true }));
        try {
            const data = await FairService.getFairStatistics(fairId);
            setStats(prev => ({ ...prev, [fairId]: data }));
        } catch (error) {
            console.error(error);
            toast.error('Błąd pobierania statystyk');
        } finally {
            setLoadingStats(prev => ({ ...prev, [fairId]: false }));
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Zarządzanie Targami</h2>
                <button
                    onClick={() => {
                        setEditingFair(null);
                        setFormData({
                            name: '',
                            location: '',
                            start_date: new Date().toISOString().split('T')[0],
                            end_date: new Date().toISOString().split('T')[0],
                            is_active: true,
                            prizes_config: []
                        });
                        setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                >
                    + Dodaj Targi
                </button>
            </div>

            {isLoading ? (
                <div className="text-center text-slate-500 py-8">Ładowanie...</div>
            ) : (
                <div className="space-y-4">
                    {fairs.map(fair => (
                        <div key={fair.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-900">{fair.name}</h3>
                                        {fair.is_active ? (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">AKTYWNE</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">ZAKOŃCZONE</span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-sm mt-1">{fair.location} • {fair.start_date} - {fair.end_date}</p>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {fair.prizes_config?.map((prize, i) => (
                                            <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">
                                                {prize.label} ({prize.probability}%)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingFair(fair);
                                            setFormData(fair);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-accent transition-colors"
                                    >
                                        Edytuj
                                    </button>
                                </div>
                            </div>

                            <div className="mt-2 mb-2">
                                <a
                                    href="/fairs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center py-2 px-4 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors text-sm border border-indigo-100"
                                >
                                    Otwórz Panel (Testuj) ↗
                                </a>
                            </div>

                            {/* Stats Section */}
                            <div className="mt-4 border-t border-slate-100 pt-3">
                                {!stats[fair.id] ? (
                                    <button
                                        onClick={() => toggleStats(fair.id)}
                                        disabled={loadingStats[fair.id]}
                                        className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-2"
                                    >
                                        {loadingStats[fair.id] ? (
                                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        )}
                                        Pokaż statystyki
                                    </button>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Total Leads */}
                                            <div className="text-center md:text-left">
                                                <div className="text-3xl font-bold text-slate-800">{stats[fair.id]?.totalLeads}</div>
                                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Zebranych Leadów</div>
                                            </div>

                                            {/* Prize Distribution */}
                                            <div className="col-span-2">
                                                <h4 className="text-sm font-bold text-slate-700 mb-2">Rozkład Nagród</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {Object.entries(stats[fair.id]?.prizesWon || {}).map(([label, count]) => (
                                                        <div key={label} className="bg-white px-3 py-2 rounded border border-slate-200 text-sm flex justify-between items-center">
                                                            <span className="text-slate-600 truncate mr-2" title={label}>{label}</span>
                                                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 rounded">{count}</span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(stats[fair.id]?.prizesWon || {}).length === 0 && (
                                                        <div className="text-sm text-slate-400 italic col-span-full">Brak wygranych nagród.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setStats(prev => {
                                                const next = { ...prev };
                                                delete next[fair.id];
                                                return next;
                                            })}
                                            className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline"
                                        >
                                            Ukryj statystyki
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {fairs.length === 0 && (
                        <div className="text-center text-slate-400 py-8 italic">Brak skonfigurowanych targów.</div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingFair ? 'Edytuj Targi' : 'Nowe Targi'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa wydarzenia</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    placeholder="np. Targi Budma 2026"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Od</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Do</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lokalizacja</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                    placeholder="np. Poznań"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-accent rounded"
                                />
                                <label className="text-sm font-medium text-slate-700">Wydarzenie Aktywne (widoczne dla handlowców)</label>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-4">
                                <h4 className="font-bold text-slate-800 mb-2">Konfiguracja Koła Fortuny (Nagrody)</h4>
                                <div className="flex gap-2 mb-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-500">Nazwa nagrody</label>
                                        <input
                                            type="text"
                                            value={newPrize.label}
                                            onChange={e => setNewPrize({ ...newPrize, label: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                            placeholder="np. Rabat 5%"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-slate-500">Wartość</label>
                                        <input
                                            type="text"
                                            value={newPrize.value}
                                            onChange={e => setNewPrize({ ...newPrize, value: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-slate-500">Szansa (%)</label>
                                        <input
                                            type="number"
                                            value={newPrize.probability}
                                            onChange={e => setNewPrize({ ...newPrize, probability: Number(e.target.value) })}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddPrize}
                                        className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900"
                                    >
                                        Dodaj
                                    </button>
                                </div>
                                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                                    {formData.prizes_config?.map((prize, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-sm">
                                            <span>{prize.label} (Wartość: {prize.value}, Szansa: {prize.probability}%)</span>
                                            <button onClick={() => removePrize(idx)} className="text-red-500 hover:text-red-700">Usuń</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark"
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
