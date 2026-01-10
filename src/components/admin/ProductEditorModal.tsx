import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { PricingService } from '../../services/pricing.service';
import { X, Save, Image as ImageIcon, Palette, AlertCircle, Upload } from 'lucide-react';

interface ProductEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string; // The name we are editing (might not have ID yet if manual)
    onSuccess: () => void;
}

interface ProductConfiguration {
    freestanding_is_additive?: boolean;
    freestanding_surcharge_rules?: { max_width: number, price: number }[];
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({ isOpen, onClose, productName, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<{
        id: string;
        name: string;
        code: string;
        image_url: string;
        standard_colors: string;
        custom_color_surcharge_percentage: number;
        configuration: ProductConfiguration;
    }>({
        id: '',
        name: '',
        code: '',
        image_url: '',
        standard_colors: 'RAL 7016, RAL 9005, RAL 9016',
        custom_color_surcharge_percentage: 0,
        configuration: {
            freestanding_is_additive: false,
            freestanding_surcharge_rules: []
        }
    });

    useEffect(() => {
        if (isOpen && productName) {
            loadProductData();
        }
    }, [isOpen, productName]);

    const loadProductData = async () => {
        setLoading(true);
        try {
            const products = await PricingService.getMainProducts();
            const existing = products.find(p => p.name === productName || p.code === productName);

            if (existing && existing.id) {
                setFormData({
                    id: existing.id,
                    name: existing.name,
                    code: existing.code,
                    image_url: existing.image_url || '',
                    standard_colors: existing.standard_colors?.join(', ') || 'RAL 7016, RAL 9005, RAL 9016',
                    custom_color_surcharge_percentage: existing.custom_color_surcharge_percentage || 0,
                    configuration: existing.configuration || { freestanding_is_additive: false, freestanding_surcharge_rules: [] }
                });
            } else {
                // Initialize new based on name
                setFormData({
                    id: '',
                    name: productName,
                    code: productName.toLowerCase().replace(/\s+/g, '_'),
                    image_url: '',
                    standard_colors: 'RAL 7016, RAL 9005, RAL 9016',
                    custom_color_surcharge_percentage: 0,
                    configuration: { freestanding_is_additive: false, freestanding_surcharge_rules: [] }
                });
            }
        } catch (e) {
            console.error(e);
            toast.error("Błąd ładowania danych produktu");
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const colorsArray = formData.standard_colors.split(',').map(c => c.trim()).filter(c => c);

            await PricingService.upsertProductDefinition({
                id: formData.id || undefined,
                name: formData.name,
                code: formData.code,
                image_url: formData.image_url,
                standard_colors: colorsArray,
                custom_color_surcharge_percentage: Number(formData.custom_color_surcharge_percentage),
                configuration: formData.configuration
            });

            toast.success("Zapisano ustawienia produktu");
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            toast.error("Błąd zapisu: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-accent" />
                        Edycja Produktu: {productName}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwa Modelu</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kod Systemowy</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                                disabled // Code should generally be stable
                            />
                        </div>
                    </div>

                    {/* Image URL */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                            <ImageIcon className="w-3 h-3" /> Link do zdjęcia (URL)
                        </label>

                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="https://..."
                                value={formData.image_url}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent/20 outline-none font-mono text-sm"
                            />
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const toastId = toast.loading('Wysyłanie zdjęcia...');
                                        try {
                                            // 1. Upload
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${formData.code || 'product'}_${Date.now()}.${fileExt}`;
                                            const filePath = `${fileName}`;

                                            // Check bucket existence? Assuming 'product-images' exists or RLS allows creation.
                                            // Ideally we should create bucket if not exists but admin panel usually assumes setup.

                                            const { error: uploadError } = await supabase.storage
                                                .from('product-images')
                                                .upload(filePath, file);

                                            if (uploadError) throw uploadError;

                                            // 2. Get Public URL
                                            const { data: { publicUrl } } = supabase.storage
                                                .from('product-images')
                                                .getPublicUrl(filePath);

                                            setFormData(prev => ({ ...prev, image_url: publicUrl }));
                                            toast.success('Zdjęcie wgrane!', { id: toastId });
                                        } catch (err: any) {
                                            console.error(err);
                                            toast.error('Błąd wgrywania: ' + err.message, { id: toastId });
                                        }
                                    }}
                                />
                                <button className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-2 text-sm font-medium h-full">
                                    <Upload className="w-4 h-4" /> Wgraj
                                </button>
                            </div>
                        </div>

                        {formData.image_url && (
                            <div className="mt-2 h-40 bg-slate-50 rounded border flex items-center justify-center overflow-hidden relative group">
                                <img src={formData.image_url} alt="Preview" className="h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                <button
                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                    className="absolute top-2 right-2 bg-red-white text-red-500 bg-white p-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    title="Usuń zdjęcie"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Colors */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                            <Palette className="w-3 h-3" /> Standardowe Kolory (oddzielone przecinkami)
                        </label>
                        <textarea
                            value={formData.standard_colors}
                            onChange={e => setFormData({ ...formData, standard_colors: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent/20 outline-none h-20 text-sm"
                            placeholder="RAL 7016, RAL 9005..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Te kolory będą dostępne bez dopłaty.</p>
                    </div>

                    {/* Surcharge */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-500" /> Dopłata za inny kolor (%)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.custom_color_surcharge_percentage}
                                onChange={e => setFormData({ ...formData, custom_color_surcharge_percentage: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent/20 outline-none pl-4"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Dopłata doliczana automatycznie, gdy klient wybierze "Inny kolor".</p>
                    </div>

                    {/* Configuration Flags */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.configuration?.freestanding_is_additive || false}
                                onChange={e => setFormData({
                                    ...formData,
                                    configuration: {
                                        ...formData.configuration,
                                        freestanding_is_additive: e.target.checked
                                    }
                                })}
                                className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                            />
                            <div>
                                <span className="block text-sm font-bold text-slate-800">Wymuś sumowanie ceny Wolnostojącej</span>
                                <span className="block text-xs text-slate-500">
                                    Jeśli zaznaczone: Cena Wolnostojąca = Cena Przyścienna + Dopłata (zawsze).
                                    Jeśli odznaczone: System szuka dedykowanego cennika wolnostojącego.
                                </span>
                            </div>
                        </label>

                        {/* Inline Surcharge Rules Editor */}
                        {formData.configuration?.freestanding_is_additive && (
                            <div className="mt-4 pl-7 border-l-2 border-accent/20">
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                                    Tabela Dopłat (Cena zależy od szerokości)
                                </label>

                                <div className="space-y-2">
                                    {(formData.configuration.freestanding_surcharge_rules || []).map((rule: any, idx: number) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <div className="relative w-1/3">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">DO</span>
                                                <input
                                                    type="number"
                                                    placeholder="Szerokość (mm)"
                                                    value={rule.max_width}
                                                    onChange={(e) => {
                                                        const newRules = [...(formData.configuration.freestanding_surcharge_rules || [])];
                                                        newRules[idx].max_width = Number(e.target.value);
                                                        setFormData({
                                                            ...formData,
                                                            configuration: { ...formData.configuration, freestanding_surcharge_rules: newRules }
                                                        });
                                                    }}
                                                    className="w-full pl-8 py-1 text-sm border rounded"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">mm</span>
                                            </div>
                                            <div className="relative w-1/3">
                                                <input
                                                    type="number"
                                                    placeholder="Cena (EUR)"
                                                    value={rule.price}
                                                    onChange={(e) => {
                                                        const newRules = [...(formData.configuration.freestanding_surcharge_rules || [])];
                                                        newRules[idx].price = Number(e.target.value);
                                                        setFormData({
                                                            ...formData,
                                                            configuration: { ...formData.configuration, freestanding_surcharge_rules: newRules }
                                                        });
                                                    }}
                                                    className="w-full pl-3 py-1 text-sm border rounded"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">EUR</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newRules = (formData.configuration.freestanding_surcharge_rules || []).filter((_: any, i: number) => i !== idx);
                                                    setFormData({
                                                        ...formData,
                                                        configuration: { ...formData.configuration, freestanding_surcharge_rules: newRules }
                                                    });
                                                }}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        const newRules = [...(formData.configuration.freestanding_surcharge_rules || []), { max_width: 0, price: 0 }];
                                        setFormData({
                                            ...formData,
                                            configuration: { ...formData.configuration, freestanding_surcharge_rules: newRules }
                                        });
                                    }}
                                    className="mt-2 text-xs font-bold text-accent hover:underline flex items-center gap-1"
                                >
                                    + Dodaj Próg Szerokości
                                </button>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    System wybierze najmniejszy próg, który mieści szerokość zamówienia (np. dla szer. 3500mm system weźmie próg &ge; 3500mm).
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Zapisywanie...' : <><Save className="w-4 h-4" /> Zapisz</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
