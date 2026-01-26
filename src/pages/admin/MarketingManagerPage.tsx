/**
 * Marketing Materials Manager Page (Admin/Manager)
 * Upload, edit, delete marketing materials with download stats
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface MarketingMaterial {
    id: string;
    title: string;
    description: string | null;
    category: string;
    file_url: string;
    file_name: string;
    file_size: number | null;
    file_type: string | null;
    thumbnail_url: string | null;
    tags: string[];
    language: string;
    product_family: string | null;
    is_featured: boolean;
    is_active: boolean;
    download_count: number;
    created_at: string;
    updated_at: string;
}

interface DownloadLogEntry {
    id: string;
    material_id: string;
    user_id: string;
    partner_id: string;
    downloaded_at: string;
    partner?: {
        company_name: string;
    };
    user?: {
        full_name: string;
    };
}

const CATEGORIES = [
    { id: 'catalog', label: 'Katalogi', icon: '📖' },
    { id: 'photo', label: 'Zdjęcia', icon: '📷' },
    { id: 'video', label: 'Filmy', icon: '🎬' },
    { id: 'tech', label: 'Dokumentacja techniczna', icon: '📐' },
    { id: 'promo', label: 'Materiały promocyjne', icon: '🎨' },
    { id: 'other', label: 'Inne', icon: '📁' },
];

export function MarketingManagerPage() {
    const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
    const [downloadLogs, setDownloadLogs] = useState<DownloadLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState<MarketingMaterial | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadMaterials();
    }, []);

    async function loadMaterials() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('b2b_marketing_materials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMaterials(data || []);
        } catch (err) {
            console.error('Error loading materials:', err);
        }
        setLoading(false);
    }

    async function loadDownloadLogs(materialId: string) {
        try {
            const { data, error } = await supabase
                .from('b2b_downloads_log')
                .select(`
                    *,
                    partner:b2b_partners(company_name),
                    user:profiles(full_name)
                `)
                .eq('material_id', materialId)
                .order('downloaded_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setDownloadLogs(data || []);
        } catch (err) {
            console.error('Error loading download logs:', err);
        }
    }

    async function handleFileUpload(files: FileList | null) {
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            try {
                // 1. Upload to storage
                const fileName = `${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('b2b-marketing')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // 2. Get public URL
                const { data: urlData } = supabase.storage
                    .from('b2b-marketing')
                    .getPublicUrl(fileName);

                // 3. Create record
                const { error: insertError } = await supabase
                    .from('b2b_marketing_materials')
                    .insert({
                        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                        file_url: urlData.publicUrl,
                        file_name: file.name,
                        file_size: file.size,
                        file_type: file.type,
                        category: guessCategory(file.type),
                    });

                if (insertError) throw insertError;

            } catch (err) {
                console.error('Error uploading file:', err);
            }
        }

        loadMaterials();
        setShowUploadModal(false);
    }

    function guessCategory(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'photo';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.includes('pdf')) return 'catalog';
        return 'other';
    }

    async function handleDelete(id: string) {
        if (!confirm('Czy na pewno chcesz usunąć ten materiał?')) return;

        try {
            const material = materials.find(m => m.id === id);
            if (material) {
                // Delete from storage
                const fileName = material.file_url.split('/').pop();
                if (fileName) {
                    await supabase.storage.from('b2b-marketing').remove([fileName]);
                }
            }

            // Delete record
            const { error } = await supabase
                .from('b2b_marketing_materials')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setMaterials(prev => prev.filter(m => m.id !== id));
            if (selectedMaterial?.id === id) setSelectedMaterial(null);
        } catch (err) {
            console.error('Error deleting material:', err);
        }
    }

    async function handleToggleActive(id: string, currentState: boolean) {
        try {
            const { error } = await supabase
                .from('b2b_marketing_materials')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;

            setMaterials(prev =>
                prev.map(m => m.id === id ? { ...m, is_active: !currentState } : m)
            );
        } catch (err) {
            console.error('Error toggling active state:', err);
        }
    }

    async function handleToggleFeatured(id: string, currentState: boolean) {
        try {
            const { error } = await supabase
                .from('b2b_marketing_materials')
                .update({ is_featured: !currentState })
                .eq('id', id);

            if (error) throw error;

            setMaterials(prev =>
                prev.map(m => m.id === id ? { ...m, is_featured: !currentState } : m)
            );
        } catch (err) {
            console.error('Error toggling featured state:', err);
        }
    }

    async function handleUpdateMaterial(id: string, updates: Partial<MarketingMaterial>) {
        try {
            const { error } = await supabase
                .from('b2b_marketing_materials')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setMaterials(prev =>
                prev.map(m => m.id === id ? { ...m, ...updates } : m)
            );
            if (selectedMaterial?.id === id) {
                setSelectedMaterial({ ...selectedMaterial, ...updates });
            }
        } catch (err) {
            console.error('Error updating material:', err);
        }
    }

    // Filtered materials
    const filteredMaterials = materials.filter(m => {
        if (filterCategory !== 'all' && m.category !== filterCategory) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!m.title.toLowerCase().includes(query) && !m.file_name.toLowerCase().includes(query)) return false;
        }
        return true;
    });

    // Stats
    const stats = {
        total: materials.length,
        active: materials.filter(m => m.is_active).length,
        totalDownloads: materials.reduce((sum, m) => sum + m.download_count, 0),
        byCategory: CATEGORIES.map(cat => ({
            ...cat,
            count: materials.filter(m => m.category === cat.id).length
        }))
    };

    function formatFileSize(bytes: number | null): string {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <div className="p-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        📂 Materiały Marketingowe
                    </h1>
                    <p className="text-gray-500 mt-1">Zarządzaj plikami dostępnymi dla partnerów B2B</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    ⬆️ Dodaj pliki
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">📁 Wszystkich plików</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">✅ Aktywnych</div>
                    <div className="text-3xl font-bold text-green-600">{stats.active}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">⬇️ Łącznie pobrań</div>
                    <div className="text-3xl font-bold text-blue-600">{stats.totalDownloads}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">⭐ Wyróżnionych</div>
                    <div className="text-3xl font-bold text-yellow-600">
                        {materials.filter(m => m.is_featured).length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border shadow-sm mb-6 flex gap-4 items-center flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="🔍 Szukaj (tytuł, nazwa pliku)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterCategory('all')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Wszystkie
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCategory(cat.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Ładowanie materiałów...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Materials Grid */}
                    <div className="col-span-12 lg:col-span-8">
                        {filteredMaterials.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 border shadow-sm text-center text-gray-400">
                                <div className="text-6xl mb-4">📭</div>
                                <h3 className="text-lg font-medium text-gray-600 mb-2">Brak materiałów</h3>
                                <p>Dodaj pierwszy plik klikając "Dodaj pliki"</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredMaterials.map(material => {
                                    const catInfo = CATEGORIES.find(c => c.id === material.category) || CATEGORIES[5];
                                    return (
                                        <div
                                            key={material.id}
                                            onClick={() => {
                                                setSelectedMaterial(material);
                                                loadDownloadLogs(material.id);
                                            }}
                                            className={`bg-white rounded-xl border shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedMaterial?.id === material.id ? 'ring-2 ring-blue-500' : ''} ${!material.is_active ? 'opacity-60' : ''}`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-32 bg-gray-100 flex items-center justify-center text-4xl">
                                                {material.thumbnail_url ? (
                                                    <img src={material.thumbnail_url} alt={material.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    catInfo.icon
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h3 className="font-semibold text-gray-900 line-clamp-1">{material.title}</h3>
                                                    {material.is_featured && <span title="Wyróżnione">⭐</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${material.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {material.is_active ? 'Aktywny' : 'Ukryty'}
                                                    </span>
                                                    <span>{formatFileSize(material.file_size)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-400">
                                                        {formatDistanceToNow(new Date(material.created_at), { addSuffix: true, locale: pl })}
                                                    </span>
                                                    <span className="text-blue-600 font-medium">
                                                        ⬇️ {material.download_count}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border min-h-[500px]">
                        {selectedMaterial ? (
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{selectedMaterial.title}</h3>
                                    <button
                                        onClick={() => handleDelete(selectedMaterial.id)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        🗑️ Usuń
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => handleToggleActive(selectedMaterial.id, selectedMaterial.is_active)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${selectedMaterial.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        {selectedMaterial.is_active ? '✅ Aktywny' : '⏸️ Ukryty'}
                                    </button>
                                    <button
                                        onClick={() => handleToggleFeatured(selectedMaterial.id, selectedMaterial.is_featured)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${selectedMaterial.is_featured ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        {selectedMaterial.is_featured ? '⭐ Wyróżniony' : '☆ Wyróżnij'}
                                    </button>
                                </div>

                                {/* Edit Title */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
                                    <input
                                        type="text"
                                        value={selectedMaterial.title}
                                        onChange={e => handleUpdateMaterial(selectedMaterial.id, { title: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>

                                {/* Category */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
                                    <select
                                        value={selectedMaterial.category}
                                        onChange={e => handleUpdateMaterial(selectedMaterial.id, { category: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                                    <textarea
                                        value={selectedMaterial.description || ''}
                                        onChange={e => handleUpdateMaterial(selectedMaterial.id, { description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        rows={3}
                                        placeholder="Opcjonalny opis materiału..."
                                    />
                                </div>

                                {/* File Info */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-600">Nazwa pliku:</span>
                                        <span className="font-medium truncate max-w-[200px]">{selectedMaterial.file_name}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-600">Rozmiar:</span>
                                        <span className="font-medium">{formatFileSize(selectedMaterial.file_size)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Typ:</span>
                                        <span className="font-medium">{selectedMaterial.file_type || '-'}</span>
                                    </div>
                                </div>

                                {/* Download Stats */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-700">📊 Statystyki pobrań</h4>
                                        <span className="text-2xl font-bold text-blue-600">{selectedMaterial.download_count}</span>
                                    </div>
                                    {downloadLogs.length > 0 && (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                            {downloadLogs.slice(0, 10).map(log => (
                                                <div key={log.id} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                                                    <span className="font-medium">{log.partner?.company_name || log.user?.full_name || 'Nieznany'}</span>
                                                    <span className="text-gray-500">
                                                        {formatDistanceToNow(new Date(log.downloaded_at), { addSuffix: true, locale: pl })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Preview Link */}
                                <a
                                    href={selectedMaterial.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    👁️ Podgląd / Pobierz
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-24">
                                <div className="text-6xl mb-4 opacity-20">👆</div>
                                <h3 className="text-lg font-medium text-gray-600 mb-1">Wybierz materiał</h3>
                                <p className="text-sm">Kliknij w kafelek aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">⬆️ Dodaj nowe materiały</h3>

                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500'); }}
                            onDragLeave={e => { e.currentTarget.classList.remove('border-blue-500'); }}
                            onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                        >
                            <div className="text-4xl mb-4">📁</div>
                            <p className="text-gray-600 mb-2">Przeciągnij pliki tutaj</p>
                            <p className="text-gray-400 text-sm">lub kliknij aby wybrać</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={e => handleFileUpload(e.target.files)}
                            />
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MarketingManagerPage;
