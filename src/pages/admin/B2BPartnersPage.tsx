/**
 * B2B Partners Management Page — Enhanced
 * Full partner management: pending approvals, data, login logs, users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPartner, B2BPartnerUser, B2BPartnerActivity } from '../../services/database/b2b.service';
import { UserService } from '../../services/database/user.service';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Profile {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone?: string;
    status?: string;
    company_name?: string;
    nip?: string;
    created_at?: string;
}

// ============================================================================
// Pending B2B Users (registered but not yet approved)
// ============================================================================
interface PendingUser {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    company_name: string | null;
    nip: string | null;
    status: string;
    created_at: string;
    role: string;
}

type DetailTab = 'info' | 'users' | 'logs';

export function B2BPartnersPage() {
    const [partners, setPartners] = useState<B2BPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<B2BPartner | null>(null);
    const [partnerUsers, setPartnerUsers] = useState<B2BPartnerUser[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [managers, setManagers] = useState<Profile[]>([]);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<DetailTab>('info');

    // Pending users
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);

    // Login logs
    const [loginLogs, setLoginLogs] = useState<B2BPartnerActivity[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

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

    // Load data
    useEffect(() => {
        loadPartners();
        loadManagers();
        loadPendingUsers();
    }, []);

    useEffect(() => {
        if (selectedPartner) {
            loadPartnerUsers(selectedPartner.id);
            if (activeTab === 'logs') {
                loadLoginLogs(selectedPartner.id);
            }
        }
    }, [selectedPartner, activeTab]);

    async function loadPartners() {
        setLoading(true);
        try {
            const report = await B2BService.syncMissingPartners();
            if (report.synced > 0) {
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

    async function loadPendingUsers() {
        setLoadingPending(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['b2b_partner', 'partner'])
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingUsers((data || []).map(p => ({
                id: p.id,
                full_name: p.full_name || '',
                email: p.email || '',
                phone: p.phone || null,
                company_name: p.company_name || null,
                nip: p.nip || null,
                status: p.status || 'pending',
                created_at: p.created_at,
                role: p.role,
            })));
        } catch (err) {
            console.error('Error loading pending users:', err);
        }
        setLoadingPending(false);
    }

    async function loadPartnerUsers(partnerId: string) {
        try {
            const users = await B2BService.getPartnerUsers(partnerId);
            setPartnerUsers(users);
        } catch (err) {
            console.error('Error loading partner users:', err);
        }
    }

    async function loadLoginLogs(partnerId: string) {
        setLoadingLogs(true);
        try {
            const logs = await B2BService.getPartnerActivity(partnerId, { limit: 100 });
            setLoginLogs(logs);
        } catch (err) {
            console.error('Error loading login logs:', err);
            setLoginLogs([]);
        }
        setLoadingLogs(false);
    }

    // ===== Accept / Reject Pending User =====
    async function acceptUser(user: PendingUser) {
        try {
            await supabase
                .from('profiles')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', user.id);

            toast.success(`✅ Konto ${user.full_name} aktywowane!`);
            await loadPendingUsers();
            await loadPartners();
        } catch (err) {
            console.error('Error accepting user:', err);
            toast.error('Błąd aktywacji konta');
        }
    }

    async function rejectUser(user: PendingUser) {
        if (!confirm(`Czy na pewno chcesz odrzucić rejestrację ${user.full_name}? Konto zostanie zablokowane.`)) return;
        try {
            await supabase
                .from('profiles')
                .update({ status: 'blocked', updated_at: new Date().toISOString() })
                .eq('id', user.id);

            toast.success(`Konto ${user.full_name} odrzucone`);
            await loadPendingUsers();
        } catch (err) {
            console.error('Error rejecting user:', err);
            toast.error('Błąd odrzucania konta');
        }
    }

    // ===== Partner CRUD =====
    function openNewForm() {
        setFormData({
            company_name: '', contact_email: '', contact_phone: '', tax_id: '',
            address: { street: '', city: '', zip: '', country: 'Deutschland' },
            account_manager_id: null, margin_percent: 15, payment_terms_days: 14,
            credit_limit: 10000, prepayment_required: true, prepayment_percent: 50, status: 'active'
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
                toast.success('Partner zaktualizowany');
            } else {
                await B2BService.createPartner(formData as any);
                toast.success('Partner utworzony');
            }
            await loadPartners();
            setShowForm(false);
        } catch (err) {
            console.error('Error saving partner:', err);
            toast.error('Błąd zapisu partnera');
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Czy na pewno chcesz usunąć tego partnera? Ta operacja jest nieodwracalna.')) return;
        try {
            await B2BService.deletePartner(id);
            toast.success('Partner usunięty');
            await loadPartners();
            setSelectedPartner(null);
        } catch (err) {
            console.error('Error deleting partner:', err);
            toast.error('Błąd usuwania partnera');
        }
    }

    async function toggleStatus(partner: B2BPartner) {
        const newStatus = partner.status === 'active' ? 'suspended' : 'active';
        try {
            await B2BService.updatePartner(partner.id, { status: newStatus });
            toast.success(newStatus === 'active' ? 'Partner aktywowany' : 'Partner zawieszony');
            await loadPartners();
            if (selectedPartner?.id === partner.id) {
                setSelectedPartner({ ...partner, status: newStatus });
            }
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    }

    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-yellow-100 text-yellow-800',
        inactive: 'bg-gray-100 text-gray-800'
    };
    const statusLabels: Record<string, string> = {
        active: 'Aktywny', suspended: 'Zawieszony', inactive: 'Nieaktywny'
    };

    const activityLabels: Record<string, string> = {
        login: '🔑 Logowanie',
        logout: '🚪 Wylogowanie',
        view_page: '👁️ Otworzenie strony',
        create_offer: '📝 Utworzenie oferty',
        edit_offer: '✏️ Edycja oferty',
        delete_offer: '🗑️ Usunięcie oferty',
        accept_offer: '✅ Akceptacja oferty',
        view_order: '📦 Podgląd zamówienia',
        download_material: '📥 Pobranie materiału',
        view_promotion: '🎯 Podgląd promocji',
        search: '🔍 Wyszukiwanie',
        other: '📋 Inna aktywność',
    };

    // Filter partners
    const filteredPartners = partners.filter(p =>
        !searchTerm ||
        p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.contact_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tax_id || '').includes(searchTerm)
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        🏢 Partnerzy B2B
                    </h1>
                    <p className="text-gray-500 mt-1">Zarządzaj partnerami handlowymi, marżami, akceptacjami i logami</p>
                </div>
                <button
                    onClick={openNewForm}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    <span>➕</span> Dodaj Partnera
                </button>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* PENDING USERS SECTION                       */}
            {/* ═══════════════════════════════════════════ */}
            {pendingUsers.length > 0 && (
                <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-amber-100 border-b border-amber-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⏳</span>
                            <h2 className="font-bold text-amber-900">
                                Oczekujące rejestracje ({pendingUsers.length})
                            </h2>
                        </div>
                        <span className="text-xs text-amber-700">Nowe konta B2B do weryfikacji</span>
                    </div>
                    <div className="divide-y divide-amber-200">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="px-5 py-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-semibold text-gray-900">{user.full_name || 'Brak imienia'}</span>
                                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                            Oczekuje
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                                        <span>📧 {user.email}</span>
                                        {user.phone && <span>📱 {user.phone}</span>}
                                        {user.company_name && <span>🏢 {user.company_name}</span>}
                                        {user.nip && <span>🔢 NIP: {user.nip}</span>}
                                        <span className="text-gray-400">
                                            Zarejestrowany {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: de })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4 flex-shrink-0">
                                    <button
                                        onClick={() => acceptUser(user)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-1.5 shadow-sm"
                                    >
                                        ✅ Aktywuj
                                    </button>
                                    <button
                                        onClick={() => rejectUser(user)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm flex items-center gap-1.5"
                                    >
                                        ❌ Odrzuć
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Aktywni</div>
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
                    <div className="text-sm text-gray-500">Oczekujący</div>
                    <div className="text-2xl font-bold text-amber-600">
                        {pendingUsers.length}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Śr. Marża</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {partners.length > 0
                            ? (partners.reduce((sum, p) => sum + p.margin_percent, 0) / partners.length).toFixed(1)
                            : 0}%
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="text-sm text-gray-500">Łączny Limit</div>
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
                        <div className="p-4 border-b bg-gray-50 rounded-t-xl space-y-3">
                            <h2 className="font-semibold text-gray-800">Lista Partnerów ({filteredPartners.length})</h2>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="🔍 Szukaj po nazwie, email, NIP..."
                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {filteredPartners.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">🏢</div>
                                    <p>Brak partnerów pasujących do kryteriów.</p>
                                </div>
                            ) : (
                                filteredPartners.map(partner => (
                                    <div
                                        key={partner.id}
                                        onClick={() => {
                                            setSelectedPartner(partner);
                                            setShowForm(false);
                                            setActiveTab('info');
                                        }}
                                        className={`p-4 cursor-pointer transition-colors ${selectedPartner?.id === partner.id
                                            ? 'bg-blue-50 border-l-4 border-blue-600'
                                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{partner.company_name}</h3>
                                                <p className="text-sm text-gray-500 truncate">{partner.contact_email}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ml-2 ${statusColors[partner.status]}`}>
                                                {statusLabels[partner.status]}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                            <span>Marża: <b>{partner.margin_percent}%</b></span>
                                            <span>Limit: <b>€{partner.credit_limit.toLocaleString()}</b></span>
                                            {partner.tax_id && <span className="text-gray-400">NIP: {partner.tax_id}</span>}
                                        </div>
                                        {partner.account_manager && (
                                            <div className="text-xs text-blue-600 mt-1.5">👤 {partner.account_manager.full_name}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail Panel / Form */}
                    <div className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border min-h-[600px]">
                        {showForm ? (
                            /* ═══ PARTNER FORM ═══ */
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa firmy *</label>
                                                <input type="text" value={formData.company_name}
                                                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">NIP / VAT ID</label>
                                                <input type="text" value={formData.tax_id}
                                                    onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email kontaktowy</label>
                                                <input type="email" value={formData.contact_email}
                                                    onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                                <input type="tel" value={formData.contact_phone}
                                                    onChange={e => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Terms */}
                                    <div className="border-b pb-6">
                                        <h3 className="font-semibold text-gray-700 mb-4">💰 Warunki Cenowe</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Marża partnera (%)</label>
                                                <div className="relative">
                                                    <input type="number" value={formData.margin_percent}
                                                        onChange={e => setFormData(prev => ({ ...prev, margin_percent: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" step="0.5" />
                                                    <span className="absolute right-3 top-2 text-gray-400">%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Termin płatności (dni)</label>
                                                <input type="number" value={formData.payment_terms_days}
                                                    onChange={e => setFormData(prev => ({ ...prev, payment_terms_days: parseInt(e.target.value) || 14 }))}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Limit kredytowy (EUR)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-gray-400">€</span>
                                                    <input type="number" value={formData.credit_limit}
                                                        onChange={e => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input type="checkbox" checked={formData.prepayment_required}
                                                        onChange={e => setFormData(prev => ({ ...prev, prepayment_required: e.target.checked }))}
                                                        className="w-4 h-4 text-blue-600" />
                                                    <span className="text-sm font-medium text-gray-700">Wymagana zaliczka</span>
                                                </label>
                                                {formData.prepayment_required && (
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={formData.prepayment_percent}
                                                            onChange={e => setFormData(prev => ({ ...prev, prepayment_percent: parseFloat(e.target.value) || 50 }))}
                                                            className="w-20 px-2 py-1 border rounded text-center" />
                                                        <span className="text-sm text-gray-600">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Manager */}
                                    <div className="border-b pb-6">
                                        <h3 className="font-semibold text-gray-700 mb-4">👤 Opiekun Partnera</h3>
                                        <select value={formData.account_manager_id || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, account_manager_id: e.target.value || null }))}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
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
                                                    <input type="radio" name="status" checked={formData.status === status}
                                                        onChange={() => setFormData(prev => ({ ...prev, status }))}
                                                        className="w-4 h-4 text-blue-600" />
                                                    <span className={`px-2 py-1 text-sm rounded-full ${statusColors[status]}`}>
                                                        {statusLabels[status]}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button onClick={handleSave} disabled={saving || !formData.company_name}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                                        {saving ? 'Zapisuję...' : (selectedPartner ? 'Zapisz Zmiany' : 'Utwórz Partnera')}
                                    </button>
                                    <button onClick={() => setShowForm(false)}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        ) : selectedPartner ? (
                            /* ═══ PARTNER DETAIL VIEW WITH TABS ═══ */
                            <div>
                                {/* Header */}
                                <div className="p-5 border-b bg-gray-50 rounded-t-xl">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{selectedPartner.company_name}</h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[selectedPartner.status]}`}>
                                                    {statusLabels[selectedPartner.status]}
                                                </span>
                                                {selectedPartner.tax_id && <span className="text-sm text-gray-500">NIP: {selectedPartner.tax_id}</span>}
                                                <span className="text-xs text-gray-400">
                                                    od {format(new Date(selectedPartner.created_at), 'dd.MM.yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(selectedPartner)}
                                                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                                                ✏️ Edytuj
                                            </button>
                                            <button onClick={() => toggleStatus(selectedPartner)}
                                                className={`px-3 py-1.5 text-sm rounded-lg font-medium ${selectedPartner.status === 'active'
                                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                                {selectedPartner.status === 'active' ? '⏸ Zawieś' : '▶️ Aktywuj'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b">
                                    {([
                                        { key: 'info' as DetailTab, label: '📋 Informacje', },
                                        { key: 'users' as DetailTab, label: `👥 Użytkownicy (${partnerUsers.length})`, },
                                        { key: 'logs' as DetailTab, label: '📊 Logi aktywności', },
                                    ]).map(tab => (
                                        <button key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="p-5">
                                    {activeTab === 'info' && (
                                        /* ═══ INFO TAB ═══ */
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-5">
                                                {/* Contact */}
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <h4 className="font-medium text-gray-700 mb-3">📧 Dane kontaktowe</h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Email:</span>
                                                            <span className="font-medium">{selectedPartner.contact_email || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Telefon:</span>
                                                            <span className="font-medium">{selectedPartner.contact_phone || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">NIP:</span>
                                                            <span className="font-medium">{selectedPartner.tax_id || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                <div className="p-4 bg-blue-50 rounded-lg">
                                                    <h4 className="font-medium text-blue-700 mb-3">💰 Warunki cenowe</h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Marża:</span>
                                                            <span className="font-bold text-blue-900">{selectedPartner.margin_percent}%</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Termin:</span>
                                                            <span className="font-medium">{selectedPartner.payment_terms_days} dni</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Limit:</span>
                                                            <span className="font-medium">€{selectedPartner.credit_limit.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Wykorzystany:</span>
                                                            <span className="font-medium text-orange-600">€{selectedPartner.credit_used.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Account Manager */}
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <h4 className="font-medium text-gray-700 mb-3">👤 Opiekun</h4>
                                                    {selectedPartner.account_manager ? (
                                                        <div>
                                                            <p className="font-medium text-gray-900">{selectedPartner.account_manager.full_name}</p>
                                                            <p className="text-sm text-gray-600">{selectedPartner.account_manager.email}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-400 text-sm">Nieprzypisany</p>
                                                    )}
                                                </div>

                                                {/* Prepayment */}
                                                {selectedPartner.prepayment_required && (
                                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                        <h4 className="font-medium text-yellow-800 mb-1">⚠️ Zaliczka wymagana</h4>
                                                        <p className="text-sm text-yellow-700">{selectedPartner.prepayment_percent}% wartości zamówienia</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Danger Zone */}
                                            <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
                                                <h4 className="font-medium text-red-800 mb-2">⚠️ Strefa niebezpieczna</h4>
                                                <button onClick={() => handleDelete(selectedPartner.id)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                                                    🗑️ Usuń Partnera
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'users' && (
                                        /* ═══ USERS TAB ═══ */
                                        <div>
                                            {partnerUsers.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400">
                                                    <div className="text-3xl mb-2">👥</div>
                                                    <p>Brak przypisanych użytkowników</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {partnerUsers.map(pu => (
                                                        <div key={pu.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="flex items-center justify-between">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-semibold text-gray-900">{pu.user?.full_name}</span>
                                                                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{pu.role}</span>
                                                                        {pu.can_place_orders && (
                                                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Zamówienia</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                                                        <span>📧 {pu.user?.email}</span>
                                                                        {pu.user?.phone && <span>📱 {pu.user.phone}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2 flex-shrink-0 ml-3">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                const { error } = await supabase
                                                                                    .from('b2b_partner_users')
                                                                                    .update({ can_place_orders: !pu.can_place_orders })
                                                                                    .eq('id', pu.id);
                                                                                if (error) throw error;
                                                                                toast.success(pu.can_place_orders ? 'Zablokowano zamówienia' : 'Odblokowano zamówienia');
                                                                                loadPartnerUsers(selectedPartner.id);
                                                                            } catch (err) {
                                                                                toast.error('Błąd zmiany uprawnień');
                                                                            }
                                                                        }}
                                                                        className={`px-2.5 py-1.5 text-xs rounded-lg font-medium ${pu.can_place_orders
                                                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                            }`}
                                                                    >
                                                                        {pu.can_place_orders ? '🔒 Zablokuj' : '🔓 Odblokuj'}
                                                                    </button>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (!confirm(`Usunąć ${pu.user?.full_name} z partnera?`)) return;
                                                                            try {
                                                                                await B2BService.removePartnerUser(pu.id);
                                                                                toast.success('Użytkownik usunięty');
                                                                                loadPartnerUsers(selectedPartner.id);
                                                                            } catch (err) {
                                                                                toast.error('Błąd usuwania');
                                                                            }
                                                                        }}
                                                                        className="px-2.5 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                                                                    >
                                                                        🗑️ Usuń
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'logs' && (
                                        /* ═══ ACTIVITY LOGS TAB ═══ */
                                        <div>
                                            {loadingLogs ? (
                                                <div className="text-center py-8 text-gray-400">Ładowanie logów...</div>
                                            ) : loginLogs.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400">
                                                    <div className="text-3xl mb-2">📊</div>
                                                    <p>Brak zarejestrowanej aktywności</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-3">Ostatnie {loginLogs.length} aktywności</div>
                                                    <div className="space-y-1 max-h-[450px] overflow-y-auto">
                                                        {loginLogs.map(log => (
                                                            <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm border border-transparent hover:border-gray-100">
                                                                <span className="text-gray-400 text-xs font-mono w-36 flex-shrink-0">
                                                                    {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}
                                                                </span>
                                                                <span className="font-medium text-gray-700 min-w-0">
                                                                    {activityLabels[log.activity_type] || log.activity_type}
                                                                </span>
                                                                {log.user && (
                                                                    <span className="text-xs text-gray-400 truncate">
                                                                        {log.user.full_name}
                                                                    </span>
                                                                )}
                                                                {log.page_path && (
                                                                    <span className="text-xs text-blue-400 truncate ml-auto">
                                                                        {log.page_path}
                                                                    </span>
                                                                )}
                                                                {log.ip_address && (
                                                                    <span className="text-xs text-gray-300 font-mono flex-shrink-0">
                                                                        {log.ip_address}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* ═══ EMPTY STATE ═══ */
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
