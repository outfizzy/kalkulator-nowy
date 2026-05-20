import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/database';
import { toast } from 'react-hot-toast';
import type { User, CommissionConfig } from '../types';
import { CommissionSettingsModal } from './admin/CommissionSettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCredentialsPDF, monthlyToDailyRate } from '../utils/credentialsPDF';
import {
    FileDown, UserPlus, Users, Clock, CheckCircle2, Ban,
    Search, RefreshCw, Key, ShieldCheck, Trash2, Check,
    RotateCcw, Pencil
} from 'lucide-react';

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
    sales_rep_pl: { label: 'Handlowiec PL', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
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
    const [useLogin, setUseLogin] = useState(true); // default: login@polendach24.de
    const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{ login: string; email: string; password: string; firstName: string; lastName: string; role: string } | null>(null);

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

    // Auto-generate login from first/last name
    const autoGenerateLogin = (first: string, last: string) => {
        const normalize = (s: string) => s.toLowerCase()
            .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
            .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
            .replace(/ś/g, 's').replace(/ź|ż/g, 'z')
            .replace(/[^a-z0-9]/g, '');
        const f = normalize(first);
        const l = normalize(last);
        return l ? `${f}.${l}` : f;
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
            // Login mode: use @polendach24.de domain
            const loginName = newUser.username.toLowerCase().trim();
            const email = useLogin
                ? `${loginName}@polendach24.de`
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
                        username: loginName || '',
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

            // Save credentials for PDF download
            setLastCreatedCredentials({
                login: useLogin ? loginName : email,
                email,
                password: newUser.password,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
            });

            toast.success(
                `Konto utworzone! Login: ${useLogin ? loginName : email}`,
                { duration: 6000, icon: '✅' }
            );
            // Don't close modal yet — show PDF download option
            await loadUsers();
        } catch (error: any) {
            toast.error(error.message || 'Błąd tworzenia użytkownika');
        } finally {
            setCreating(false);
        }
    };

    const handleDownloadCredentialsPDF = () => {
        if (!lastCreatedCredentials) return;
        generateCredentialsPDF({
            firstName: lastCreatedCredentials.firstName,
            lastName: lastCreatedCredentials.lastName,
            login: lastCreatedCredentials.login,
            email: lastCreatedCredentials.email,
            password: lastCreatedCredentials.password,
            role: lastCreatedCredentials.role,
            appUrl: 'https://polendach24.app',
            createdAt: new Date().toLocaleDateString('pl-PL'),
        });
        toast.success('PDF z danymi logowania pobrany');
    };

    const handleCloseAddUserModal = () => {
        setIsAddUserOpen(false);
        setLastCreatedCredentials(null);
        setNewUser({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'installer', username: '' });
        setUseLogin(true);
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
            // Show daily rate info
            const { dailyRate, hourlyRate, businessDays, monthName } = monthlyToDailyRate(value);
            toast.success(
                `Podstawa: ${value} ${currency}/mies.\n→ ${dailyRate} ${currency}/dzień (${businessDays} dni rob. w ${monthName})\n→ ${hourlyRate} ${currency}/h`,
                { duration: 5000 }
            );
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
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Zarządzanie Użytkownikami</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Zespół &middot; {stats.total} użytkowników w systemie</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Dodaj Użytkownika
                </button>
            </div>

            {/* ═══ Stat Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Wszyscy', value: stats.total, sub: `Prac: ${stats.internal} | Part: ${stats.partners}`, icon: <Users className="w-5 h-5" />, color: 'from-violet-500 to-violet-600' },
                    { label: 'Oczekujący', value: stats.pending, sub: stats.pending > 0 ? 'Wymaga zatwierdzenia' : 'Brak oczekujących', icon: <Clock className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
                    { label: 'Aktywni', value: stats.active, sub: 'Pełny dostęp', icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600' },
                    { label: 'Zablokowani', value: stats.blocked, sub: 'Ograniczony dostęp', icon: <Ban className="w-5 h-5" />, color: 'from-red-500 to-red-600' },
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                                    <option value="sales_rep_pl">Handlowiec PL 🇵🇱</option>
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
                            <RefreshCw className="w-4 h-4" />
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
                            {activeTab === 'internal' && (user.role === 'sales_rep' || user.role === 'sales_rep_pl') && <>
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
                                        {user.baseSalary ? (() => { const { dailyRate } = monthlyToDailyRate(user.baseSalary!); return `${user.baseSalary} ${user.baseSalaryCurrency || 'PLN'} (${dailyRate}/d)`; })() : 'Ustaw'}
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
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => handleResetPassword(user)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Resetuj hasło">
                                    <Key className="w-4 h-4" />
                                </button>
                                <button onClick={() => navigate('/admin/notifications')} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Uprawnienia">
                                    <ShieldCheck className="w-4 h-4" />
                                </button>
                                {user.status !== 'blocked' ? (
                                    <button onClick={() => handleBlock(user.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Zablokuj">
                                        <Ban className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Odblokuj">
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(user)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                    <Trash2 className="w-4 h-4" />
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
                                                <option value="sales_rep_pl">Handlowiec PL 🇵🇱</option>
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
                                                    {(user.role === 'sales_rep' || user.role === 'sales_rep_pl') ? (
                                                        <button onClick={() => handleSetCommissionRate(user)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                                                            Prow: {user.commissionRate ? `${(user.commissionRate * 100).toFixed(1)}%` : '5.0%'}
                                                            <Pencil className="w-3 h-3 opacity-50" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                    <button onClick={() => handleSetHourlyRate(user)} className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
                                                        {user.hourlyRate ? `${user.hourlyRate} ${user.hourlyRateCurrency || 'PLN'}/h` : 'Ustaw stawkę'}
                                                        <Pencil className="w-3 h-3 opacity-50" />
                                                    </button>
                                                    <button onClick={() => handleSetBaseSalary(user)} className="text-xs text-purple-500 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors">
                                                        💰 {user.baseSalary ? (() => { const { dailyRate } = monthlyToDailyRate(user.baseSalary!); return `${user.baseSalary} ${user.baseSalaryCurrency || 'PLN'}/mies. → ${dailyRate}/dzień`; })() : 'Ustaw podstawę'}
                                                        <Pencil className="w-3 h-3 opacity-50" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {/* Partner Margin */}
                                        {activeTab === 'partners' && (
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <button onClick={() => handleSetPartnerMargin(user)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                                                    {user.partnerMargin ? `${Math.round(user.partnerMargin * 100)}%` : '25%'}
                                                    <Pencil className="w-3 h-3 opacity-50" />
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
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleResetPassword(user)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Resetuj hasło">
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => navigate('/admin/notifications')} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Uprawnienia">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </button>
                                                {user.status !== 'blocked' ? (
                                                    <button onClick={() => handleBlock(user.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Zablokuj">
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleApprove(user.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Odblokuj">
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(user)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                                    <Trash2 className="w-4 h-4" />
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
                        {lastCreatedCredentials ? (
                            <div className="text-center space-y-5">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Konto utworzone!</h3>
                                    <p className="text-sm text-slate-500 mt-1">{lastCreatedCredentials.firstName} {lastCreatedCredentials.lastName}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-left space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Login:</span><span className="font-mono font-semibold text-slate-900">{lastCreatedCredentials.login}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">E-mail:</span><span className="font-mono text-blue-600 text-xs">{lastCreatedCredentials.email}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Hasło:</span><span className="font-mono font-semibold text-slate-900">{lastCreatedCredentials.password}</span></div>
                                </div>
                                <button onClick={handleDownloadCredentialsPDF} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors shadow-sm">
                                    <FileDown className="w-5 h-5" /> Pobierz PDF z danymi logowania
                                </button>
                                <p className="text-xs text-slate-400">Wydrukuj lub wyślij PDF pracownikowi.</p>
                                <button onClick={handleCloseAddUserModal} className="w-full px-4 py-2 text-slate-600 font-medium border border-slate-200 rounded-xl hover:bg-slate-50">Zamknij</button>
                            </div>
                        ) : (<>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Dodaj Użytkownika</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {currentUser?.role === 'manager' ? 'Utwórz konto dla montażysty' : 'Utwórz nowe konto pracownika'}
                        </p>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Imię *</label>
                                    <input type="text" value={newUser.firstName} onChange={(e) => { const val = e.target.value; const auto = useLogin ? autoGenerateLogin(val, newUser.lastName) : ''; setNewUser({ ...newUser, firstName: val, username: auto || newUser.username }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Jan" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko</label>
                                    <input type="text" value={newUser.lastName} onChange={(e) => { const val = e.target.value; const auto = useLogin ? autoGenerateLogin(newUser.firstName, val) : ''; setNewUser({ ...newUser, lastName: val, username: auto || newUser.username }); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Kowalski" />
                                </div>
                            </div>

                            {/* Toggle: Login@polendach24.de or Custom Email */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <button type="button" onClick={() => setUseLogin(true)} className={`flex-1 text-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${useLogin ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>👤 Login @polendach24.de</button>
                                <button type="button" onClick={() => setUseLogin(false)} className={`flex-1 text-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!useLogin ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>✉️ Własny Email</button>
                            </div>

                            {useLogin ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Login *</label>
                                    <div className="flex">
                                        <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })} className="flex-1 border border-slate-200 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono" placeholder="jan.kowalski" />
                                        <span className="inline-flex items-center px-3 py-2 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg text-xs text-slate-500 font-mono">@polendach24.de</span>
                                    </div>
                                    {newUser.username && <p className="text-[10px] text-blue-500 mt-1 font-mono">E-mail: {newUser.username}@polendach24.de</p>}
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
                                        <option value="sales_rep_pl">Handlowiec PL 🇵🇱</option>
                                        <option value="manager">Manager</option>
                                        <option value="b2b_manager">Manager B2B</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={handleCloseAddUserModal} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">Anuluj</button>
                            <button onClick={handleCreateUser} disabled={creating || !(useLogin ? newUser.username : newUser.email) || !newUser.password || !newUser.firstName} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">{creating ? 'Tworzenie...' : 'Utwórz Konto'}</button>
                        </div>
                        </>)}
                    </div>
                </div>
            )}
        </div>
    );
};
