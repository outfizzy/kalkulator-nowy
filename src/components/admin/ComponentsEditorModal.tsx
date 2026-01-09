import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { X, Save, Image as ImageIcon, Search } from 'lucide-react';

interface ComponentsEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ComponentItem {
    key: string;
    name: string;
    image_url: string;
    description: string;
    source: 'db' | 'detected';
}

export const ComponentsEditorModal: React.FC<ComponentsEditorModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<ComponentItem[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadComponents();
        }
    }, [isOpen]);

    const loadComponents = async () => {
        setLoading(true);
        try {
            // 1. Fetch existing definitions
            const { data: dbComponents } = await supabase.from('product_components').select('*');

            // 2. Fetch detected keys from pricing_base (cover_types)
            const { data: baseData } = await supabase.from('pricing_base').select('cover_type');
            const uniqueCovers = Array.from(new Set(baseData?.map(d => d.cover_type) || [])).filter(Boolean);

            // 3. Fetch detected keys from pricing_surcharges (surcharge_types)
            const { data: surchargeData } = await supabase.from('pricing_surcharges').select('surcharge_type');
            const uniqueSurcharges = Array.from(new Set(surchargeData?.map(d => d.surcharge_type) || [])).filter(Boolean);

            const allKeys = new Set([...uniqueCovers, ...uniqueSurcharges]);

            // Merge
            const merged: ComponentItem[] = [];

            // Add DB items
            dbComponents?.forEach(db => {
                merged.push({
                    key: db.component_key,
                    name: db.name,
                    image_url: db.image_url || '',
                    description: db.description || '',
                    source: 'db'
                });
                allKeys.delete(db.component_key);
            });

            // Add remaining detected keys
            allKeys.forEach(key => {
                merged.push({
                    key: key,
                    name: formatKeyName(key), // Helper to make it readable
                    image_url: '',
                    description: '',
                    source: 'detected'
                });
            });

            setItems(merged.sort((a, b) => a.key.localeCompare(b.key)));

        } catch (e) {
            console.error(e);
            toast.error("Błąd ładowania komponentów");
        }
        setLoading(false);
    };

    const formatKeyName = (key: string) => {
        // e.g. 'glass_clear' -> 'Glass Clear'
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const handleSaveItem = async (item: ComponentItem) => {
        const toastId = toast.loading('Zapisywanie...');
        try {
            const { error } = await supabase.from('product_components').upsert({
                component_key: item.key,
                name: item.name,
                image_url: item.image_url,
                description: item.description,
                product_definition_id: null // Global
            }, { onConflict: 'product_definition_id, component_key' });

            if (error) throw error;

            toast.success('Zapisano!', { id: toastId });
            // Update local state to show as 'db' source
            setItems(prev => prev.map(p => p.key === item.key ? { ...p, source: 'db' } : p));
        } catch (e: any) {
            toast.error('Błąd: ' + e.message, { id: toastId });
        }
    };

    const filteredItems = items.filter(i =>
        i.key.toLowerCase().includes(filter.toLowerCase()) ||
        i.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-accent" />
                        Materiały i Elementy (Słownik)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex gap-4 bg-white">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Szukaj elementu (np. glass, opcje, dodatki)..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-accent/20 outline-none"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                    {loading ? (
                        <div className="text-center p-8 text-slate-500">Ładowanie...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">Brak elementów spełniających kryteria.</div>
                    ) : (
                        filteredItems.map(item => (
                            <ComponentRow key={item.key} item={item} onSave={handleSaveItem} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const ComponentRow = ({ item, onSave }: { item: ComponentItem, onSave: (i: ComponentItem) => void }) => {
    const [data, setData] = useState(item);
    const [dirty, setDirty] = useState(false);

    const handleChange = (field: keyof ComponentItem, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
        setDirty(true);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex gap-4 items-start">
            <div className="w-16 h-16 bg-slate-100 rounded border flex-shrink-0 overflow-hidden flex items-center justify-center">
                {data.image_url ? (
                    <img src={data.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <ImageIcon className="text-slate-300 w-6 h-6" />
                )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Klucz Systemowy</label>
                    <div className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {data.key}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nazwa Wyświetlana</label>
                    <input
                        className="w-full text-sm border-b border-slate-200 focus:border-accent outline-none py-0.5"
                        value={data.name}
                        onChange={e => handleChange('name', e.target.value)}
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Link do zdjęcia (URL)</label>
                    <input
                        className="w-full text-xs font-mono border-b border-slate-200 focus:border-accent outline-none py-0.5 text-slate-500"
                        value={data.image_url}
                        onChange={e => handleChange('image_url', e.target.value)}
                        placeholder="https://..."
                    />
                </div>
            </div>

            <div className="flex flex-col justify-center h-full pt-2">
                <button
                    onClick={() => { onSave(data); setDirty(false); }}
                    disabled={!dirty}
                    className={`p-2 rounded-lg transition-colors ${dirty ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-dark' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                >
                    <Save className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
