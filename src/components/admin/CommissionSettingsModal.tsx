import React, { useState, useEffect } from 'react';
import type { User, CommissionConfig } from '../../types';
import { toast } from 'react-hot-toast';

interface CommissionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (userId: string, rate: number, config: CommissionConfig) => Promise<void>;
}

export const CommissionSettingsModal: React.FC<CommissionSettingsModalProps> = ({
    isOpen,
    onClose,
    user,
    onSave
}) => {
    const [rate, setRate] = useState<number>(5);
    const [enableMarginBonus, setEnableMarginBonus] = useState<boolean>(false);
    const [enableVolumeBonus, setEnableVolumeBonus] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setRate(user.commissionRate ? user.commissionRate * 100 : 5);
            setEnableMarginBonus(user.commissionConfig?.enableMarginBonus || false);
            setEnableVolumeBonus(user.commissionConfig?.enableVolumeBonus || false);
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(user.id, rate / 100, {
                enableMarginBonus,
                enableVolumeBonus
            });
            toast.success('Zapisano ustawienia prowizji');
            onClose();
        } catch (error) {
            console.error('Error saving commission settings:', error);
            toast.error('Błąd zapisu ustawień');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900">
                        Ustawienia Prowizji
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-slate-500 mb-4">
                            Konfiguracja dla: <span className="font-semibold text-slate-900">{user.firstName} {user.lastName}</span>
                        </p>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Prowizja bazowa (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={rate}
                                    onChange={(e) => setRate(parseFloat(e.target.value))}
                                    className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                    %
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-900">Bonusy</h4>

                        <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={enableMarginBonus}
                                onChange={(e) => setEnableMarginBonus(e.target.checked)}
                                className="mt-1 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                            />
                            <div>
                                <span className="block text-sm font-medium text-slate-900">Bonus za wysoką marżę</span>
                                <span className="block text-xs text-slate-500 mt-0.5">
                                    Dodatkowe 1% za każde 10% marży powyżej 30%
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={enableVolumeBonus}
                                onChange={(e) => setEnableVolumeBonus(e.target.checked)}
                                className="mt-1 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                            />
                            <div>
                                <span className="block text-sm font-medium text-slate-900">Bonus za wolumen</span>
                                <span className="block text-xs text-slate-500 mt-0.5">
                                    Dodatkowe 0.5% - 1.5% w zależności od liczby sprzedanych ofert
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            Zapisz zmiany
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
