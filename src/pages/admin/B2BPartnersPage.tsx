/**
 * B2B Partners Management Page
 * Admin page for managing B2B partners, margins, and terms
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPartner, B2BPartnerUser } from '../../services/database/b2b.service';
import { UserService } from '../../services/database/user.service';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Profile {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

export function B2BPartnersPage() {
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<B2BPartner | null>(null);
    const [partnerUsers, setPartnerUsers] = useState<B2BPartnerUser[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [managers, setManagers] = useState<Profile[]>([]);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        company_name: '',
        contact_email: '',
        contact_phone: '',
        tax_id: '',
        address: { street: '', city: '', zip: '', country: 'Deutschland' },
        account_manager_id: null as string | null,
        margin_percent: 15,
        payment_terms_days: 14,
        credit_limit: 10000,
        prepayment_required: true,
        prepayment_percent: 50,
        status: 'active' as const
    });

    // Load partners
    useEffect(() => {
        loadPartners();
        loadManagers();
    }, []);

    // Load partner users when partner selected
    useEffect(() => {
        if (selectedPartner) {
            loadPartnerUsers(selectedPartner.id);
        }
    }, [selectedPartner]);

    async function loadPartners() {
        setLoading(true);
        try {
            const report = await B2BService.syncMissingPartners();
            if (report.errors && report.errors.length > 0) {
                if (report.found > 0) {
                    console.error('Sync errors:', report.errors);
                    const errorMsg = report.errors[0]?.message || JSON.stringify(report.errors[0] || 'Unknown');
                    toast.error(`Błąd Sync: ${errorMsg}`);
                }
            } else if (report.synced > 0) {
                toast.success(`Naprawiono ${report.synced} brakujących partnerów!`);
            }

            const data = await B2BService.getPartners();
            setPartners(data);
        } catch (err) {
            console.error('Error loading partners:', err);
            toast.error('Błąd ładowania listy partnerów');
        }
        setLoading(false);
    }

    async function loadManagers() {
        try {
            const users = await UserService.getUsers();
            setManagers(users.filter(u => ['admin', 'sales_rep', 'b2b_manager'].includes(u.role)));
        } catch (err) {
            console.error('Error loading managers:', err);
        }
    }

    async function loadPartnerUsers(partnerId: string) {
        try {
            const users = await B2BService.getPartnerUsers(partnerId);
            setPartnerUsers(users);
        } catch (err) {
            console.error('Error loading partner users:', err);
        }
    }

    function openNewForm() {
        setFormData({
            company_name: '',
            contact_email: '',
            contact_phone: '',
            tax_id: '',
            address: { street: '', city: '', zip: '', country: 'Deutschland' },
            account_manager_id: null,
            margin_percent: 15,
            payment_terms_days: 14,
            credit_limit: 10000,
            prepayment_required: true,
            prepayment_percent: 50,
            status: 'active'
        });
        setSelectedPartner(null);
        setShowForm(true);
    }

    function openEditForm(partner: B2BPartner) {
        setFormData({
            company_name: partner.company_name,
            contact_email: partner.contact_email || '',
            contact_phone: partner.contact_phone || '',
            tax_id: partner.tax_id || '',
            address: partner.address || { street: '', city: '', zip: '', country: 'Deutschland' },
            account_manager_id: partner.account_manager_id,
            margin_percent: partner.margin_percent,
            payment_terms_days: partner.payment_terms_days,
            credit_limit: partner.credit_limit,
            prepayment_required: partner.prepayment_required,
            prepayment_percent: partner.prepayment_percent,
            status: partner.status
        });
        setSelectedPartner(partner);
        setShowForm(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            if (selectedPartner) {
                await B2BService.updatePartner(selectedPartner.id, formData);

                // Sync margin to linked user profiles
                try {
                    const { supabase } = await import('../../lib/supabase');
                    const { data: links } = await supabase
                        .from('b2b_partner_users')
                        .select('user_id')
                        .eq('partner_id', selectedPartner.id);
                    if (links && links.length > 0) {
                        const userIds = links.map(l => l.user_id);
                        await supabase
                            .from('profiles')
                            .update({ partner_margin: formData.margin_percent / 100, updated_at: new Date().toISOString() })
                            .in('id', userIds);
                    }
                } catch (syncErr) {
                    console.warn('Could not sync margin to user profiles:', syncErr);
                }
            } else {
                await B2BService.createPartner(formData as any);
            }
            await loadPartners();
            setShowForm(false);
        } catch (err) {
            console.error('Error saving partner:', err);
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Czy na pewno chcesz usunąć tego partnera? Ta operacja jest nieodwracalna.')) return;
        try {
            await B2BService.deletePartner(id);
            await loadPartners();
            setSelectedPartner(null);
        } catch (err) {
            console.error('Error deleting partner:', err);
        }
    }

    async function toggleStatus(partner: B2BPartner) {
        const newStatus = partner.status === 'active' ? 'suspended' : 'active';
        try {
            await B2BService.updatePartner(partner.id, { status: newStatus });
            await loadPartners();
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    }

    const statusColors = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-yellow-100 text-yellow-800',
        inactive: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
        active: 'Aktywny',
        suspended: 'Zawieszony',
        inactive: 'Nieaktywny'
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        🏢 Partnerzy B2B
                    </h1>
                    <p className="text-gray-500 mt-1">Zarządzaj partnerami handlowymi, marżami i warunkami współpracy</p>
                </div>
                <button
                    onClick={openNewForm}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    <span>➕</span> Dodaj Partnera
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Aktywni Partnerzy</div>
                    <div className="text-2xl font-bold text-green-600">
                        {partners.filter(p => p.status === 'active').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Zawieszeni</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {partners.filter(p => p.status === 'suspended').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Średnia Marża</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {partners.length > 0
                            ? (partners.reduce((sum, p) => sum + p.margin_percent, 0) / partners.length).toFixed(1)
                            : 0}%
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Łączny Limit Kredytowy</div>
                    <div className="text-2xl font-bold text-gray-900">
                        €{partners.reduce((sum, p) => sum + p.credit_limit, 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Ładowanie partnerów...</div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Partners List */}
                    <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-800">Lista Partnerów</h2>
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {partners.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">🏢</div>
                                    <p>Brak partnerów. Kliknij "Dodaj Partnera" aby rozpocząć.</p>
                                </div>
                            ) : (
                                partners.map(partner => (
                                    <div
                                        key={partner.id}
                                        onClick={() => {
                                            setSelectedPartner(partner);
                                            setShowForm(false);
                                        }}
                                        className={`p-4 cursor-pointer transition-colors ${selectedPartner?.id === partner.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{partner.company_name}</h3>
                                                <p className="text-sm text-gray-500">{partner.contact_email}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[partner.status]}`}>
                                                {statusLabels[partner.status]}
                                            </span>
                                        </div>
                                        <div className="flex gap-4 text-sm text-gray-600">
                                            <span>Marża: <b>{partner.margin_percent}%</b></span>
                                            <span>Limit: <b>€{partner.credit_limit.toLocaleString()}</b></span>
                                            {partner.account_manager && (
                                                <span className="text-blue-600">👤 {partner.account_manager.full_name}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail Panel / Form */}
                    <div className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border min-h-[600px]">
                        {showForm ? (
                            // Partner Form
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-6">
                                    {selectedPartner ? 'Edytuj Partnera' : 'Nowy Partner'}
                                </h2>

                                <div className="space-y-6">
                                    {/* Company Info */}
                                    <div className="border-b pb-6">
                                        <h3 className="font-semibold text-gray-700 mb-4">📋 Dane Firmy</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nazwa firmy *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.company_name}
                                                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    NIP / VAT ID
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.tax_id}
                                                    onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Email kontaktowy
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.contact_email}
                                                    onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Telefon
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.contact_phone}
                                                    onChange={e => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Terms */}
                                    <div className="border-b pb-6">
                                        <h3 className="font-semibold text-gray-700 mb-4">💰 Warunki Cenowe</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Marża partnera (%)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.margin_percent}
                                                        onChange={e => setFormData(prev => ({ ...prev, margin_percent: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        step="0.5"
                                                    />
                                                    <span className="absolute right-3 top-2 text-gray-400">%</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Narzut od cen bazowych</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Termin płatności (dni)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.payment_terms_days}
                                                    onChange={e => setFormData(prev => ({ ...prev, payment_terms_days: parseInt(e.target.value) || 14 }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Limit kredytowy (EUR)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-gray-400">€</span>
                                                    <input
                                                        type="number"
                                                        value={formData.credit_limit}
                                                        onChange={e => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.prepayment_required}
                                                        onChange={e => setFormData(prev => ({ ...prev, prepayment_required: e.target.checked }))}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Wymagana zaliczka</span>
                                                </label>
                                                {formData.prepayment_required && (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={formData.prepayment_percent}
                                                            onChange={e => setFormData(prev => ({ ...prev, prepayment_percent: parseFloat(e.target.value) || 50 }))}
                                                            className="w-20 px-2 py-1 border rounded text-center"
                                                        />
                                                        <span className="text-sm text-gray-600">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Manager */}
                                    <div className="border-b pb-6">
                                        <h3 className="font-semibold text-gray-700 mb-4">👤 Opiekun Partnera</h3>
                                        <select
                                            value={formData.account_manager_id || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, account_manager_id: e.target.value || null }))}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Wybierz opiekuna --</option>
                                            {managers.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-4">📊 Status</h3>
                                        <div className="flex gap-4">
                                            {(['active', 'suspended', 'inactive'] as const).map(status => (
                                                <label key={status} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="status"
                                                        checked={formData.status === status}
                                                        onChange={() => setFormData(prev => ({ ...prev, status }))}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className={`px-2 py-1 text-sm rounded-full ${statusColors[status]}`}>
                                                        {statusLabels[status]}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-8 flex gap-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !formData.company_name}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                                    >
                                        {saving ? 'Zapisuję...' : (selectedPartner ? 'Zapisz Zmiany' : 'Utwórz Partnera')}
                                    </button>
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        ) : selectedPartner ? (
                            // Partner Detail View
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedPartner.company_name}</h2>
                                        <p className="text-gray-500">{selectedPartner.tax_id || 'Brak NIP'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditForm(selectedPartner)}
                                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                        >
                                            ✏️ Edytuj
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(selectedPartner)}
                                            className={`px-3 py-1 text-sm rounded ${selectedPartner.status === 'active'
                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            {selectedPartner.status === 'active' ? '⏸ Zawieś' : '▶️ Aktywuj'}
                                        </button>
                                    </div>
                                </div>

                                {/* Partner Details Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-2">📧 Kontakt</h4>
                                            <p className="text-gray-900">{selectedPartner.contact_email || '-'}</p>
                                            <p className="text-gray-600">{selectedPartner.contact_phone || '-'}</p>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-lg">
                                            <h4 className="font-medium text-blue-700 mb-2">💰 Warunki Cenowe</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Marża:</span>
                                                    <span className="font-bold text-blue-900">{selectedPartner.margin_percent}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Termin płatności:</span>
                                                    <span className="font-medium">{selectedPartner.payment_terms_days} dni</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Limit kredytowy:</span>
                                                    <span className="font-medium">€{selectedPartner.credit_limit.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Wykorzystany:</span>
                                                    <span className="font-medium text-orange-600">€{selectedPartner.credit_used.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-700 mb-2">👤 Opiekun</h4>
                                            {selectedPartner.account_manager ? (
                                                <div>
                                                    <p className="font-medium text-gray-900">{selectedPartner.account_manager.full_name}</p>
                                                    <p className="text-sm text-gray-600">{selectedPartner.account_manager.email}</p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-400">Nieprzypisany</p>
                                            )}
                                        </div>
                                        {selectedPartner.prepayment_required && (
                                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <h4 className="font-medium text-yellow-800 mb-1">⚠️ Zaliczka wymagana</h4>
                                                <p className="text-sm text-yellow-700">{selectedPartner.prepayment_percent}% wartości zamówienia</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Partner Users */}
                                <div className="mt-6 border-t pt-6">
                                    <h4 className="font-semibold text-gray-700 mb-3">👥 Użytkownicy Partnera</h4>
                                    {partnerUsers.length === 0 ? (
                                        <p className="text-gray-400 text-sm">Brak przypisanych użytkowników</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {partnerUsers.map(pu => (
                                                <div key={pu.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <span className="font-medium">{pu.user?.full_name}</span>
                                                        <span className="text-gray-500 text-sm ml-2">({pu.user?.email})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{pu.role}</span>
                                                        {pu.can_place_orders && <span className="text-xs text-green-600">✓ Zamówienia</span>}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    // Toggle order permission
                                                                    const { error } = await (await import('../../lib/supabase')).supabase
                                                                        .from('b2b_partner_users')
                                                                        .update({ can_place_orders: !pu.can_place_orders })
                                                                        .eq('id', pu.id);
                                                                    if (error) throw error;
                                                                    toast.success(pu.can_place_orders ? 'Zablokowano zamówienia' : 'Odblokowano zamówienia');
                                                                    loadPartnerUsers(selectedPartner.id);
                                                                } catch (err) {
                                                                    console.error('Error toggling orders:', err);
                                                                    toast.error('Błąd zmiany uprawnień');
                                                                }
                                                            }}
                                                            className={`px-2 py-1 text-xs rounded ${pu.can_place_orders
                                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                }`}
                                                            title={pu.can_place_orders ? 'Zablokuj zamówienia' : 'Odblokuj zamówienia'}
                                                        >
                                                            {pu.can_place_orders ? '🔒 Zablokuj' : '🔓 Odblokuj'}
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${pu.user?.full_name} z tego partnera?`)) return;
                                                                try {
                                                                    await B2BService.removePartnerUser(pu.id);
                                                                    toast.success('Użytkownik usunięty z partnera');
                                                                    loadPartnerUsers(selectedPartner.id);
                                                                } catch (err) {
                                                                    console.error('Error removing user:', err);
                                                                    toast.error('Błąd usuwania użytkownika');
                                                                }
                                                            }}
                                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                            title="Usuń użytkownika z partnera"
                                                        >
                                                            🗑️ Usuń
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-8 p-4 border border-red-200 rounded-lg bg-red-50">
                                    <h4 className="font-medium text-red-800 mb-2">⚠️ Strefa niebezpieczna</h4>
                                    <button
                                        onClick={() => handleDelete(selectedPartner.id)}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                    >
                                        🗑️ Usuń Partnera
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Empty State
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                                <div className="text-6xl mb-6 opacity-20">👈</div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">Wybierz partnera</h3>
                                <p>Kliknij w partnera z listy aby zobaczyć szczegóły</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BPartnersPage;
