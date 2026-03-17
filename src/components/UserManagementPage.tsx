import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/database';
import { toast } from 'react-hot-toast';
import type { User, CommissionConfig } from '../types';
import { CommissionSettingsModal } from './admin/CommissionSettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nigdy';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Nigdy';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Teraz';
    if (diffMin < 60) return `${diffMin}min temu`;
    if (diffHrs < 24) return `${diffHrs}h temu`;
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays}d temu`;
    return d.toLocaleDateString('pl-PL');
};

// ─── Role config ──────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: 'Administrator', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    manager: { label: 'Manager', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    sales_rep: { label: 'Handlowiec', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    b2b_partner: { label: 'Partner B2B', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    partner: { label: 'Partner (Legacy)', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    installer: { label: 'Monter', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    b2b_manager: { label: 'Manager B2B', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
};

const getRoleName = (role: string) => ROLE_CONFIG[role]?.label || role;

export const UserManagementPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [lastLogins, setLastLogins] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'internal' | 'partners'>('internal');
    const [selectedUserForCommission, setSelectedUserForCommission] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const navigate = useNavigate();

    // Add user modal state
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'installer' as string, username: '' });
    const [creating, setCreating] = useState(false);
    const [useLogin, setUseLogin] = useState(false); // true = username only (no email)

    const loadUsers = async () => {
        try {
            setLoading(true);
            const allUsers = await DatabaseService.getAllUsers();
            setUsers(allUsers);
            try {
                const { data: loginData } = await supabase.rpc('get_users_last_login');
                if (loginData) {
                    const map: Record<string, string | null> = {};
                    (loginData as any[]).forEach((r: any) => { map[r.user_id] = r.last_sign_in_at; });
                    setLastLogins(map);
                }
            } catch (e) {
                console.warn('Could not fetch last logins:', e);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Błąd wczytywania użytkowników');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    // ─── Handlers (unchanged logic) ─────────────────────────
    const handleApprove = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (user?.role === 'partner' || user?.role === 'b2b_partner') {
                const defaultMargin = user.partnerMargin ? Math.round(user.partnerMargin * 100) : 25;
                const input = window.prompt('Podaj marżę B2B w % (np. 25):', defaultMargin.toString());
                if (input === null) return;
                const value = parseFloat(input.replace(',', '.'));
                if (isNaN(value) || value <= 0 || value > 100) {
                    toast.error('Nieprawidłowa marża. Podaj wartość od 1 do 100.');
                    return;
                }
                await DatabaseService.updatePartnerMargin(userId, value / 100);
                // Sync to b2b_partners if linked
                try {
                    const { data: link } = await supabase
                        .from('b2b_partner_users')
                        .select('partner_id')
                        .eq('user_id', userId)
                        .maybeSingle();
                    if (link?.partner_id) {
                        await supabase.from('b2b_partners').update({ margin_percent: value }).eq('id', link.partner_id);
                    }
                } catch (syncErr) {
                    console.warn('Could not sync margin on approve:', syncErr);
                }
            }
            await DatabaseService.updateUserStatus(userId, 'active');
            toast.success('Użytkownik zaakceptowany');
            await loadUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error('Błąd akceptacji użytkownika');
        }
    };

    const handleBlock = async (userId: string) => {
        try {
            await DatabaseService.updateUserStatus(userId, 'blocked');
            toast.success('Użytkownik zablokowany');
            await loadUsers();
        } catch (error) {
            toast.error('Błąd blokowania użytkownika');
        }
    };

    const handleDelete = async (user: User) => {
        const confirmed = window.confirm(`Czy na pewno chcesz trwale usunąć użytkownika ${user.firstName} ${user.lastName}?`);
        if (!confirmed) return;
        try {
            await DatabaseService.deleteUser(user.id);
            toast.success('Użytkownik został usunięty');
            await loadUsers();
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Błąd usuwania użytkownika';
            toast.error(message);
        }
    };

    const handleChangeRole = async (userId: string, newRole: User['role']) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const oldRoleName = getRoleName(user.role);
        const newRoleName = getRoleName(newRole);
        if (newRole === 'admin' || newRole === 'manager' || user.role === 'admin' || user.role === 'manager') {
            if (!window.confirm(`⚠️ UWAGA: Zmiana krytycznej roli!\n\nUżytkownik: ${user.firstName} ${user.lastName}\nZmiana: ${oldRoleName} → ${newRoleName}\n\nCzy na pewno chcesz kontynuować?`)) {
                await loadUsers(); return;
            }
        } else {
            if (!window.confirm(`Zmienić rolę użytkownika?\n\n${user.firstName} ${user.lastName}\n${oldRoleName} → ${newRoleName}`)) {
                await loadUsers(); return;
            }
        }
        try {
            await DatabaseService.updateUserRole(userId, newRole);
            toast.success('Rola użytkownika została zmieniona');
            await loadUsers();
        } catch (error) {
            toast.error('Błąd zmiany roli użytkownika');
            await loadUsers();
        }
    };

    const handleSetPartnerMargin = async (user: User) => {
        const defaultMargin = user.partnerMargin ? Math.round(user.partnerMargin * 100) : 25;
        const input = window.prompt(`Marża B2B dla ${user.companyName || user.firstName}:`, defaultMargin.toString());
        if (input === null) return;
        const value = parseFloat(input.replace(',', '.'));
        if (isNaN(value) || value <= 0 || value > 100) {
            toast.error('Nieprawidłowa marża. Podaj wartość od 1 do 100.');
            return;
        }
        try {
            // 1. Update profile margin
            await DatabaseService.updatePartnerMargin(user.id, value / 100);

            // 2. Also sync to b2b_partners table if linked
            try {
                const { data: link } = await supabase
                    .from('b2b_partner_users')
                    .select('partner_id')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (link?.partner_id) {
                    await supabase
                        .from('b2b_partners')
                        .update({ margin_percent: value })
                        .eq('id', link.partner_id);
                }
            } catch (syncErr) {
                console.warn('Could not sync margin to b2b_partners:', syncErr);
            }

            toast.success('Zaktualizowano marżę partnera');
            await loadUsers();
        } catch (error) {
            toast.error('Błąd aktualizacji marży partnera');
        }
    };

    const handleSetCommissionRate = (user: User) => setSelectedUserForCommission(user);
    const handleSaveCommission = async (userId: string, rate: number, config: CommissionConfig) => {
        await DatabaseService.updateCommissionRate(userId, rate);
        await DatabaseService.updateCommissionConfig(userId, config);
        await loadUsers();
    };

    const generatePassword = () => {
        const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let pwd = '';
        for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        return pwd;
    };

    const handleCreateUser = async () => {
        const hasIdentity = useLogin ? !!newUser.username.trim() : !!newUser.email.trim();
        if (!hasIdentity || !newUser.password || !newUser.firstName) {
            toast.error('Wypełnij wymagane pola (imię + login/email + hasło)'); return;
        }
        if (newUser.password.length < 6) {
            toast.error('Hasło musi mieć minimum 6 znaków'); return;
        }
        if (useLogin && !/^[a-zA-Z0-9._-]+$/.test(newUser.username)) {
            toast.error('Login może zawierać tylko litery, cyfry, kropki, myślniki i podkreślenia'); return;
        }
        setCreating(true);
        try {
            // If using username-only, generate synthetic email
            const email = useLogin
                ? `${newUser.username.toLowerCase().trim()}@app.internal`
                : newUser.email;

            // Create auth user via signUp
            const fullName = [newUser.firstName, newUser.lastName].filter(Boolean).join(' ');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: newUser.password,
                options: {
                    data: {
                        full_name: fullName,
                        first_name: newUser.firstName,
                        last_name: newUser.lastName || '',
                        phone: newUser.phone || '',
                        role: newUser.role || 'installer',
                        username: newUser.username || '',
                    },
                    emailRedirectTo: undefined,
                }
            });

            if (signUpError) throw new Error(signUpError.message);
            if (!signUpData.user) throw new Error('Nie udało się utworzyć użytkownika');

            const newUserId = signUpData.user.id;

            // Update profile created by trigger (set full_name, email, status to active)
            await supabase.from('profiles').update({
                full_name: fullName,
                email: email,
                phone: newUser.phone || '',
                role: newUser.role || 'installer',
                status: 'active',
            }).eq('id', newUserId);

            toast.success(`Konto dla ${newUser.firstName} ${newUser.lastName} zostało utworzone${useLogin ? ` (login: ${newUser.username})` : ''}`);
            setIsAddUserOpen(false);
            setNewUser({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'installer', username: '' });
            setUseLogin(false);
            await loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Błąd tworzenia użytkownika');
        } finally {
            setCreating(false);
        }
    };

    const handleSetHourlyRate = async (user: User) => {
        const currentRate = user.hourlyRate || 0;
        const currentCurrency = user.hourlyRateCurrency || 'PLN';
        const input = window.prompt(
            `Stawka godzinowa dla ${user.firstName} ${user.lastName}\nWpisz kwotę lub format "KWOTA WALUTA" (np. 50 lub 50 EUR):`,
            `${currentRate} ${currentCurrency}`
        );
        if (input === null) return;
        const parts = input.trim().toUpperCase().split(/\s+/);
        let rateStr = parts[0];
        let currency = parts[1] || 'PLN';
        if (isNaN(parseFloat(rateStr.replace(',', '.'))) && !isNaN(parseFloat(currency.replace(',', '.')))) {
            [rateStr, currency] = [currency, rateStr];
        }
        const value = parseFloat(rateStr.replace(',', '.'));
        if (currency !== 'PLN' && currency !== 'EUR') {
            toast.error('Nieznana waluta. Użyj PLN lub EUR.'); return;
        }
        if (isNaN(value) || value < 0) {
            toast.error('Nieprawidłowa stawka.'); return;
        }
        try {
            await DatabaseService.updateHourlyRate(user.id, value, currency as 'PLN' | 'EUR');
            toast.success(`Zaktualizowano stawkę: ${value} ${currency}`);
            await loadUsers();
        } catch (error) {
            toast.error('Błąd aktualizacji stawki');
        }
    };

    const handleSetBaseSalary = async (user: User) => {
        const currentSalary = user.baseSalary || 0;
        const currentCurrency = user.baseSalaryCurrency || 'PLN';
        const input = window.prompt(
            `Podstawa miesięczna dla ${user.firstName} ${user.lastName}\nWpisz kwotę lub format "KWOTA WALUTA" (np. 4000 lub 4000 PLN):`,
            `${currentSalary} ${currentCurrency}`
        );
        if (input === null) return;
        const parts = input.trim().toUpperCase().split(/\s+/);
        let salaryStr = parts[0];
        let currency = parts[1] || 'PLN';
        if (isNaN(parseFloat(salaryStr.replace(',', '.'))) && !isNaN(parseFloat(currency.replace(',', '.')))) {
            [salaryStr, currency] = [currency, salaryStr];
        }
        const value = parseFloat(salaryStr.replace(',', '.'));
        if (currency !== 'PLN' && currency !== 'EUR') {
            toast.error('Nieznana waluta. Użyj PLN lub EUR.'); return;
        }
        if (isNaN(value) || value < 0) {
            toast.error('Nieprawidłowa kwota.'); return;
        }
        try {
            await DatabaseService.updateBaseSalary(user.id, value, currency as 'PLN' | 'EUR');
            toast.success(`Zaktualizowano podstawę: ${value} ${currency}`);
            await loadUsers();
        } catch (error) {
            toast.error('Błąd aktualizacji podstawy');
        }
    };

    const handleResetPassword = async (user: User) => {
        if (!user.email) {
            toast.error('Użytkownik nie ma przypisanego emaila');
            return;
        }
        if (!window.confirm(`Czy na pewno chcesz wysłać link do resetu hasła na adres:\n${user.email}?`)) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            toast.success(`Link do resetu hasła wysłany na ${user.email}`);
        } catch (error: any) {
            toast.error(error.message || 'Nie udało się wysłać linku resetującego');
        }
    };

    // ─── Derived Data ───────────────────────────────────────
    const filteredUsers = useMemo(() => {
        let list = users.filter(user => {
            if (activeTab === 'partners') return user.role === 'partner' || user.role === 'b2b_partner';
            return user.role !== 'partner' && user.role !== 'b2b_partner';
        });
        if (roleFilter !== 'all') {
            list = list.filter(u => u.role === roleFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(u =>
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.phone?.toLowerCase().includes(q) ||
                (u.companyName && u.companyName.toLowerCase().includes(q))
            );
        }
        return list;
    }, [users, activeTab, searchQuery, roleFilter]);

    const stats = useMemo(() => ({
        total: users.length,
        pending: users.filter(u => u.status === 'pending').length,
        active: users.filter(u => u.status === 'active').length,
        blocked: users.filter(u => u.status === 'blocked').length,
        partners: users.filter(u => u.role === 'partner' || u.role === 'b2b_partner').length,
        internal: users.filter(u => u.role !== 'partner' && u.role !== 'b2b_partner').length,
    }), [users]);

    const pendingPartners = users.filter(u => (u.role === 'partner' || u.role === 'b2b_partner') && u.status === 'pending').length;

    // ─── Status Badge ───────────────────────────────────────
    const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
        const map: Record<string, { label: string; dot: string; text: string; bg: string }> = {
            pending: { label: 'Oczekuje', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
            active: { label: 'Aktywny', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
            blocked: { label: 'Zablokowany', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
        };
        const info = map[status || ''] || { label: 'Nieznany', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${info.text} ${info.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                {info.label}
            </span>
        );
    };

    // ─── Role Badge ─────────────────────────────────────────
    const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
        const cfg = ROLE_CONFIG[role] || { label: role, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.color} ${cfg.bg}`}>
                {cfg.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-20 max-w-[1600px] mx-auto">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Zarządzanie Użytkownikami</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Zatwierdzaj, blokuj i zarządzaj kontami &mdash; {stats.total} użytkowników w systemie</p>
                </div>
                <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Dodaj Użytkownika
                </button>
            </div>

            {/* ═══ Stat Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Wszyscy', value: stats.total, sub: `Prac: ${stats.internal} | Part: ${stats.partners}`, icon: (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        ), color: 'from-violet-500 to-violet-600'
                    },
                    {
                        label: 'Oczekujący', value: stats.pending, sub: stats.pending > 0 ? 'Wymaga zatwierdzenia' : 'Brak oczekujących', icon: (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ), color: 'from-amber-500 to-amber-600'
                    },
                    {
                        label: 'Aktywni', value: stats.active, sub: 'Pełny dostęp', icon: (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ), color: 'from-emerald-500 to-emerald-600'
                    },
                    {
                        label: 'Zablokowani', value: stats.blocked, sub: 'Ograniczony dostęp', icon: (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        ), color: 'from-red-500 to-red-600'
                    },
                ].map((card, i) => (
                    <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 sm:p-5 text-white shadow-sm relative overflow-hidden`}>
                        <div className="absolute top-3 right-3 bg-white/10 rounded-lg p-2">{card.icon}</div>
                        <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-2xl sm:text-3xl font-bold mt-1">{card.value}</h3>
                        <p className="text-white/60 text-[10px] sm:text-xs mt-1">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* ═══ Search + Tabs ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Szukaj po nazwisku, emailu, telefonie..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">Wszystkie role</option>
                            {activeTab === 'internal' ? (
                                <>
                                    <option value="admin">Administrator</option>
                                    <option value="manager">Manager</option>
                                    <option value="sales_rep">Handlowiec</option>
                                    <option value="installer">Monter</option>
                                    <option value="b2b_manager">Manager B2B</option>
                                </>
                            ) : (
                                <>
                                    <option value="b2b_partner">Partner B2B</option>
                                    <option value="partner">Partner (Legacy)</option>
                                </>
                            )}
                        </select>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => { setActiveTab('internal'); setRoleFilter('all'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'internal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Pracownicy ({stats.internal})
                            </button>
                            <button
                                onClick={() => { setActiveTab('partners'); setRoleFilter('all'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'partners' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Partnerzy B2B ({stats.partners})
                                {pendingPartners > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">{pendingPartners}</span>}
                            </button>
                        </div>
                        <button onClick={loadUsers} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Odśwież">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ User Cards (Mobile) ═══ */}
            <div className="lg:hidden space-y-3">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${user.role === 'partner' || user.role === 'b2b_partner' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 text-sm">{user.firstName} {user.lastName}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                </div>
                            </div>
                            <StatusBadge status={user.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-slate-500">Rola:</div>
                            <div className="text-right"><RoleBadge role={user.role} /></div>
                            {user.phone && <>
                                <div className="text-slate-500">Telefon:</div>
                                <div className="text-right font-medium text-slate-700">{user.phone}</div>
                            </>}
                            {activeTab === 'internal' && user.role === 'sales_rep' && <>
                                <div className="text-slate-500">Prowizja:</div>
                                <div className="text-right">
                                    <button onClick={() => handleSetCommissionRate(user)} className="text-blue-600 font-semibold">
                                        {user.commissionRate ? `${(user.commissionRate * 100).toFixed(1)}%` : '5.0%'}
                                    </button>
                                </div>
                            </>}
                            {activeTab === 'internal' && <>
                                <div className="text-slate-500">Stawka (h):</div>
                                <div className="text-right">
                                    <button onClick={() => handleSetHourlyRate(user)} className="text-blue-600 font-semibold">
                                        {user.hourlyRate ? `${user.hourlyRate} ${user.hourlyRateCurrency || 'PLN'}` : 'Ustaw'}
                                    </button>
                                </div>
                                <div className="text-slate-500">Podstawa:</div>
                                <div className="text-right">
                                    <button onClick={() => handleSetBaseSalary(user)} className="text-blue-600 font-semibold">
                                        {user.baseSalary ? `${user.baseSalary} ${user.baseSalaryCurrency || 'PLN'}` : 'Ustaw'}
                                    </button>
                                </div>
                            </>}
                            {activeTab === 'partners' && <>
                                <div className="text-slate-500">Firma:</div>
                                <div className="text-right font-medium text-slate-700">{user.companyName || '-'}</div>
                                <div className="text-slate-500">Marża B2B:</div>
                                <div className="text-right">
                                    <button onClick={() => handleSetPartnerMargin(user)} className="text-blue-600 font-semibold">
                                        {user.partnerMargin ? `${Math.round(user.partnerMargin * 100)}%` : '25%'}
                                    </button>
                                </div>
                            </>}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400">Logowanie: {formatRelativeTime(lastLogins[user.id] || null)}</span>
                            <div className="flex gap-1.5">
                                {user.status === 'pending' && (
                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Zatwierdź">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                )}
                                <button onClick={() => handleResetPassword(user)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Resetuj hasło">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                </button>
                                <button onClick={() => navigate('/admin/notifications')} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Uprawnienia">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </button>
                                {user.status !== 'blocked' ? (
                                    <button onClick={() => handleBlock(user.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Zablokuj">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    </button>
                                ) : (
                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Odblokuj">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                )}
                                <button onClick={() => handleDelete(user)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ═══ Desktop Table ═══ */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Użytkownik</th>
                                {activeTab === 'partners' && (
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Firma / NIP</th>
                                )}
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rola</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Telefon</th>
                                {activeTab === 'internal' && (
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Prowizja / Stawka</th>
                                )}
                                {activeTab === 'partners' && (
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Marża B2B</th>
                                )}
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ostatnie log.</th>
                                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => {
                                const ll = lastLogins[user.id];
                                const loginTxt = formatRelativeTime(ll || null);
                                const isRecent = ll && (Date.now() - new Date(ll).getTime()) < 86400000;
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* User */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.role === 'partner' || user.role === 'b2b_partner' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Partner: company/NIP combined */}
                                        {activeTab === 'partners' && (
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="text-sm text-slate-700 font-medium">{user.companyName || '-'}</div>
                                                <div className="text-xs text-slate-400">{user.nip || ''}</div>
                                            </td>
                                        )}
                                        {/* Role */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.id, e.target.value as User['role'])}
                                                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                            >
                                                <option value="admin">Administrator</option>
                                                <option value="manager">Manager</option>
                                                <option value="sales_rep">Handlowiec</option>
                                                <option value="b2b_partner">Partner B2B</option>
                                                <option value="partner">Partner (Legacy)</option>
                                                <option value="installer">Monter</option>
                                                <option value="b2b_manager">Manager B2B</option>
                                            </select>
                                        </td>
                                        {/* Phone */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600">{user.phone || '-'}</td>
                                        {/* Commission + Hourly Rate (combined for internal) */}
                                        {activeTab === 'internal' && (
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    {user.role === 'sales_rep' ? (
                                                        <button onClick={() => handleSetCommissionRate(user)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                                                            Prow: {user.commissionRate ? `${(user.commissionRate * 100).toFixed(1)}%` : '5.0%'}
                                                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                    <button onClick={() => handleSetHourlyRate(user)} className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
                                                        {user.hourlyRate ? `${user.hourlyRate} ${user.hourlyRateCurrency || 'PLN'}/h` : 'Ustaw stawkę'}
                                                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleSetBaseSalary(user)} className="text-xs text-purple-500 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors">
                                                        💰 {user.baseSalary ? `${user.baseSalary} ${user.baseSalaryCurrency || 'PLN'}/mies.` : 'Ustaw podstawę'}
                                                        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {/* Partner Margin */}
                                        {activeTab === 'partners' && (
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <button onClick={() => handleSetPartnerMargin(user)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                                                    {user.partnerMargin ? `${Math.round(user.partnerMargin * 100)}%` : '25%'}
                                                    <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </td>
                                        )}
                                        {/* Status */}
                                        <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge status={user.status} /></td>
                                        {/* Last Login */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                            <span className={isRecent ? 'text-green-600 font-semibold' : 'text-slate-400'}>{loginTxt}</span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                {user.status === 'pending' && (
                                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Zatwierdź">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </button>
                                                )}
                                                <button onClick={() => handleResetPassword(user)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Resetuj hasło">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                                </button>
                                                <button onClick={() => navigate('/admin/notifications')} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Uprawnienia">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                </button>
                                                {user.status !== 'blocked' ? (
                                                    <button onClick={() => handleBlock(user.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Zablokuj">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Odblokuj">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(user)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-400 text-sm">
                        {searchQuery ? `Brak wyników dla "${searchQuery}"` : 'Brak użytkowników w tej kategorii'}
                    </div>
                )}
            </div>

            <CommissionSettingsModal
                isOpen={!!selectedUserForCommission}
                onClose={() => setSelectedUserForCommission(null)}
                user={selectedUserForCommission}
                onSave={handleSaveCommission}
            />

            {/* ═══ Add User Modal ═══ */}
            {isAddUserOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Dodaj Użytkownika</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {currentUser?.role === 'manager' ? 'Utwórz konto dla montażysty' : 'Utwórz nowe konto pracownika'}
                        </p>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Imię *</label>
                                    <input type="text" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Jan" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko</label>
                                    <input type="text" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="(opcjonalne)" />
                                </div>
                            </div>

                            {/* Toggle: Email or Username */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setUseLogin(false)}
                                    className={`flex-1 text-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!useLogin ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    ✉️ Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUseLogin(true)}
                                    className={`flex-1 text-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${useLogin ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    👤 Tylko Login
                                </button>
                            </div>

                            {useLogin ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Login (nazwa użytkownika) *</label>
                                    <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="jan.kowalski" />
                                    <p className="text-[10px] text-slate-400 mt-1">Użytkownik loguje się tym loginem + hasłem (bez emaila)</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
                                    <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="jan.kowalski@firma.pl" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Hasło *</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono" placeholder="Min. 6 znaków" />
                                    <button type="button" onClick={() => setNewUser({ ...newUser, password: generatePassword() })} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border border-slate-200" title="Wygeneruj hasło">
                                        🎲 Generuj
                                    </button>
                                </div>
                                {newUser.password && <p className="text-[10px] text-green-600 mt-1 font-mono">Hasło: {newUser.password}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                                <input type="tel" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="+48 600 000 000" />
                            </div>
                            {currentUser?.role === 'admin' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Rola</label>
                                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="installer">Monter</option>
                                        <option value="sales_rep">Handlowiec</option>
                                        <option value="manager">Manager</option>
                                        <option value="b2b_manager">Manager B2B</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => { setIsAddUserOpen(false); setNewUser({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'installer', username: '' }); setUseLogin(false); }} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                                Anuluj
                            </button>
                            <button onClick={handleCreateUser} disabled={creating || !(useLogin ? newUser.username : newUser.email) || !newUser.password || !newUser.firstName} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
                                {creating ? 'Tworzenie...' : 'Utwórz Konto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
