/**
 * B2B Marketing Materials Page (Partner View)
 * Clean gallery for partners to browse and download materials
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { pl, de } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

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
    is_featured: boolean;
    download_count: number;
    created_at: string;
}

const CATEGORIES = [
    { id: 'catalog', label: 'Katalogi', icon: '📖' },
    { id: 'photo', label: 'Zdjęcia', icon: '📷' },
    { id: 'video', label: 'Filmy', icon: '🎬' },
    { id: 'tech', label: 'Dokumentacja', icon: '📐' },
    { id: 'promo', label: 'Promocje', icon: '🎨' },
    { id: 'other', label: 'Inne', icon: '📁' },
];

export function B2BMaterialsPage() {
    const { user: currentUser } = useAuth();
    const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        loadMaterials();
    }, []);

    async function loadMaterials() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('b2b_marketing_materials')
                .select('*')
                .eq('is_active', true)
                .order('is_featured', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMaterials(data || []);
        } catch (err) {
            console.error('Error loading materials:', err);
        }
        setLoading(false);
    }

    async function handleDownload(material: MarketingMaterial) {
        setDownloading(material.id);
        try {
            // 1. Log the download
            const partnerId = await getPartnerId();
            await supabase.from('b2b_downloads_log').insert({
                material_id: material.id,
                user_id: currentUser?.id,
                partner_id: partnerId,
            });

            // 2. Increment counter via RPC
            await supabase.rpc('increment_download_count', { material_uuid: material.id });

            // 3. Open file in new tab
            window.open(material.file_url, '_blank');

            // 4. Update local count
            setMaterials(prev =>
                prev.map(m => m.id === material.id ? { ...m, download_count: m.download_count + 1 } : m)
            );
        } catch (err) {
            console.error('Error downloading:', err);
        }
        setDownloading(null);
    }

    async function getPartnerId(): Promise<string | null> {
        try {
            const { data } = await supabase
                .from('b2b_partner_users')
                .select('partner_id')
                .eq('user_id', currentUser?.id)
                .single();
            return data?.partner_id || null;
        } catch {
            return null;
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

    // Featured first
    const featuredMaterials = filteredMaterials.filter(m => m.is_featured);
    const regularMaterials = filteredMaterials.filter(m => !m.is_featured);

    function formatFileSize(bytes: number | null): string {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getFileIcon(mimeType: string | null): string {
        if (!mimeType) return '📄';
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
        if (mimeType.includes('word') || mimeType.includes('doc')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
        return '📄';
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    📂 Materiały Marketingowe
                </h1>
                <p className="text-gray-500 mt-2">Pobierz katalogi, zdjęcia i materiały promocyjne do wykorzystania</p>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-8">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="🔍 Szukaj materiałów..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterCategory === 'all'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Wszystko
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p>Ładowanie materiałów...</p>
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Brak materiałów</h3>
                    <p>Nie znaleziono materiałów spełniających kryteria</p>
                </div>
            ) : (
                <>
                    {/* Featured Section */}
                    {featuredMaterials.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                ⭐ Wyróżnione
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {featuredMaterials.map(material => (
                                    <MaterialCard
                                        key={material.id}
                                        material={material}
                                        onDownload={handleDownload}
                                        downloading={downloading === material.id}
                                        getFileIcon={getFileIcon}
                                        formatFileSize={formatFileSize}
                                        featured
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {regularMaterials.map(material => (
                            <MaterialCard
                                key={material.id}
                                material={material}
                                onDownload={handleDownload}
                                downloading={downloading === material.id}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSize}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

interface MaterialCardProps {
    material: MarketingMaterial;
    onDownload: (material: MarketingMaterial) => void;
    downloading: boolean;
    getFileIcon: (mimeType: string | null) => string;
    formatFileSize: (bytes: number | null) => string;
    featured?: boolean;
}

function MaterialCard({ material, onDownload, downloading, getFileIcon, formatFileSize, featured }: MaterialCardProps) {
    const catInfo = CATEGORIES.find(c => c.id === material.category) || CATEGORIES[5];

    return (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-lg group ${featured ? 'ring-2 ring-yellow-400' : ''}`}>
            {/* Thumbnail */}
            <div className={`${featured ? 'h-40' : 'h-28'} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden`}>
                {material.thumbnail_url ? (
                    <img
                        src={material.thumbnail_url}
                        alt={material.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="text-5xl opacity-50">{getFileIcon(material.file_type)}</div>
                )}
                {featured && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                        ⭐ Wyróżnione
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`font-semibold text-gray-900 ${featured ? 'text-base' : 'text-sm'} line-clamp-2`}>
                        {material.title}
                    </h3>
                </div>

                {material.description && featured && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{material.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <span className="bg-gray-100 px-2 py-1 rounded">{catInfo.icon} {catInfo.label}</span>
                    {material.file_size && <span>{formatFileSize(material.file_size)}</span>}
                </div>

                <button
                    onClick={() => onDownload(material)}
                    disabled={downloading}
                    className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${downloading
                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300'
                        }`}
                >
                    {downloading ? '⏳ Pobieranie...' : '⬇️ Pobierz'}
                </button>
            </div>
        </div>
    );
}

export default B2BMaterialsPage;
