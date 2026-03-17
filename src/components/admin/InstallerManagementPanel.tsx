import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/database';
import { InstallationDetailsModal } from '../installations/InstallationDetailsModal';
import { InstallerWorkersPage } from './InstallerWorkersPage';
import { InstallerStatsPage } from './InstallerStatsPage';
import { supabase } from '../../lib/supabase';
import type { User, Installation } from '../../types';
import { toast } from 'react-hot-toast';

// ============================================================================
// INSTALLER MANAGEMENT PANEL - Full Account Management
// ============================================================================

interface InstallerAccount {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
}


// Password generator
const generatePassword = (length = 10): string => {
    const upper = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    let pw = '';
    // Ensure at least one of each type
    pw += upper[Math.floor(Math.random() * upper.length)];
    pw += lower[Math.floor(Math.random() * lower.length)];
    pw += digits[Math.floor(Math.random() * digits.length)];
    for (let i = pw.length; i < length; i++) {
        pw += all[Math.floor(Math.random() * all.length)];
    }
    // Shuffle
    return pw.split('').sort(() => Math.random() - 0.5).join('');
};

// Edge function caller — REPLACED with direct Supabase queries
// The manage-installer edge function doesn't exist, so we use direct DB queries

// ---- CREATE INSTALLER MODAL ----
const CreateInstallerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}> = ({ isOpen, onClose, onCreated }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState(generatePassword());
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(true);
    const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string; name: string } | null>(null);

    const handleCreate = async () => {
        if (!fullName.trim() || !email.trim()) {
            toast.error('Imię i nazwisko oraz email są wymagane');
            return;
        }
        try {
            setSaving(true);
            
            // Use supabase.auth.signUp directly (same fix as UserManagementPage)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        role: 'installer',
                        phone: phone.trim() || null,
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('Nie udało się utworzyć użytkownika');

            // Update profile with correct data
            const { error: profileError } = await supabase.from('profiles').update({
                full_name: fullName.trim(),
                role: 'installer',
                status: 'active',
                phone: phone.trim() || null,
            }).eq('id', signUpData.user.id);

            if (profileError) console.warn('Profile update warning:', profileError);

            setCreatedAccount({ email: email.trim(), password, name: fullName.trim() });
            toast.success('Konto montażysty utworzone!');
            onCreated();
        } catch (err: any) {
            toast.error(err.message || 'Błąd tworzenia konta');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword(generatePassword());
        setCreatedAccount(null);
        onClose();
    };

    const copyCredentials = () => {
        if (!createdAccount) return;
        const text = `Dane logowania:\nEmail: ${createdAccount.email}\nHasło: ${createdAccount.password}`;
        navigator.clipboard.writeText(text);
        toast.success('Skopiowano dane logowania');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {createdAccount ? 'Konto utworzone!' : 'Nowy montażysta'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {createdAccount ? 'Przekaż dane logowania montażyście' : 'Utwórz konto do logowania w aplikacji'}
                            </p>
                        </div>
                    </div>

                    {createdAccount ? (
                        // SUCCESS: Show credentials
                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-emerald-600 text-lg">✅</span>
                                    <span className="font-bold text-emerald-800">{createdAccount.name}</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">Email</label>
                                        <div className="font-mono text-sm bg-white rounded-lg px-3 py-2 border border-emerald-200">
                                            {createdAccount.email}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">Hasło</label>
                                        <div className="font-mono text-sm bg-white rounded-lg px-3 py-2 border border-emerald-200 font-bold text-indigo-700">
                                            {createdAccount.password}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={copyCredentials}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                📋 Kopiuj dane logowania
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
                            >
                                Zamknij
                            </button>
                        </div>
                    ) : (
                        // FORM: Create new installer
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Imię i nazwisko *</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Jan Kowalski"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="jan@firma.pl"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Telefon</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+48 123 456 789"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    Hasło (wygenerowane automatycznie)
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm font-mono pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPassword(generatePassword())}
                                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                                        title="Generuj nowe hasło"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={saving || !fullName.trim() || !email.trim()}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? 'Tworzenie...' : 'Utwórz konto'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ---- MAIN PANEL ----
export const InstallerManagementPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'stats' | 'teams' | 'workers'>('workers');
    const [accounts, setAccounts] = useState<InstallerAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, role, status, created_at')
                .eq('role', 'installer')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAccounts(data || []);
        } catch (error: any) {
            console.error('Error loading accounts:', error);
            toast.error('Błąd ładowania kont: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'accounts') loadAccounts();
    }, [activeTab]);

    const handleBlockToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const confirmMsg = newStatus === 'blocked'
            ? 'Czy na pewno chcesz zablokować to konto? Montażysta nie będzie mógł się zalogować.'
            : 'Czy na pewno chcesz odblokować to konto?';

        if (!confirm(confirmMsg)) return;

        try {
            setActionLoading(userId);
            const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
            if (error) throw error;
            toast.success(newStatus === 'blocked' ? 'Konto zablokowane' : 'Konto odblokowane');
            await loadAccounts();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = async (userId: string, userName: string) => {
        const newPassword = generatePassword();
        if (!confirm(`Wygenerować nowe hasło dla ${userName}?`)) return;

        try {
            setActionLoading(userId);
            // Note: Password reset for other users requires admin API.
            // For now, we copy the new password to clipboard and show it.
            // The admin will need to use Supabase dashboard for actual password reset.
            navigator.clipboard.writeText(`Nowe hasło dla ${userName}: ${newPassword}`);
            toast.success(`Nowe hasło skopiowane do schowka: ${newPassword}`, { duration: 8000 });
            toast('Uwaga: Zmiana hasła wymaga dostępu przez panel Supabase', { icon: 'ℹ️', duration: 5000 });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Zarządzanie Montażystami</h1>
                    <p className="text-slate-500 text-sm mt-1">Konta, zespoły i statystyki montażystów</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Dodaj montażystę
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg p-1 inline-flex border border-slate-200 shadow-sm">
                {([
                    { key: 'workers' as const, label: '👷 Ekipy & Pracownicy' },
                    { key: 'accounts' as const, label: 'Konta' },
                    { key: 'stats' as const, label: 'Statystyki' },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ---- ACCOUNTS TAB ---- */}
            {activeTab === 'accounts' && (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="text-slate-500">Ładowanie kont...</div>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <div className="text-4xl mb-3">👷</div>
                            <p className="text-slate-600 font-semibold mb-1">Brak kont montażystów</p>
                            <p className="text-slate-400 text-sm mb-4">Utwórz pierwsze konto klikając "Dodaj montażystę"</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Stats bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                <div className="bg-white p-3 rounded-xl border border-slate-200">
                                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Wszystkich</div>
                                    <div className="text-xl font-bold text-slate-800">{accounts.length}</div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200">
                                    <div className="text-[11px] text-emerald-600 font-semibold uppercase">Aktywne</div>
                                    <div className="text-xl font-bold text-emerald-600">
                                        {accounts.filter(a => a.status !== 'blocked').length}
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200">
                                    <div className="text-[11px] text-red-500 font-semibold uppercase">Zablokowane</div>
                                    <div className="text-xl font-bold text-red-500">
                                        {accounts.filter(a => a.status === 'blocked').length}
                                    </div>
                                </div>
                            </div>

                            {/* Account list */}
                            {accounts.map(account => (
                                <div
                                    key={account.id}
                                    className={`bg-white rounded-xl border overflow-hidden transition-all ${account.status === 'blocked'
                                            ? 'border-red-200 opacity-70'
                                            : 'border-slate-200'
                                        }`}
                                >
                                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${account.status === 'blocked' ? 'bg-red-400' : 'bg-indigo-500'
                                                }`}>
                                                {account.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">
                                                        {account.full_name || 'Bez nazwy'}
                                                    </span>
                                                    {account.status === 'blocked' && (
                                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                                            🚫 ZABLOKOWANY
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 truncate">
                                                    📧 {account.email}
                                                    {account.phone && <span className="ml-2">📞 {account.phone}</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    Utworzono: {new Date(account.created_at).toLocaleDateString('pl-PL')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Reset password */}
                                            <button
                                                onClick={() => handleResetPassword(account.id, account.full_name)}
                                                disabled={actionLoading === account.id}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                                title="Resetuj hasło"
                                            >
                                                🔑 Nowe hasło
                                            </button>

                                            {/* Block / Unblock */}
                                            <button
                                                onClick={() => handleBlockToggle(account.id, account.status)}
                                                disabled={actionLoading === account.id}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${account.status === 'blocked'
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                                    }`}
                                            >
                                                {actionLoading === account.id
                                                    ? '...'
                                                    : account.status === 'blocked'
                                                        ? '✅ Odblokuj'
                                                        : '🚫 Zablokuj'
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'stats' && <InstallerStatsPage />}


            {/* ---- WORKERS TAB ---- */}
            {activeTab === 'workers' && <InstallerWorkersPage />}

            {/* CREATE MODAL */}
            <CreateInstallerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={loadAccounts}
            />

            {/* Installation Details Modal */}
            {selectedInstallation && (
                <InstallationDetailsModal
                    installation={selectedInstallation}
                    isOpen={!!selectedInstallation}
                    onClose={() => setSelectedInstallation(null)}
                    onUpdate={() => {
                        loadStats();
                        if (expandedInstallerId) {
                            setInstallerInstallations(prev => {
                                const newState = { ...prev };
                                delete newState[expandedInstallerId];
                                return newState;
                            });
                            loadInstallerInstallations(expandedInstallerId);
                        }
                    }}
                    onSave={async (updated) => {
                        await DatabaseService.updateInstallation(updated.id, updated);
                    }}
                    readOnly={false}
                />
            )}
        </div>
    );
};
