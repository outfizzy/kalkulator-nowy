import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../services/database/settings.service';

export const GlobalSettingsPanel: React.FC = () => {
    const [eurRate, setEurRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const rate = await SettingsService.getEurRate();
            setEurRate(rate);
        } catch (err) {
            console.error('Error loading settings:', err);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (eurRate === null) return;

        try {
            setSaving(true);
            setError(null);
            await SettingsService.updateEurRate(eurRate);
            alert('Settings saved successfully');
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-4">Global System Settings</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        EUR Exchange Rate (PLN)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={eurRate ?? ''}
                            onChange={(e) => setEurRate(parseFloat(e.target.value) || 0)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        />
                        <span className="text-gray-500">PLN</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Used for converting EUR costs to PLN in profitability calculations.
                    </p>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};
