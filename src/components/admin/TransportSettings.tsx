import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import type { TransportSettings } from '../../types';

export const TransportSettingsManager = () => {
    const [settings, setSettings] = useState<TransportSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getTransportSettings();
            setSettings(data);
        } catch (error) {
            console.error('Error loading transport settings:', error);
            toast.error('Nie udało się pobrać ustawień transportu');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await DatabaseService.updateTransportSettings(settings);
            toast.success('Zapisano ustawienia transportu');
        } catch (error) {
            console.error('Error saving transport settings:', error);
            toast.error('Błąd podczas zapisywania ustawień');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        if (!settings) return;
        setSettings({ ...settings, [field]: value });
    };

    const handleLocationChange = (field: string, value: any) => {
        if (!settings) return;
        setSettings({
            ...settings,
            baseLocation: {
                ...settings.baseLocation,
                [field]: value
            }
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Ładowanie ustawień...</div>;
    }

    if (!settings) {
        return <div className="p-8 text-center text-red-500">Błąd ładowania danych</div>;
    }

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                🚛 Konfiguracja Transportu
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Stawka za kilometr (EUR)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings.ratePerKm}
                            onChange={(e) => handleChange('ratePerKm', parseFloat(e.target.value))}
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
                                value={settings.baseLocation.name}
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
                                value={settings.baseLocation.postalCode}
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
                                value={settings.baseLocation.lat}
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
                                value={settings.baseLocation.lng}
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
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Zapisywanie...' : 'Zapisz Ustawienia'}
                    </button>
                </div>
            </div>
        </div>
    );
};
