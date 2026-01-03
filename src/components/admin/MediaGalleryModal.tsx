
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MediaGalleryModalProps {
    tableId: string;
    tableName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface MatrixEntry {
    id: string;
    price: number;
    width_mm?: number;
    projection_mm?: number;
    properties?: {
        name?: string;
        description?: string;
        image?: string;
        unit?: string;
        [key: string]: any;
    };
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
    tableId,
    tableName,
    isOpen,
    onClose
}) => {
    const [entries, setEntries] = useState<MatrixEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [dragActiveId, setDragActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tableId) {
            fetchEntries();
        }
    }, [isOpen, tableId]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', tableId)
                .order('price', { ascending: true });

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error('Error fetching entries:', err);
            toast.error('Błąd pobierania komponentów');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (entryId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Tylko pliki graficzne są dozwolone');
            return;
        }

        setUploadingId(entryId);
        const toastId = toast.loading('Wgrywanie zdjęcia...');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `components/${tableId}/${entryId}_${Date.now()}.${fileExt}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
            const publicUrl = data.publicUrl;

            // Update Entry
            const entry = entries.find(e => e.id === entryId);
            if (!entry) throw new Error('Entry not found');

            const currentProps = entry.properties || {};
            const newProps = { ...currentProps, image: publicUrl };

            const { error: updateError } = await supabase
                .from('price_matrix_entries')
                .update({ properties: newProps })
                .eq('id', entryId);

            if (updateError) throw updateError;

            // Update Local State
            setEntries(prev => prev.map(e => e.id === entryId ? { ...e, properties: newProps } : e));
            toast.success('Zdjęcie wgrane!', { id: toastId });

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Błąd: ' + error.message, { id: toastId });
        } finally {
            setUploadingId(null);
            setDragActiveId(null);
        }
    };

    // Drag & Drop Handlers
    const handleDrag = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActiveId(id);
        } else if (e.type === 'dragleave') {
            setDragActiveId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActiveId(null);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(id, e.dataTransfer.files[0]);
        }
    };

    const handleDeleteImage = async (e: React.MouseEvent, entryId: string) => {
        e.stopPropagation();
        if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return;

        const entry = entries.find(el => el.id === entryId);
        if (!entry) return;

        const newProps = { ...(entry.properties || {}) };
        delete newProps.image;

        // Optimistic update
        setEntries(prev => prev.map(el => el.id === entryId ? { ...el, properties: newProps } : el));

        try {
            const { error } = await supabase
                .from('price_matrix_entries')
                .update({ properties: newProps })
                .eq('id', entryId);

            if (error) throw error;
            toast.success('Zdjęcie usunięte');
        } catch (err) {
            console.error(err);
            toast.error('Błąd usuwania');
            fetchEntries(); // Revert on error
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            🖼️ Galeria Mediów
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-normal">{tableName}</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Przeciągnij zdjęcia bezpośrednio na kafelki, aby je przypisać.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p>Ładowanie komponentów...</p>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 italic">
                            Brak komponentów w tym cenniku.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {entries.map(entry => {
                                const props = entry.properties || {};
                                const name = props.name || props.description || `Wymiar: ${entry.width_mm || '?'}x${entry.projection_mm || '?'}`;
                                const hasImage = !!props.image;
                                const isDragActive = dragActiveId === entry.id;
                                const isUploading = uploadingId === entry.id;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`
                                            relative bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden group
                                            ${isDragActive ? 'border-blue-500 scale-105 shadow-xl ring-4 ring-blue-500/20' : hasImage ? 'border-slate-200 hover:border-blue-300' : 'border-dashed border-slate-300 hover:border-blue-400'}
                                        `}
                                        onDragEnter={(e) => handleDrag(e, entry.id)}
                                        onDragLeave={(e) => handleDrag(e, entry.id)}
                                        onDragOver={(e) => handleDrag(e, entry.id)}
                                        onDrop={(e) => handleDrop(e, entry.id)}
                                    >
                                        {/* Image Area */}
                                        <div className="aspect-square bg-slate-50 relative flex items-center justify-center overflow-hidden">
                                            {hasImage ? (
                                                <>
                                                    <img src={props.image} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                        <button
                                                            onClick={(e) => handleDeleteImage(e, entry.id)}
                                                            className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
                                                            title="Usuń zdjęcie"
                                                        >
                                                            🗑️
                                                        </button>
                                                        <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded pointer-events-none">
                                                            Upuść aby zmienić
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-slate-300 gap-2 p-4 text-center">
                                                    <span className="text-4xl">📷</span>
                                                    <span className="text-xs font-medium">Przeciągnij zdjęcie</span>
                                                </div>
                                            )}

                                            {/* Uploading Overlay */}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                                </div>
                                            )}

                                            {/* Drag Overlay */}
                                            {isDragActive && !isUploading && (
                                                <div className="absolute inset-0 bg-blue-500/10 border-4 border-blue-500 flex items-center justify-center z-20 animate-pulse">
                                                    <span className="text-blue-600 font-bold bg-white px-3 py-1 rounded-full shadow-lg">Upuść tutaj!</span>
                                                </div>
                                            )}

                                            {/* Hidden Input for Click Upload */}
                                            {!hasImage && !isUploading && (
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    title="Kliknij aby wybrać zdjęcie"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) handleFileUpload(entry.id, e.target.files[0]);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Info Area */}
                                        <div className="p-3 bg-white border-t border-slate-100">
                                            <div className="font-bold text-slate-700 text-sm truncate mb-1" title={name}>
                                                {name}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {entry.price} PLN
                                                </div>
                                                {props.unit && (
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                        {props.unit}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer instructions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
                    Obsługiwane formaty: JPG, PNG, WEBP. Maksymalny rozmiar pliku: 5MB.
                </div>
            </div>
        </div>
    );
};
