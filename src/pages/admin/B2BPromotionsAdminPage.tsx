/**
 * B2B Promotions Admin Page
 * Admin page for managing promotions and special offers
 */

import React, { useState, useEffect } from 'react';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPromotion } from '../../services/database/b2b.service';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DISCOUNT_TYPES = [
    { value: 'percent', label: '% Rabatt', icon: '%' },
    { value: 'fixed', label: '€ Rabatt', icon: '€' },
    { value: 'bundle', label: 'Bundle-Angebot', icon: '🎁' },
    { value: 'free_shipping', label: 'Kostenloser Versand', icon: '🚚' }
];

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Entwurf', color: 'bg-gray-100 text-gray-700' },
    { value: 'active', label: 'Aktiv', color: 'bg-green-100 text-green-700' },
    { value: 'expired', label: 'Abgelaufen', color: 'bg-orange-100 text-orange-700' },
    { value: 'cancelled', label: 'Storniert', color: 'bg-red-100 text-red-700' }
];

type FormData = Omit<B2BPromotion, 'id' | 'created_at' | 'updated_at' | 'current_uses' | 'created_by'>;

const emptyForm: FormData = {
    title: '',
    description: '',
    image_url: '',
    discount_type: 'percent',
    discount_value: 0,
    min_order_value: 0,
    product_categories: [],
    applies_to_products: [],
    promo_code: '',
    start_date: new Date().toISOString(),
    end_date: null,
    is_featured: false,
    status: 'draft',
    terms_conditions: '',
    max_uses: null
};

export function B2BPromotionsAdminPage() {
    const [promotions, setPromotions] = useState<B2BPromotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState<B2BPromotion | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'draft'>('all');

    useEffect(() => {
        loadPromotions();
    }, []);

    async function loadPromotions() {
        setLoading(true);
        try {
            const data = await B2BService.getAllPromotions();
            setPromotions(data);
        } catch (err) {
            console.error('Error loading promotions:', err);
            toast.error('Fehler beim Laden der Aktionen');
        }
        setLoading(false);
    }

    function openModal(promo?: B2BPromotion) {
        if (promo) {
            setEditingPromo(promo);
            setFormData({
                title: promo.title,
                description: promo.description || '',
                image_url: promo.image_url || '',
                discount_type: promo.discount_type,
                discount_value: promo.discount_value,
                min_order_value: promo.min_order_value,
                product_categories: promo.product_categories || [],
                applies_to_products: promo.applies_to_products || [],
                promo_code: promo.promo_code || '',
                start_date: promo.start_date,
                end_date: promo.end_date,
                is_featured: promo.is_featured,
                status: promo.status,
                terms_conditions: promo.terms_conditions || '',
                max_uses: promo.max_uses
            });
        } else {
            setEditingPromo(null);
            setFormData(emptyForm);
        }
        setShowModal(true);
    }

    function updateForm(field: keyof FormData, value: any) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    async function handleSave() {
        if (!formData.title) {
            toast.error('Titel ist erforderlich');
            return;
        }

        setSaving(true);
        try {
            if (editingPromo) {
                await B2BService.updatePromotion(editingPromo.id, formData);
                toast.success('Aktion aktualisiert');
            } else {
                await B2BService.createPromotion(formData);
                toast.success('Aktion erstellt');
            }
            setShowModal(false);
            await loadPromotions();
        } catch (err: any) {
            console.error('Error saving promotion:', err);
            toast.error(err.message || 'Fehler beim Speichern');
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Aktion wirklich löschen?')) return;

        try {
            await B2BService.deletePromotion(id);
            toast.success('Aktion gelöscht');
            await loadPromotions();
        } catch (err) {
            toast.error('Fehler beim Löschen');
        }
    }

    async function toggleStatus(promo: B2BPromotion) {
        const newStatus = promo.status === 'active' ? 'draft' : 'active';
        try {
            await B2BService.updatePromotion(promo.id, { status: newStatus });
            toast.success(newStatus === 'active' ? 'Aktion aktiviert' : 'Aktion deaktiviert');
            await loadPromotions();
        } catch (err) {
            toast.error('Fehler beim Aktualisieren');
        }
    }

    const filteredPromotions = promotions.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'active') return p.status === 'active';
        if (filter === 'draft') return p.status === 'draft';
        return true;
    });

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🔥 Aktionen verwalten</h1>
                    <p className="text-gray-500">Sonderangebote und Rabatte für B2B Partner</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    ➕ Neue Aktion
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {(['all', 'active', 'draft'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' && `Alle (${promotions.length})`}
                        {f === 'active' && `Aktiv (${promotions.filter(p => p.status === 'active').length})`}
                        {f === 'draft' && `Entwürfe (${promotions.filter(p => p.status === 'draft').length})`}
                    </button>
                ))}
            </div>

            {/* Promotions Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Lade Aktionen...</div>
            ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rabatt</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nutzung</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPromotions.map(promo => (
                                <tr key={promo.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {promo.is_featured && <span className="text-yellow-500">⭐</span>}
                                            <div>
                                                <div className="font-medium text-gray-900">{promo.title}</div>
                                                {promo.promo_code && (
                                                    <div className="text-xs font-mono text-gray-500">
                                                        Code: {promo.promo_code}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-lg font-bold text-blue-600">
                                            {promo.discount_type === 'percent' && `-${promo.discount_value}%`}
                                            {promo.discount_type === 'fixed' && `-€${promo.discount_value}`}
                                            {promo.discount_type === 'bundle' && '🎁 Bundle'}
                                            {promo.discount_type === 'free_shipping' && '🚚 Gratis'}
                                        </div>
                                        {promo.min_order_value > 0 && (
                                            <div className="text-xs text-gray-500">
                                                ab €{promo.min_order_value}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div>{format(new Date(promo.start_date), 'dd.MM.yyyy')}</div>
                                        {promo.end_date && (
                                            <div>bis {format(new Date(promo.end_date), 'dd.MM.yyyy')}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="font-medium">{promo.current_uses}</span>
                                        {promo.max_uses && <span className="text-gray-500"> / {promo.max_uses}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_OPTIONS.find(s => s.value === promo.status)?.color
                                            }`}>
                                            {STATUS_OPTIONS.find(s => s.value === promo.status)?.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => toggleStatus(promo)}
                                                className={`px-3 py-1 rounded text-sm font-medium ${promo.status === 'active'
                                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {promo.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                                            </button>
                                            <button
                                                onClick={() => openModal(promo)}
                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                            >
                                                Bearbeiten
                                            </button>
                                            <button
                                                onClick={() => handleDelete(promo.id)}
                                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                            >
                                                Löschen
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPromotions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Keine Aktionen gefunden
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {editingPromo ? 'Aktion bearbeiten' : 'Neue Aktion erstellen'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => updateForm('title', e.target.value)}
                                    placeholder="z.B. -20% auf alle Pergolen"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={e => updateForm('description', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Discount Settings */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rabattart</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={e => updateForm('discount_type', e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        {DISCOUNT_TYPES.map(dt => (
                                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rabattwert</label>
                                    <input
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={e => updateForm('discount_value', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Bestellwert (€)</label>
                                    <input
                                        type="number"
                                        value={formData.min_order_value}
                                        onChange={e => updateForm('min_order_value', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Promo Code & Featured */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Promo-Code (optional)</label>
                                    <input
                                        type="text"
                                        value={formData.promo_code || ''}
                                        onChange={e => updateForm('promo_code', e.target.value.toUpperCase())}
                                        placeholder="z.B. PERGOLA20"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                                    />
                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_featured}
                                            onChange={e => updateForm('is_featured', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">⭐ Als Feature markieren</span>
                                    </label>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                                    <input
                                        type="date"
                                        value={formData.start_date.split('T')[0]}
                                        onChange={e => updateForm('start_date', new Date(e.target.value).toISOString())}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.end_date?.split('T')[0] || ''}
                                        onChange={e => updateForm('end_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Status & Max Uses */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => updateForm('status', e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        {STATUS_OPTIONS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max. Nutzungen (optional)</label>
                                    <input
                                        type="number"
                                        value={formData.max_uses || ''}
                                        onChange={e => updateForm('max_uses', e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="Unbegrenzt"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Terms */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bedingungen (optional)</label>
                                <textarea
                                    value={formData.terms_conditions || ''}
                                    onChange={e => updateForm('terms_conditions', e.target.value)}
                                    rows={2}
                                    placeholder="z.B. Nicht kombinierbar mit anderen Aktionen"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Speichert...' : 'Speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BPromotionsAdminPage;
