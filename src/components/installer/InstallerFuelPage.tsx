import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { InstallerSessionService, type WorkSession, type InstallerVehicle } from '../../services/database/installer-session.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { FuelingType } from '../../types';

interface FuelEntry {
    id: string;
    date: string;
    vehiclePlate: string;
    liters: number;
    cost: number;
    odometer: number;
    odometerPhotoUrl?: string;
    receiptPhotoUrl?: string;
    sessionId?: string;
}

export const InstallerFuelPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [vehicles, setVehicles] = useState<InstallerVehicle[]>([]);
    const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
    const [fuelHistory, setFuelHistory] = useState<FuelEntry[]>([]);
    const [teamId, setTeamId] = useState<string | null>(null);

    // Form
    const [fuelingType, setFuelingType] = useState<FuelingType>('internal');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [liters, setLiters] = useState<number | ''>('');
    const [cost, setCost] = useState<number | ''>('');
    const [currency, setCurrency] = useState<'EUR' | 'PLN'>('EUR');
    const [odometer, setOdometer] = useState<number | ''>('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
    const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newPlate, setNewPlate] = useState('');
    const [newVehicleName, setNewVehicleName] = useState('');

    const odometerInputRef = useRef<HTMLInputElement>(null);
    const receiptInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        if (!currentUser) return;
        try {
            // Find user's team
            const teams = await InstallationTeamService.getTeams();
            const team = teams.find(t => t.members.some(m => m.id === currentUser.id));
            
            if (team) {
                setTeamId(team.id);

                // Load vehicles
                const teamVehicles = await InstallerSessionService.getTeamVehicles(team.id);
                setVehicles(teamVehicles);

                // Auto-select default or last used vehicle
                const defaultVehicle = teamVehicles.find(v => v.isDefault);
                const lastPlate = localStorage.getItem(`lastVehicle_${team.id}`);
                const lastUsed = lastPlate ? teamVehicles.find(v => v.licensePlate === lastPlate) : null;
                setSelectedVehicle((lastUsed || defaultVehicle || teamVehicles[0])?.licensePlate || '');

                // Load today's session
                const today = new Date().toISOString().split('T')[0];
                const sessions = await InstallerSessionService.getWeekSessions(team.id, today, today);
                const active = sessions.find(s => s.status === 'started' || s.status === 'created');
                setActiveSession(active || null);

                // Load fuel history
                const logs = await DatabaseService.getFuelLogs(currentUser.id);
                setFuelHistory(
                    (logs || [])
                        .filter((l: any) => l.type === 'installer')
                        .sort((a: any, b: any) => new Date(b.logDate || b.createdAt).getTime() - new Date(a.logDate || a.createdAt).getTime())
                        .slice(0, 20)
                        .map((l: any) => ({
                            id: l.id,
                            date: l.logDate || l.createdAt?.split('T')[0] || '',
                            vehiclePlate: l.vehiclePlate || '',
                            liters: l.liters || 0,
                            cost: l.cost || 0,
                            odometer: l.odometerReading || 0,
                            odometerPhotoUrl: l.odometerPhotoUrl,
                            receiptPhotoUrl: l.receiptPhotoUrl,
                        }))
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania danych');
        } finally {
            setLoading(false);
        }
    };

    const uploadPhoto = async (file: File, folder: string) => {
        const ext = file.name.split('.').pop();
        const path = `${folder}/${uuidv4()}.${ext}`;
        const { error } = await supabase.storage.from('fuel-logs').upload(path, file);
        if (error) throw error;
        return supabase.storage.from('fuel-logs').getPublicUrl(path).data.publicUrl;
    };

    const handleAddVehicle = async () => {
        if (!teamId || !newPlate.trim()) return;
        try {
            const vehicle = await InstallerSessionService.addVehicle(teamId, newPlate.trim().toUpperCase(), newVehicleName.trim() || undefined);
            setVehicles(prev => [...prev, vehicle]);
            setSelectedVehicle(vehicle.licensePlate);
            setShowAddVehicle(false);
            setNewPlate('');
            setNewVehicleName('');
            toast.success('Pojazd dodany');
        } catch (err) {
            console.error(err);
            toast.error('Błąd dodawania pojazdu');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        if (!selectedVehicle) {
            toast.error('Wybierz pojazd');
            return;
        }
        if (!liters) {
            toast.error('Uzupełnij litry');
            return;
        }
        if (fuelingType === 'external' && !cost) {
            toast.error('Podaj kwotę');
            return;
        }
        if (fuelingType === 'external' && !receiptPhoto) {
            toast.error('Dodaj zdjęcie paragonu');
            return;
        }

        setSaving(true);
        try {
            const odometerUrl = odometerPhoto ? await uploadPhoto(odometerPhoto, 'odometer') : undefined;
            const receiptUrl = receiptPhoto ? await uploadPhoto(receiptPhoto, 'receipts') : undefined;

            const { error } = await DatabaseService.createFuelLog({
                userId: currentUser.id,
                type: 'installer',
                fuelingType,
                vehiclePlate: selectedVehicle,
                odometerReading: Number(odometer) || 0,
                liters: Number(liters),
                cost: fuelingType === 'external' ? Number(cost) : undefined,
                netCost: fuelingType === 'external' ? Number(cost) : undefined,
                currency: fuelingType === 'external' ? currency : 'EUR',
                odometerPhotoUrl: odometerUrl,
                receiptPhotoUrl: receiptUrl,
                logDate: logDate,
            });

            if (error) throw error;

            // Link to active session if exists
            if (activeSession?.id) {
                await InstallerSessionService.updateFuel(
                    activeSession.id,
                    activeSession.fuelLiters + Number(liters),
                    activeSession.fuelCost + Number(cost)
                );
            }

            // Remember last vehicle
            if (teamId) {
                localStorage.setItem(`lastVehicle_${teamId}`, selectedVehicle);
            }

            toast.success('Tankowanie zapisane ⛽');

            // Reset form
            setLiters('');
            setCost('');
            setOdometer('');
            setOdometerPhoto(null);
            setReceiptPhoto(null);
            if (odometerInputRef.current) odometerInputRef.current.value = '';
            if (receiptInputRef.current) receiptInputRef.current.value = '';

            // Refresh data
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error('Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    // Month stats
    const monthTotal = fuelHistory
        .filter(f => f.date.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((acc, f) => ({ liters: acc.liters + f.liters, cost: acc.cost + f.cost }), { liters: 0, cost: 0 });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/installer" className="text-slate-400 hover:text-slate-600 p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-800">⛽ Tankowanie</h1>
                    <div className="w-6" />
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Month Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{monthTotal.liters.toFixed(1)}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Litry (ten miesiąc)</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                        <p className="text-2xl font-bold text-indigo-600">{monthTotal.cost.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">EUR (ten miesiąc)</p>
                    </div>
                </div>

                {/* Active session badge */}
                {activeSession && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-emerald-700 font-medium">
                            Sesja aktywna — tankowanie zostanie doliczone do dzisiejszych kosztów
                        </span>
                    </div>
                )}

                {/* Fuel Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Vehicle Selection */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="text-xl">🚐</span>
                            Pojazd
                        </h3>

                        {vehicles.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {vehicles.map(v => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setSelectedVehicle(v.licensePlate)}
                                            className={`p-3 rounded-xl border-2 transition-all text-left ${
                                                selectedVehicle === v.licensePlate
                                                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <p className="font-bold text-slate-800 text-sm tracking-wider">{v.licensePlate}</p>
                                            {v.vehicleName && (
                                                <p className="text-xs text-slate-400">{v.vehicleName}</p>
                                            )}
                                            {v.isDefault && (
                                                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full mt-1 inline-block">domyślny</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowAddVehicle(!showAddVehicle)}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                >
                                    + Dodaj nowy pojazd
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-400 mb-2">Brak pojazdów — dodaj pierwszy</p>
                                <button
                                    type="button"
                                    onClick={() => setShowAddVehicle(true)}
                                    className="text-sm text-indigo-600 font-medium"
                                >
                                    + Dodaj pojazd
                                </button>
                            </div>
                        )}

                        {/* Add Vehicle Form */}
                        {showAddVehicle && (
                            <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                                <input
                                    type="text"
                                    value={newPlate}
                                    onChange={e => setNewPlate(e.target.value.toUpperCase())}
                                    placeholder="Tablica (np. WA 12345)"
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                                <input
                                    type="text"
                                    value={newVehicleName}
                                    onChange={e => setNewVehicleName(e.target.value)}
                                    placeholder="Nazwa (opcjonalnie, np. Sprinter)"
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddVehicle}
                                        disabled={!newPlate.trim()}
                                        className="flex-1 bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                                    >
                                        Dodaj
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddVehicle(false); setNewPlate(''); setNewVehicleName(''); }}
                                        className="px-3 bg-white border border-slate-200 text-slate-500 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fuel Type Toggle */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="text-xl">💳</span>
                            Rodzaj tankowania
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFuelingType('internal')}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${
                                    fuelingType === 'internal'
                                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                                <span className="text-2xl block mb-1">💳</span>
                                <p className={`text-sm font-bold ${fuelingType === 'internal' ? 'text-blue-700' : 'text-slate-500'}`}>Karta firmowa</p>
                                <p className="text-[10px] text-slate-400">Wewnętrzne</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFuelingType('external')}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${
                                    fuelingType === 'external'
                                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                                <span className="text-2xl block mb-1">🧾</span>
                                <p className={`text-sm font-bold ${fuelingType === 'external' ? 'text-orange-700' : 'text-slate-500'}`}>Własne środki</p>
                                <p className="text-[10px] text-slate-400">Zewnętrzne</p>
                            </button>
                        </div>
                    </div>

                    {/* Fuel Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="text-xl">⛽</span>
                            Dane tankowania
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={logDate}
                                    onChange={e => setLogDate(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Litry *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={liters}
                                            onChange={e => setLiters(Number(e.target.value) || '')}
                                            step="0.01"
                                            min="0"
                                            placeholder="50.00"
                                            className="w-full p-3 pr-8 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                        />
                                        <span className="absolute right-3 top-3 text-slate-300 text-sm">L</span>
                                    </div>
                                </div>
                                {fuelingType === 'external' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Kwota netto *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={cost}
                                            onChange={e => setCost(Number(e.target.value) || '')}
                                            step="0.01"
                                            min="0"
                                            placeholder="85.00"
                                            className="w-full p-3 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                        />
                                        <span className="absolute right-3 top-3 text-slate-300 text-sm">{currency}</span>
                                    </div>
                                </div>
                                )}
                            </div>
                            {fuelingType === 'external' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Waluta</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrency('EUR')}
                                        className={`p-2 rounded-lg border-2 text-center text-sm font-bold transition-all ${
                                            currency === 'EUR' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'
                                        }`}
                                    >💶 EUR (€)</button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrency('PLN')}
                                        className={`p-2 rounded-lg border-2 text-center text-sm font-bold transition-all ${
                                            currency === 'PLN' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-100 text-slate-400'
                                        }`}
                                    >🇵🇱 PLN (zł)</button>
                                </div>
                            </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Przebieg (km)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={odometer}
                                        onChange={e => setOdometer(Number(e.target.value) || '')}
                                        min="0"
                                        placeholder="145 230"
                                        className="w-full p-3 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                    />
                                    <span className="absolute right-3 top-3 text-slate-300 text-sm">km</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Photos */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="text-xl">📸</span>
                            Zdjęcia
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Odometer Photo */}
                            <label className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                                odometerPhoto ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}>
                                {odometerPhoto ? (
                                    <>
                                        <img src={URL.createObjectURL(odometerPhoto)} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">✅ Licznik</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-[10px] text-slate-400 font-medium">Zdjęcie licznika</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    ref={odometerInputRef}
                                    onChange={e => e.target.files?.[0] && setOdometerPhoto(e.target.files[0])}
                                    className="hidden"
                                />
                            </label>

                            {/* Receipt Photo */}
                            <label className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                                receiptPhoto ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}>
                                {receiptPhoto ? (
                                    <>
                                        <img src={URL.createObjectURL(receiptPhoto)} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">✅ Paragon</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                        </svg>
                                        <span className="text-[10px] text-slate-400 font-medium">Zdjęcie paragonu</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    ref={receiptInputRef}
                                    onChange={e => e.target.files?.[0] && setReceiptPhoto(e.target.files[0])}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving || !selectedVehicle}
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Zapisywanie...
                            </>
                        ) : (
                            <>⛽ Zapisz tankowanie</>
                        )}
                    </button>
                </form>

                {/* History */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 text-sm">Historia tankowań</h3>
                    </div>
                    {fuelHistory.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">Brak historii</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {fuelHistory.map(entry => (
                                <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-lg">⛽</div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {entry.vehiclePlate}
                                                <span className="text-slate-400 ml-2">{entry.liters.toFixed(1)} L</span>
                                            </p>
                                            <p className="text-xs text-slate-400">{entry.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">{entry.cost.toFixed(2)} EUR</p>
                                        {entry.odometer > 0 && (
                                            <p className="text-[10px] text-slate-400">{entry.odometer.toLocaleString()} km</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
