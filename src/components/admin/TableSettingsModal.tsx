
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MediaGalleryModal } from './MediaGalleryModal';

interface TableSettingsModalProps {
    tableId: string;
    tableName: string;
    initialAttributes: Record<string, any>;
    // New Schema Fields
    initialModelFamily?: string;
    initialZone?: number;
    initialCoverType?: string;
    initialConstructionType?: string;

    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const TableSettingsModal: React.FC<TableSettingsModalProps> = ({
    tableId,
    tableName,
    initialAttributes,
    initialModelFamily = '',
    initialZone = 1,
    initialCoverType = 'polycarbonate',
    initialConstructionType = 'wall',
    isOpen,
    onClose,
    onSave
}) => {
    const [attributes, setAttributes] = useState<Record<string, any>>(initialAttributes || {});
    const [configuration, setConfiguration] = useState<Record<string, any>>({});
    // State for new schema fields
    const [modelFamily, setModelFamily] = useState(initialModelFamily);
    const [zone, setZone] = useState(initialZone);
    const [coverType, setCoverType] = useState(initialCoverType);
    const [constructionType, setConstructionType] = useState(initialConstructionType);

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [entries, setEntries] = useState<any[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [showMediaGallery, setShowMediaGallery] = useState(false);

    // Fetch entries on mount
    useEffect(() => {
        if (isOpen && tableId) {
            fetchEntries();
            fetchConfiguration();
        }
    }, [isOpen, tableId]);

    const fetchConfiguration = async () => {
        const { data, error } = await supabase
            .from('price_tables')
            .select('configuration')
            .eq('id', tableId)
            .single();
        if (data?.configuration) {
            setConfiguration(data.configuration);
        }
    };

    const fetchEntries = async () => {
        setLoadingEntries(true);
        try {
            const { data, error } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', tableId)
                .order('price', { ascending: true }); // Simple sort

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error('Error fetching entries:', err);
        } finally {
            setLoadingEntries(false);
        }
    };

    const handleEntryImageUpload = async (entryId: string, file: File) => {
        const toastId = toast.loading('Przesyłanie zdjęcia komponentu...');
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `components/${tableId}/${entryId}_${Date.now()}.${fileExt}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get URL
            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
            const publicUrl = data.publicUrl;

            // Update Entry
            const entry = entries.find(e => e.id === entryId);
            const currentProps = entry?.properties || {};
            const newProps = { ...currentProps, image: publicUrl };

            const { error: updateError } = await supabase
                .from('price_matrix_entries')
                .update({ properties: newProps })
                .eq('id', entryId);

            if (updateError) throw updateError;

            // Update local state
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, properties: newProps } : e));
            toast.success('Zdjęcie przypisane!', { id: toastId });

        } catch (error: any) {
            console.error('Entry upload error:', error);
            toast.error('Błąd: ' + error.message, { id: toastId });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        setUploading(true);
        const toastId = toast.loading('Przesyłanie zdjęcia...');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `price-tables/${tableId}/${Date.now()}.${fileExt}`;

            // Upload to 'products' bucket
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload failed:', uploadError);
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('products').getPublicUrl(fileName);

            if (data.publicUrl) {
                setAttributes(prev => ({ ...prev, cover_image: data.publicUrl }));
                toast.success('Zdjęcie przesłane!', { id: toastId });
            }

        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error('Błąd przesyłania: ' + (error.message || 'Nieznany błąd'), { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleAttributeChange = (key: string, value: string) => {
        setAttributes(prev => ({ ...prev, [key]: value }));
    };

    const handleRemoveAttribute = (key: string) => {
        const newAttrs = { ...attributes };
        delete newAttrs[key];
        setAttributes(newAttrs);
    };

    const handleAddAttribute = () => {
        const key = prompt('Podaj nazwę atrybutu (np. color_code):');
        if (key) {
            setAttributes(prev => ({ ...prev, [key]: '' }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update explicit schema fields + attributes
            const updates = {
                model_family: modelFamily,
                zone: zone,
                cover_type: coverType,
                construction_type: constructionType,
                attributes: attributes,
                configuration: {
                    ...configuration,
                    freestanding_is_additive: constructionType === 'freestanding' || configuration.freestanding_is_additive // auto-flag
                }
            };

            const { error } = await supabase
                .from('price_tables')
                .update(updates)
                .eq('id', tableId);

            if (error) throw error;

            toast.success('Ustawienia zapisane');
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast.error('Błąd zapisu: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Ustawienia Cennika</h3>
                            <p className="text-xs text-slate-500 truncate max-w-[300px]">{tableName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowMediaGallery(true)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-indigo-200"
                            >
                                <span>🖼️</span> Galeria Mediów
                            </button>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center">
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-8 flex-1">

                        {/* 0. Explicit Schema Fields (Critical for PricingService) */}
                        <div className="space-y-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-800 text-sm flex items-center gap-2">
                                ⚡ Konfiguracja Mapowania (Wymagane)
                            </h4>
                            <p className="text-xs text-yellow-700">
                                Te pola są kluczowe dla automatycznego dobierania cenników w kalkulatorze.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-yellow-800 mb-1">Rodzina Modeli</label>
                                    <input
                                        type="text"
                                        value={modelFamily || ''}
                                        onChange={e => setModelFamily(e.target.value)}
                                        placeholder="np. Trendstyle"
                                        className="w-full p-2 border border-yellow-300 rounded text-sm bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                    />
                                    <p className="text-[10px] text-yellow-600 mt-1">Musi pasować do nazwy modelu (bez 'Aluxe').</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-yellow-800 mb-1">Strefa Śniegowa</label>
                                    <select
                                        value={zone}
                                        onChange={e => setZone(parseInt(e.target.value))}
                                        className="w-full p-2 border border-yellow-300 rounded text-sm bg-white"
                                    >
                                        <option value={1}>Strefa 1 (85kg)</option>
                                        <option value={2}>Strefa 2 (110kg)</option>
                                        <option value={3}>Strefa 3 (135kg+)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-yellow-800 mb-1">Typ Pokrycia</label>
                                    <input
                                        type="text"
                                        value={coverType || ''}
                                        onChange={e => setCoverType(e.target.value)}
                                        placeholder="np. glass_clear"
                                        className="w-full p-2 border border-yellow-300 rounded text-sm bg-white"
                                        list="cover-types"
                                    />
                                    <datalist id="cover-types">
                                        <option value="polycarbonate">Poliwęglan (Ogólny)</option>
                                        <option value="glass">Szkło (Ogólne)</option>
                                        <option value="glass_clear">Szkło Przeźroczyste</option>
                                        <option value="glass_opal">Szkło Mleczne (Opal)</option>
                                        <option value="poly_clear">Poliwęglan Clear</option>
                                        <option value="poly_opal">Poliwęglan Opal</option>
                                        <option value="poly_iq_relax">Poliwęglan IQ Relax</option>
                                        <option value="poly_ir_clear">Poliwęglan IR Clear</option>
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-yellow-800 mb-1">Konstrukcja</label>
                                    <select
                                        value={constructionType}
                                        onChange={e => setConstructionType(e.target.value)}
                                        className="w-full p-2 border border-yellow-300 rounded text-sm bg-white"
                                    >
                                        <option value="wall">Przyścienna</option>
                                        <option value="freestanding">Wolnostojąca</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 1. Main Table Image */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b pb-2">
                                <span>🖼️</span> Zdjęcie Główne (Kategoria)
                            </h4>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                {attributes.cover_image ? (
                                    <div className="space-y-3">
                                        <div className="aspect-video bg-slate-200 rounded overflow-hidden relative group max-h-48">
                                            <img
                                                src={attributes.cover_image}
                                                alt="Cover"
                                                className="w-full h-full object-cover"
                                                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=Invalid+Image')}
                                            />
                                            <button
                                                onClick={() => handleAttributeChange('cover_image', '')}
                                                className="absolute top-2 right-2 bg-red-600/80 text-white p-1.5 rounded-full hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
                                                title="Usuń zdjęcie"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="text-xs text-slate-500 break-all font-mono">
                                            {attributes.cover_image}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-300 rounded hover:bg-slate-100 transition-colors relative">
                                        <p className="text-sm text-slate-500 mb-2">Brak zdjęcia głównego</p>
                                        <button className="text-blue-600 font-medium text-sm hover:underline relative">
                                            Wgraj z dysku
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                disabled={uploading}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 1.5 Construction Type (New Section) */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm border-b pb-2">
                                🏗️ Typ Konstrukcji (Przypisanie)
                            </h4>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Ten cennik dotyczy:</label>
                                <select
                                    value={attributes.installationType || 'all'}
                                    onChange={(e) => handleAttributeChange('installationType', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 outline-none"
                                >
                                    <option value="all">Uniwersalny (Przyścienny i Wolnostojący)</option>
                                    <option value="wall-mounted">Tylko Przyścienne</option>
                                    <option value="freestanding">Tylko Wolnostojące</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-2">
                                    Jeśli ustawisz "Tylko Wolnostojące", kalkulator użyje tego cennika <b>tylko</b> gdy użytkownik wybierze opcję wolnostojącą.
                                </p>
                            </div>
                        </div>

                        {/* 1.6 Freestanding Surcharges (New Editor) */}
                        {constructionType === 'freestanding' && (
                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-700 text-sm border-b pb-2 flex items-center justify-between">
                                    <span>💰 Zasady Dopłat (Wolnostojące)</span>
                                </h4>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                    <p className="text-xs text-blue-800">
                                        Zdefiniuj dopłaty do wersji przyściennej dla różnych szerokości.
                                        System użyje ceny bazowej (przyściennej) + tej dopłaty.
                                    </p>

                                    <div className="space-y-2">
                                        {(configuration.freestanding_surcharge_rules || []).map((rule: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <span className="text-xs text-slate-500 w-16">Do szer.:</span>
                                                <input
                                                    type="number"
                                                    value={rule.max_width}
                                                    onChange={(e) => {
                                                        const newRules = [...(configuration.freestanding_surcharge_rules || [])];
                                                        newRules[idx].max_width = parseInt(e.target.value);
                                                        setConfiguration({ ...configuration, freestanding_surcharge_rules: newRules });
                                                    }}
                                                    className="w-24 p-1 text-sm border rounded"
                                                    placeholder="mm"
                                                />
                                                <span className="text-xs text-slate-500 w-12">Cena:</span>
                                                <input
                                                    type="number"
                                                    value={rule.price}
                                                    onChange={(e) => {
                                                        const newRules = [...(configuration.freestanding_surcharge_rules || [])];
                                                        newRules[idx].price = parseFloat(e.target.value);
                                                        setConfiguration({ ...configuration, freestanding_surcharge_rules: newRules });
                                                    }}
                                                    className="w-24 p-1 text-sm border rounded"
                                                    placeholder="EUR"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newRules = (configuration.freestanding_surcharge_rules || []).filter((_: any, i: number) => i !== idx);
                                                        setConfiguration({ ...configuration, freestanding_surcharge_rules: newRules });
                                                    }}
                                                    className="text-red-500 hover:text-red-700 px-2"
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            const rules = configuration.freestanding_surcharge_rules || [];
                                            setConfiguration({
                                                ...configuration,
                                                freestanding_surcharge_rules: [...rules, { max_width: 0, price: 0 }]
                                            });
                                        }}
                                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium"
                                    >
                                        + Dodaj Próg Dopłaty
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. Component Images (New Section) */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b pb-2">
                                <span>🧩</span> Zdjęcia Komponentów / Wariantów
                                <span className="text-xs font-normal text-slate-400 ml-auto">
                                    (np. LED, Listwa, Promiennik)
                                </span>
                            </h4>

                            {loadingEntries ? (
                                <div className="text-center py-4 text-slate-400">Ładowanie komponentów...</div>
                            ) : entries.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-xs italic">Brak zdefiniowanych komponentów w tym cenniku.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {entries.map(entry => {
                                        // Try to find a name
                                        const props = entry.properties || {};
                                        const entryName = props.name || props.description || `Rozmiar: ${entry.width_mm}x${entry.projection_mm}`;
                                        const entryImage = props.image;

                                        return (
                                            <div key={entry.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-200 transition-colors">
                                                {/* Preview */}
                                                <div className="w-16 h-16 bg-slate-100 rounded-md border border-slate-200 shrink-0 overflow-hidden relative group">
                                                    {entryImage ? (
                                                        <img src={entryImage} className="w-full h-full object-cover" alt="Comp" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Brak</div>
                                                    )}

                                                    {/* Upload Overlay */}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                        <span className="text-[10px] text-white font-bold">Wgraj</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) handleEntryImageUpload(entry.id, e.target.files[0]);
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-slate-700 truncate">{entryName}</div>
                                                    <div className="text-xs text-slate-500 flex gap-2">
                                                        <span>Cena: {entry.price} PLN</span>
                                                        {props.unit && <span className="bg-slate-100 px-1 rounded text-slate-400">{props.unit}</span>}
                                                    </div>
                                                </div>

                                                {/* Delete Action if image exists */}
                                                {entryImage && (
                                                    <button
                                                        onClick={async () => {
                                                            const newProps = { ...props };
                                                            delete newProps.image;
                                                            await supabase.from('price_matrix_entries').update({ properties: newProps }).eq('id', entry.id);
                                                            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, properties: newProps } : e));
                                                            toast.success('Usunięto zdjęcie');
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 p-2"
                                                        title="Usuń przypisanie"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 3. Other Attributes (Collapsed/Secondary) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2 border-b pb-2">
                                <h4 className="font-bold text-slate-700 text-sm">⚙️ Ustawienia Zaawansowane (JSON)</h4>
                                <button
                                    onClick={handleAddAttribute}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    + Dodaj pole
                                </button>
                            </div>
                            <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                                {Object.entries(attributes).map(([key, val]) => {
                                    if (key === 'cover_image') return null; // Handled above
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className="w-1/3 text-xs font-mono text-slate-500 truncate" title={key}>
                                                {key}
                                            </div>
                                            <input
                                                type="text"
                                                value={val as string}
                                                onChange={(e) => handleAttributeChange(key, e.target.value)}
                                                className="flex-1 p-1.5 text-sm border rounded focus:border-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveAttribute(key)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )
                                })}
                                {Object.keys(attributes).filter(k => k !== 'cover_image').length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Brak dodatkowych atrybutów.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-200 rounded transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                        >
                            {saving ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                        </button>
                    </div>
                </div>
            </div>

            <MediaGalleryModal
                isOpen={showMediaGallery}
                tableId={tableId}
                tableName={tableName}
                onClose={() => {
                    setShowMediaGallery(false);
                    fetchEntries(); // Refresh entries when returning
                }}
            />
        </>
    );
};
