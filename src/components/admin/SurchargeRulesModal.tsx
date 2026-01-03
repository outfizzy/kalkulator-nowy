import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface SurchargeRule {
    width: number;
    price: number;
}

interface Configuration {
    free_standing_surcharge?: SurchargeRule[];
    [key: string]: any;
}

interface SurchargeRulesModalProps {
    tableId: string;
    tableName: string;
    initialConfig: Configuration;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    productId?: string;
    productName?: string;
}

export const SurchargeRulesModal: React.FC<SurchargeRulesModalProps> = ({
    tableId,
    tableName,
    initialConfig,
    isOpen,
    onClose,
    onSave,
    productId,
    productName
}) => {
    const [config, setConfig] = useState<Configuration>(initialConfig || {});
    const [rules, setRules] = useState<SurchargeRule[]>(initialConfig?.free_standing_surcharge || []);
    const [saving, setSaving] = useState(false);
    const [applyToAll, setApplyToAll] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConfig(initialConfig || {});
            setRules(initialConfig?.free_standing_surcharge || []);
        }
    }, [isOpen, initialConfig]);

    const handleAddRule = () => {
        setRules([...rules, { width: 0, price: 0 }]);
    };

    const handleUpdateRule = (index: number, field: keyof SurchargeRule, value: string) => {
        const newRules = [...rules];
        const numVal = parseFloat(value) || 0;
        newRules[index] = { ...newRules[index], [field]: numVal };
        setRules(newRules);
    };

    const handleRemoveRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Sort rules by width for consistent logic
            const sortedRules = [...rules].sort((a, b) => a.width - b.width);

            // Clean up: remove empty/invalid rules
            const validRules = sortedRules.filter(r => r.width > 0);

            const newConfig = {
                ...config,
                free_standing_surcharge: validRules.length > 0 ? validRules : undefined
            };

            if (applyToAll && productId) {
                // Bulk update all tables for this product
                const { error } = await supabase
                    .from('price_tables')
                    .update({ configuration: newConfig })
                    .eq('product_definition_id', productId);

                if (error) throw error;
                toast.success(`Zaktualizowano reguły dla wszystkich cenników ${productName}`);
            } else {
                // Single update
                const { error } = await supabase
                    .from('price_tables')
                    .update({ configuration: newConfig })
                    .eq('id', tableId);

                if (error) throw error;
                toast.success('Zapisano reguły');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Błąd zapisu: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Reguły Dodatkowe</h3>
                        <p className="text-xs text-slate-500">Cennik: {tableName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50">
                    <div className="space-y-6">
                        {/* Free Standing Surcharge Section */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                                🏠 Dopłata: Konstrukcja Wolnostojąca
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">
                                Zdefiniuj tabelę dopłat dla konstrukcji wolnostojącej w zależności od szerokości.
                                System dobierze pierwszą wartość, która jest wystarczająca (Next Size Up).
                            </p>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="p-2 text-left">Szerokość (mm)</th>
                                            <th className="p-2 text-left">Dopłata (€)</th>
                                            <th className="p-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rules.map((rule, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50">
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={rule.width || ''}
                                                        onChange={(e) => handleUpdateRule(idx, 'width', e.target.value)}
                                                        placeholder="np. 4000"
                                                        className="w-full p-1 border rounded focus:border-blue-500 outline-none"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={rule.price || ''}
                                                            onChange={(e) => handleUpdateRule(idx, 'price', e.target.value)}
                                                            placeholder="np. 250"
                                                            className="w-full p-1 pl-6 border rounded focus:border-green-500 outline-none font-medium text-slate-700"
                                                        />
                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">€</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveRule(idx)}
                                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Usuń wiersz"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {rules.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-slate-400 text-xs italic">
                                                    Brak zdefiniowanych reguł. Kliknij "Dodaj wiersz".
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={handleAddRule}
                                className="mt-3 w-full py-2 border border-dashed border-slate-300 text-slate-500 text-xs rounded hover:bg-slate-50 hover:border-slate-400 transition-colors"
                            >
                                + Dodaj wiersz (Szerokość &rarr; Cena)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-between items-center gap-3 bg-white">
                    <div className="flex items-center">
                        {productId && (
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                                <input
                                    type="checkbox"
                                    checked={applyToAll}
                                    onChange={(e) => setApplyToAll(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Zastosuj do wszystkich cenników <strong>{productName}</strong></span>
                            </label>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors ${applyToAll ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} disabled:opacity-70`}
                        >
                            {saving ? (
                                <>
                                    <span className="animate-spin">⏳</span> Zapisywanie...
                                </>
                            ) : (
                                <>
                                    {applyToAll ? '💾 Zapisz dla WSZYSTKICH' : '💾 Zapisz Reguły'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
