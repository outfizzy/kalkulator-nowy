import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PricingService } from '../../services/pricing.service';
import { X, Save, Image as ImageIcon, Palette, AlertCircle } from 'lucide-react';

interface ProductEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string; // The name we are editing (might not have ID yet if manual)
    onSuccess: () => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({ isOpen, onClose, productName, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        code: '',
        image_url: '',
        standard_colors: 'RAL 7016, RAL 9005, RAL 9016',
        custom_color_surcharge_percentage: 0
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
                    custom_color_surcharge_percentage: existing.custom_color_surcharge_percentage || 0
                });
            } else {
                // Initialize new based on name
                setFormData({
                    id: '',
                    name: productName,
                    code: productName.toLowerCase().replace(/\s+/g, '_'),
                    image_url: '',
                    standard_colors: 'RAL 7016, RAL 9005, RAL 9016',
                    custom_color_surcharge_percentage: 0
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
                custom_color_surcharge_percentage: Number(formData.custom_color_surcharge_percentage)
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
                        <input
                            type="text"
                            placeholder="https://..."
                            value={formData.image_url}
                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent/20 outline-none font-mono text-sm"
                        />
                        {formData.image_url && (
                            <div className="mt-2 h-32 bg-slate-50 rounded border flex items-center justify-center overflow-hidden relative">
                                <img src={formData.image_url} alt="Preview" className="h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
