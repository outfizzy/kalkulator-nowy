import { useState, useEffect } from 'react';
import type { User, EmailConfig, MailboxConfig } from '../types';
import { MailboxManager } from './admin/MailboxManager';
import { DatabaseService } from '../services/database';
import { SettingsService } from '../services/database/settings.service';
import { GoogleCalendarService } from '../services/google-calendar.service';

import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../services/database/base.service';
import { GlobalSettingsPanel } from './admin/GlobalSettingsPanel';
import { LogisticsSettingsManager } from './admin/LogisticsSettings';
import { LegacyImportModal } from './contracts/LegacyImportModal';
import { supabase as sb } from '../lib/supabase';

export const SettingsPage: React.FC = () => {
    const { currentUser, refreshUser } = useAuth();
    const [dbError, setDbError] = useState(false);
    const [profile, setProfile] = useState<Partial<User>>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        monthlyTarget: 50000,
        substituteUserId: null,
        substituteUntil: null
    });
    const [availableSubstitutes, setAvailableSubstitutes] = useState<User[]>([]);

    // Legacy Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [mailboxes, setMailboxes] = useState<MailboxConfig[]>([]);
    const [expandedMailbox, setExpandedMailbox] = useState<number | null>(null);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'email' | 'admin' | 'security'>('profile');
    const [primaryMailboxIdx, setPrimaryMailboxIdx] = useState(0);

    // Global Settings (Admin Only)
    const [bueroConfig, setBueroConfig] = useState<EmailConfig>({
        smtpHost: 'serwer2426445.home.pl',
        smtpPort: 587,
        smtpUser: 'buero@polendach24.de',
        smtpPassword: '',
        imapHost: 'serwer2426445.home.pl',
        imapPort: 993,
        imapUser: 'buero@polendach24.de',
        imapPassword: '',
        signature: ''
    });

    // Contract Settings
    const [contractStartNumber, setContractStartNumber] = useState(1);

    // Supplier management
    const [suppliers, setSuppliers] = useState<{ id: string; name: string; contact_person: string; email: string; phone: string; notes: string; is_active: boolean }[]>([]);
    const [newSupplier, setNewSupplier] = useState({ name: '', contact_person: '', email: '', phone: '', notes: '' });
    const [savingSupplier, setSavingSupplier] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<string | null>(null);

    // Google Calendar state
    const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
    const [gcalSyncing, setGcalSyncing] = useState(false);

    // Check URL params for Google Calendar connection result
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gcal_connected') === 'true') {
            toast.success('Google Calendar erfolgreich verbunden! 📅');
            setGcalConnected(true);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('gcal_error')) {
            toast.error(`Google Calendar Fehler: ${params.get('gcal_error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    useEffect(() => {
        const loadProfileAndCheckDb = async () => {
            if (!currentUser) return;

            // 1. Diagnostic Check
            try {
                const { error } = await DatabaseService.checkEmailConfigColumn(currentUser.id);
                if (error) {
                    console.error('Diagnostic: email_config column missing', error);
                    setDbError(true);
                } else {
                    setDbError(false);
                }
            } catch (err) {
                console.error('Diagnostic check failed', err);
                setDbError(true);
            }

            // 2. Load Profile Data
            if (profile.email !== currentUser.email) {
                const currentConfig = currentUser.emailConfig || {};
                const defaultConfig = {
                    smtpHost: currentConfig.smtpHost || 'serwer2426445.home.pl',
                    smtpPort: currentConfig.smtpPort || 587,
                    smtpUser: currentConfig.smtpUser || '',
                    smtpPassword: currentConfig.smtpPassword || '',
                    imapHost: currentConfig.imapHost || 'serwer2426445.home.pl',
                    imapPort: currentConfig.imapPort || 993,
                    imapUser: currentConfig.imapUser || '',
                    imapPassword: currentConfig.imapPassword || '',
                    signature: currentConfig.signature || ''
                };

                setProfile({
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    phone: currentUser.phone || '',
                    monthlyTarget: currentUser.monthlyTarget || 50000,
                    emailConfig: defaultConfig,
                    substituteUserId: currentUser.substituteUserId || null,
                    substituteUntil: currentUser.substituteUntil ? new Date(currentUser.substituteUntil) : null,
                    clientPhone: currentUser.clientPhone || '',
                    clientEmail: currentUser.clientEmail || ''
                } as any);

                // Load mailboxes: from user.mailboxes or migrate legacy emailConfig
                if (currentUser.mailboxes && currentUser.mailboxes.length > 0) {
                    setMailboxes(currentUser.mailboxes);
                } else if (currentConfig.smtpHost || currentConfig.imapHost) {
                    // Migrate single emailConfig to first mailbox
                    setMailboxes([{
                        name: 'Osobista',
                        color: '#3b82f6',
                        ...defaultConfig
                    }]);
                }

                // Restore primary mailbox index
                const savedPrimaryIdx = (currentConfig as any)?.__primaryMailboxIndex;
                if (typeof savedPrimaryIdx === 'number') {
                    setPrimaryMailboxIdx(savedPrimaryIdx);
                }
            }

            // 3. Load Sales Reps
            try {
                const reps = await DatabaseService.getSalesReps();
                setAvailableSubstitutes(reps.filter(r => r.id !== currentUser.id));
            } catch (err) {
                console.error('Error loading substitutes:', err);
            }

            // 4. Load Global Settings
            if (currentUser.role === 'admin') {
                try {
                    const config = await SettingsService.getBueroEmailConfig();
                    if (config) {
                        setBueroConfig(prev => ({ ...prev, ...config }));
                    }
                } catch (err) {
                    console.error('Error loading global settings:', err);
                }

                // Load Contract Settings
                try {
                    const startNum = await SettingsService.getContractNumberStart();
                    setContractStartNumber(startNum);
                } catch (e) {
                    console.error('Error loading contract settings', e);
                }

                // Load Suppliers (admin + manager)
                try {
                    const { data: supData } = await sb.from('suppliers').select('*').order('name');
                    if (supData) setSuppliers(supData);
                } catch (e) { console.error('Error loading suppliers:', e); }

                // Check Google Calendar connection
                GoogleCalendarService.isConnected().then(setGcalConnected).catch(() => setGcalConnected(false));
            }
        };

        loadProfileAndCheckDb();
    }, [currentUser, profile.email]);

    const handleSaveGlobal = async () => {
        if (currentUser?.role !== 'admin') return;
        try {
            await SettingsService.updateSetting('email_buero', bueroConfig);
            toast.success('Globalne ustawienia (Biuro) zapisane pomyślnie');
        } catch (error) {
            console.error('Error saving global settings:', error);
            toast.error('Błąd zapisu ustawień globalnych');
        }
    };

    const handleSaveContractSettings = async () => {
        if (currentUser?.role !== 'admin') return;
        try {
            await SettingsService.updateContractNumberStart(contractStartNumber);
            toast.success('Początkowy numer umowy zaktualizowany');
        } catch (error) {
            console.error('Error saving contract settings:', error);
            toast.error('Błąd zapisu ustawień umów');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: name === 'monthlyTarget' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        try {
            // Use selected primary mailbox for backward compat
            const safeIdx = Math.min(primaryMailboxIdx, mailboxes.length - 1);
            const primaryMailbox = mailboxes[Math.max(0, safeIdx)];
            const emailConfig = primaryMailbox ? {
                smtpHost: primaryMailbox.smtpHost,
                smtpPort: primaryMailbox.smtpPort,
                smtpUser: primaryMailbox.smtpUser,
                smtpPassword: primaryMailbox.smtpPassword,
                imapHost: primaryMailbox.imapHost,
                imapPort: primaryMailbox.imapPort,
                imapUser: primaryMailbox.imapUser,
                imapPassword: primaryMailbox.imapPassword,
                signature: primaryMailbox.signature,
                openaiKey: primaryMailbox.openaiKey || profile.emailConfig?.openaiKey,
                __primaryMailboxIndex: safeIdx,
            } : profile.emailConfig;

            await DatabaseService.updateUserProfile({
                ...profile,
                emailConfig,
                mailboxes
            });
            await DatabaseService.updateSubstitution(
                profile.substituteUserId || null,
                profile.substituteUntil || null
            );
            toast.success('Profil i ustawienia zapisane pomyślnie');
            window.location.reload();
        } catch (error) {
            console.error('Error saving profile:', JSON.stringify(error, null, 2));
            const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
            if (errorMessage.includes('email_config') || errorMessage.includes('column')) {
                toast.error('Błąd: Brak kolumny email_config w bazie. Uruchom migrację SQL.');
            } else {
                toast.error(`Błąd zapisu: ${errorMessage}`);
            }
        }
    };

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdatePassword = async () => {
        if (!passwordData.currentPassword) {
            toast.error('Wprowadź obecne hasło');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Nowe hasła nie są identyczne');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Hasło musi mieć co najmniej 6 znaków');
            return;
        }

        try {
            const { error: verifyError } = await DatabaseService.verifyCurrentPassword(currentUser?.email || '', passwordData.currentPassword);
            if (verifyError) {
                toast.error('Obecne hasło jest nieprawidłowe');
                return;
            }

            await DatabaseService.updatePassword(passwordData.newPassword);
            toast.success('Hasło zostało zmienione');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error('Błąd zmiany hasła');
        }
    };

    const handleSystemReset = async () => {
        const confirmText = prompt('Wpisz "DELETE", aby potwierdzić całkowite wyczyszczenie systemu. Tej operacji NIE DA SIĘ cofnąć.');
        if (confirmText !== 'DELETE') {
            toast.error('Operacja anulowana - nieprawidłowe potwierdzenie.');
            return;
        }

        try {
            const { error } = await supabase.rpc('admin_wipe_crm_data');
            if (error) throw error;

            toast.success('SYSTEM WYCZYSZCZONY POMYŚLNIE');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('System Wipe Failed:', error);
            const errMsg = error instanceof Error ? error.message : 'Nieznany błąd';
            toast.error(`Błąd resetowania: ${errMsg}`);
        }
    };

    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'manager';
    const isAdminOrManager = isAdmin || isManager;
    const tabs = [
        { id: 'profile' as const, label: 'Profil', icon: '👤' },
        { id: 'email' as const, label: 'Poczta', icon: '📧' },
        ...(isAdminOrManager ? [{ id: 'admin' as const, label: 'Administracja', icon: '⚙️' }] : []),
        { id: 'security' as const, label: 'Bezpieczeństwo', icon: '🔒' },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Ustawienia</h1>
                <p className="text-slate-500 mt-1">Zarządzaj swoim profilem, pocztą i ustawieniami systemowymi</p>
            </div>

            {dbError && (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-800 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <h3 className="text-lg font-bold">Błąd Krytyczny Bazy Danych</h3>
                    </div>
                    <p className="mb-4 font-semibold">Twoja baza danych nie posiada wymaganych kolumn.</p>
                    <p className="mt-2 text-xs text-red-600 font-bold">Uruchom migrację SQL i odśwież stronę (F5).</p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${settingsTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                        <span>{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: PROFILE */}
            {settingsTab === 'profile' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-slate-800">Dane Osobowe</h3><p className="text-sm text-slate-500">Twoje podstawowe dane kontaktowe</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Imię</label><input type="text" name="firstName" value={profile.firstName || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label><input type="text" name="lastName" value={profile.lastName || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" name="email" value={profile.email || ''} disabled className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none cursor-not-allowed" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label><input type="tel" name="phone" value={profile.phone || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" /></div>
                        </div>
                        <div className="mt-6 flex justify-end"><button onClick={handleSave} className="bg-accent text-white px-6 py-2.5 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors">Zapisz Dane</button></div>
                    </div>

                    {/* Client-Facing Contact Fields */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-400">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Dane Kontaktowe dla Klientów</h3>
                                <p className="text-sm text-slate-500">Te dane będą widoczne na ofercie interaktywnej i w mailach do klientów</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon dla Klientów</label>
                                <input type="tel" name="clientPhone" value={(profile as any).clientPhone || ''} onChange={handleChange} placeholder="np. +49 151 12345678" className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none" />
                                <p className="text-xs text-slate-400 mt-1">Numer widoczny na interaktywnej ofercie</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email dla Klientów</label>
                                <input type="email" name="clientEmail" value={(profile as any).clientEmail || ''} onChange={handleChange} placeholder="np. jan@polendach24.de" className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none" />
                                <p className="text-xs text-slate-400 mt-1">Email widoczny na interaktywnej ofercie</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-xs text-indigo-700">💡 Te dane pojawiają się na stronie oferty interaktywnej obok Twojego imienia i nazwiska, a także w mailach z ofertą wysyłanych do klientów.</p>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-colors">Zapisz Dane Kontaktowe</button></div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-slate-800">Cel Sprzedażowy</h3><p className="text-sm text-slate-500">Miesięczny cel używany na Dashboardzie</p></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Miesięczny Cel Sprzedażowy (EUR)</label>
                            <input type="number" name="monthlyTarget" value={profile.monthlyTarget || 50000} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none max-w-xs" />
                            <p className="text-xs text-slate-500 mt-1">Ten cel będzie używany do obliczania paska postępu na Dashboardzie.</p>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={handleSave} className="bg-accent text-white px-6 py-2.5 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors">Zapisz Cel</button></div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-slate-800">Delegacja / Tryb Urlopowy</h3><p className="text-sm text-slate-500">Przekaż dostęp do swoich leadów i ofert innemu przedstawicielowi</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Zastępca (Kto otrzyma dostęp?)</label>
                                <select value={profile.substituteUserId || ''} onChange={(e) => setProfile(prev => ({ ...prev, substituteUserId: e.target.value || null }))} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white">
                                    <option value="">-- Brak zastępstwa --</option>
                                    {availableSubstitutes.map(user => (<option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.email})</option>))}
                                </select>
                            </div>
                            {profile.substituteUserId && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Zastępstwo ważne do (włącznie)</label>
                                    <input type="date" value={profile.substituteUntil ? new Date(profile.substituteUntil).toISOString().split('T')[0] : ''} onChange={(e) => setProfile(prev => ({ ...prev, substituteUntil: e.target.value ? new Date(e.target.value) : null }))} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none bg-white" />
                                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Wybrana osoba będzie miała pełny podgląd Twoich leadów i ofert do wskazanego dnia.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={handleSave} className="bg-accent text-white px-6 py-2.5 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors">Zapisz Zastępstwo</button></div>
                    </div>
                </div>
            )}

            {/* TAB: EMAIL */}
            {settingsTab === 'email' && (
                <div className="space-y-6">
                    {/* Primary Mailbox Selector */}
                    {mailboxes.length > 1 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <span className="text-lg">⭐</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Główna Skrzynka</h3>
                                    <p className="text-sm text-slate-500">Wybierz domyślną skrzynkę do wysyłania i odbierania maili</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {mailboxes.map((mb, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setPrimaryMailboxIdx(idx)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${primaryMailboxIdx === idx
                                                ? 'border-amber-400 bg-amber-50 shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: (mb.color || '#3b82f6') + '20', color: mb.color || '#3b82f6' }}
                                        >
                                            {primaryMailboxIdx === idx ? '⭐' : '✉️'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800">{mb.name || `Skrzynka ${idx + 1}`}</p>
                                            <p className="text-xs text-slate-400 font-mono truncate">{mb.smtpUser || mb.imapUser || '-'}</p>
                                        </div>
                                        {primaryMailboxIdx === idx && (
                                            <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase shrink-0">Główna</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button onClick={handleSave} className="bg-amber-500 text-white px-5 py-2 rounded-lg hover:bg-amber-600 font-bold text-sm shadow-sm transition-colors">Zapisz wybór</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <MailboxManager onChange={refreshUser} />
                    </div>

                    {/* OpenAI Key */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><span className="text-lg">🤖</span></div>
                            <div><h3 className="text-lg font-bold text-slate-800">Klucz AI (OpenAI)</h3><p className="text-sm text-slate-500">Opcjonalny klucz dla funkcji AI w module poczty</p></div>
                        </div>
                        <input type="password" value={profile.emailConfig?.openaiKey || ''} onChange={(e) => setProfile(prev => ({ ...prev, emailConfig: { ...prev.emailConfig, openaiKey: e.target.value } }))} placeholder="sk-proj-..." className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none font-mono text-sm" />
                        <div className="mt-4 flex justify-end"><button onClick={handleSave} className="bg-accent text-white px-6 py-2.5 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors">Zapisz Klucz</button></div>
                    </div>
                </div>
            )}

            {/* TAB: ADMIN */}
            {settingsTab === 'admin' && isAdminOrManager && (
                <div className="space-y-6">
                    {/* ── GOOGLE CALENDAR ── */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <span className="text-lg">📅</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800">Google Calendar</h3>
                                <p className="text-sm text-slate-500">Dwukierunkowa synchronizacja montaży, serwisów i dokończeń</p>
                            </div>
                            {gcalConnected === true && (
                                <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">✅ Verbunden</span>
                            )}
                            {gcalConnected === false && (
                                <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">❌ Nicht verbunden</span>
                            )}
                        </div>

                        {gcalConnected ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-800">
                                        <strong>Synchronisiert mit:</strong> buero@polendach24.de
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Montagen, Service-Termine und Nacharbeiten werden automatisch mit Google Calendar synchronisiert.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            setGcalSyncing(true);
                                            try {
                                                const events = await GoogleCalendarService.pullChanges();
                                                toast.success(`Sync abgeschlossen — ${events.length} Änderungen`);
                                            } catch {
                                                toast.error('Sync fehlgeschlagen');
                                            } finally {
                                                setGcalSyncing(false);
                                            }
                                        }}
                                        disabled={gcalSyncing}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {gcalSyncing && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                        {gcalSyncing ? 'Synchronisiere...' : '🔄 Jetzt synchronisieren'}
                                    </button>
                                    <button
                                        onClick={() => GoogleCalendarService.startAuth('/settings')}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                                    >
                                        Erneut verbinden
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm text-amber-800">
                                        Verbinden Sie Ihren Google Calendar, um Montagen, Service-Termine und Nacharbeiten automatisch zu synchronisieren.
                                    </p>
                                </div>
                                <button
                                    onClick={() => GoogleCalendarService.startAuth('/settings')}
                                    className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 hover:border-green-400 hover:bg-green-50 transition-all flex items-center gap-3 shadow-sm"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.1a6.94 6.94 0 010-4.24V7.02H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.02l3.66-2.84z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.55 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Mit Google Calendar verbinden
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-teal-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                                <span className="text-lg">🏭</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Dostawcy</h3>
                                <p className="text-sm text-slate-500">Zarządzaj listą dostawców materiałów</p>
                            </div>
                        </div>

                        {/* Existing suppliers */}
                        <div className="space-y-2 mb-4">
                            {suppliers.map(s => (
                                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${s.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-teal-500' : 'bg-slate-300'}`} />
                                    {editingSupplier === s.id ? (
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <input value={s.name} onChange={e => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} placeholder="Nazwa" className="px-2 py-1 border rounded text-sm" />
                                            <input value={s.contact_person || ''} onChange={e => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, contact_person: e.target.value } : x))} placeholder="Osoba kontaktowa" className="px-2 py-1 border rounded text-sm" />
                                            <input value={s.email || ''} onChange={e => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, email: e.target.value } : x))} placeholder="Email" className="px-2 py-1 border rounded text-sm" />
                                            <input value={s.phone || ''} onChange={e => setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, phone: e.target.value } : x))} placeholder="Telefon" className="px-2 py-1 border rounded text-sm" />
                                            <div className="col-span-2 flex gap-2">
                                                <button onClick={async () => {
                                                    const sup = suppliers.find(x => x.id === s.id);
                                                    if (!sup) return;
                                                    await sb.from('suppliers').update({ name: sup.name, contact_person: sup.contact_person, email: sup.email, phone: sup.phone, notes: sup.notes, updated_at: new Date().toISOString() }).eq('id', s.id);
                                                    toast.success('Dostawca zaktualizowany');
                                                    setEditingSupplier(null);
                                                }} className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-bold">Zapisz</button>
                                                <button onClick={() => setEditingSupplier(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs">Anuluj</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                                                {s.contact_person && <span className="text-xs text-slate-400 ml-2">({s.contact_person})</span>}
                                                {s.email && <span className="text-xs text-slate-400 ml-2">{s.email}</span>}
                                                {s.phone && <span className="text-xs text-slate-400 ml-2">{s.phone}</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setEditingSupplier(s.id)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Edytuj">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={async () => {
                                                    await sb.from('suppliers').update({ is_active: !s.is_active, updated_at: new Date().toISOString() }).eq('id', s.id);
                                                    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
                                                    toast.success(s.is_active ? 'Dostawca dezaktywowany' : 'Dostawca aktywowany');
                                                }} className={`p-1 transition-colors ${s.is_active ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-green-500'}`} title={s.is_active ? 'Dezaktywuj' : 'Aktywuj'}>
                                                    {s.is_active ? '🚫' : '✅'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {suppliers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Brak dostawców</p>}
                        </div>

                        {/* Add new supplier */}
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-4">
                            <p className="text-xs font-bold text-teal-700 uppercase mb-3">+ Nowy dostawca</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="Nazwa dostawcy *" className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
                                <input value={newSupplier.contact_person} onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} placeholder="Osoba kontaktowa" className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
                                <input value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="Email" className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
                                <input value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder="Telefon" className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button disabled={!newSupplier.name.trim() || savingSupplier} onClick={async () => {
                                    if (!newSupplier.name.trim()) return;
                                    setSavingSupplier(true);
                                    try {
                                        const { data, error } = await sb.from('suppliers').insert({
                                            name: newSupplier.name.trim(),
                                            contact_person: newSupplier.contact_person || null,
                                            email: newSupplier.email || null,
                                            phone: newSupplier.phone || null,
                                            notes: newSupplier.notes || null,
                                        }).select().single();
                                        if (error) throw error;
                                        setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                                        setNewSupplier({ name: '', contact_person: '', email: '', phone: '', notes: '' });
                                        toast.success(`Dostawca "${data.name}" dodany`);
                                    } catch (err: any) {
                                        if (err?.message?.includes('unique') || err?.code === '23505') toast.error('Dostawca o tej nazwie już istnieje');
                                        else toast.error('Błąd dodawania dostawcy');
                                    } finally { setSavingSupplier(false); }
                                }} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-40 transition-colors shadow-sm">
                                    {savingSupplier ? '⏳...' : '+ Dodaj Dostawcę'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <LogisticsSettingsManager />
                    <GlobalSettingsPanel />



                    {/* Contract Numbering */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-slate-800">Numeracja Umów</h3><p className="text-sm text-slate-500">Konfiguracja automatycznego nadawania numerów</p></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rozpocznij numerację od</label>
                            <div className="flex gap-4 items-center">
                                <input type="number" min="1" value={contractStartNumber} onChange={(e) => setContractStartNumber(parseInt(e.target.value) || 1)} className="w-32 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center font-bold" />
                                <span className="text-sm text-slate-500">Następna: <strong>UM/{new Date().getFullYear()}/{String(Math.max(contractStartNumber, 1)).padStart(3, '0')}</strong></span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">System automatycznie użyje kolejnego wolnego numeru jeśli istnieją wyższe.</p>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={handleSaveContractSettings} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm">Zapisz Numerację</button></div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 border-l-4 border-l-red-600">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-red-800">Strefa Niebezpieczna</h3><p className="text-sm text-red-600">Operacje nieodwracalne</p></div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                <div><h4 className="font-bold text-red-900">Import Umów Archiwalnych</h4><p className="text-xs text-red-700">Ręczne wprowadzanie starych umów.</p></div>
                                <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded hover:bg-red-100 font-bold text-sm">Otwórz Import</button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                <div><h4 className="font-bold text-red-900">SYSTEM RESET (WIPE)</h4><p className="text-xs text-red-700">Usuwa WSZYSTKIE dane. Zachowuje Użytkowników i Produkty.</p></div>
                                <button onClick={handleSystemReset} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-sm shadow-lg shadow-red-500/30">WYCZYŚĆ SYSTEM</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SECURITY */}
            {settingsTab === 'security' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div><h3 className="text-lg font-bold text-slate-800">Zmiana Hasła</h3><p className="text-sm text-slate-500">Zaktualizuj swoje hasło logowania</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Obecne Hasło</label><input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" placeholder="Wprowadź obecne hasło" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nowe Hasło</label><input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" placeholder="Min. 6 znaków" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Potwierdź Nowe Hasło</label><input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none" placeholder="Powtórz nowe hasło" /></div>
                        </div>
                        <div className="mt-6 flex justify-end"><button onClick={handleUpdatePassword} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 font-bold shadow-lg shadow-slate-800/20 transition-colors">Zmień Hasło</button></div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-300 mt-8 pb-4">
                <p>System ID: {import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'Unknown'}</p>
                <p>Version: 1.0.2</p>
            </div>

            <LegacyImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={() => toast.success('Import zakończony sukcesem')} />
        </div>
    );
};
