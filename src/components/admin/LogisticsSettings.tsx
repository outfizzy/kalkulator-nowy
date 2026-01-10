import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { TransportSettings, InstallationSettings } from '../../types';

export const LogisticsSettingsManager = () => {
    const [transportSettings, setTransportSettings] = useState<TransportSettings | null>(null);
    const [installationSettings, setInstallationSettings] = useState<InstallationSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'transport' | 'installation'>('transport');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const [tSettings, iSettings] = await Promise.all([
                DatabaseService.getTransportSettings(),
                DatabaseService.getInstallationSettings()
            ]);
            setTransportSettings(tSettings);
            setInstallationSettings(iSettings);
        } catch (error) {
            console.error('Error loading logistics settings:', error);
            toast.error('Nie udało się pobrać ustawień logistycznych');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTransport = async () => {
        if (!transportSettings) return;

        setSaving(true);
        try {
            await DatabaseService.updateTransportSettings(transportSettings);
            toast.success('Zapisano ustawienia transportu');
        } catch (error) {
            console.error('Error saving transport settings:', error);
            toast.error('Błąd podczas zapisywania transportu');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveInstallation = async () => {
        if (!installationSettings) return;

        setSaving(true);
        try {
            await DatabaseService.updateInstallationSettings(installationSettings);
            toast.success('Zapisano ustawienia montażu');
        } catch (error) {
            console.error('Error saving installation settings:', error);
            toast.error('Błąd podczas zapisywania montażu');
        } finally {
            setSaving(false);
        }
    };

    const handleTransportChange = (field: string, value: any) => {
        if (!transportSettings) return;
        setTransportSettings({ ...transportSettings, [field]: value });
    };

    const handleLocationChange = (field: string, value: any) => {
        if (!transportSettings) return;
        setTransportSettings({
            ...transportSettings,
            baseLocation: {
                ...transportSettings.baseLocation,
                [field]: value
            }
        });
    };

    const handleInstallationChange = (field: keyof InstallationSettings, value: any) => {
        if (!installationSettings) return;
        setInstallationSettings({ ...installationSettings, [field]: value });
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Ładowanie ustawień...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Header / Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    📦 Konfiguracja Logistyki i Montażu
                </h2>
                <div className="flex bg-slate-200 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('transport')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'transport'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        🚛 Transport
                    </button>
                    <button
                        onClick={() => setActiveTab('installation')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'installation'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        🛠️ Montaż
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'transport' && transportSettings ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Stawka za kilometr (EUR)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={transportSettings.ratePerKm}
                                    onChange={(e) => handleTransportChange('ratePerKm', parseFloat(e.target.value))}
                                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                />
                                <span className="text-slate-500 text-sm">per km (one way)</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Stawka stosowana do obliczania kosztów dojazdu w ofertach (netto). System automatycznie dolicza 20% do dystansu w linii prostej.
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Baza Logistyczna (Lokalizacja Startowa)</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Miasto
                                    </label>
                                    <input
                                        type="text"
                                        value={transportSettings.baseLocation.name}
                                        onChange={(e) => handleLocationChange('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Kod Pocztowy
                                    </label>
                                    <input
                                        type="text"
                                        value={transportSettings.baseLocation.postalCode}
                                        onChange={(e) => handleLocationChange('postalCode', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Szerokość geograficzna (Lat)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={transportSettings.baseLocation.lat}
                                        onChange={(e) => handleLocationChange('lat', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Długość geograficzna (Lng)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={transportSettings.baseLocation.lng}
                                        onChange={(e) => handleLocationChange('lng', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Współrzędne geograficzne są używane do obliczania dystansu. Możesz je znaleźć w Mapach Google.
                            </p>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveTransport}
                                disabled={saving}
                                className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Zapisywanie...' : 'Zapisz Ustawienia Transportu'}
                            </button>
                        </div>
                    </div>
                ) : null}

                {activeTab === 'installation' && installationSettings ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800 mb-6">
                            <p><strong>Zasada działania:</strong> System oblicza koszt montażu mnożąc liczbę dni (zależną od typu i rozmiaru produktu) przez stawkę dzienną. Dojazd zespołów jest liczony osobno na podstawie logistyki.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Stawka Dzienna Zespołu (EUR)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={installationSettings.baseRatePerDay}
                                        onChange={(e) => handleInstallationChange('baseRatePerDay', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                    <div className="text-slate-400 text-xs whitespace-nowrap">
                                        (Netto)
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Bazowa stawka za jeden dzień pracy dwuosobowego zespołu.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Min. Kwota Montażu (EUR)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={installationSettings.minInstallationCost}
                                        onChange={(e) => handleInstallationChange('minInstallationCost', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Minimalny koszt montażu, niezależnie od liczby dni.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveInstallation}
                                disabled={saving}
                                className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Zapisywanie...' : 'Zapisz Ustawienia Montażu'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
