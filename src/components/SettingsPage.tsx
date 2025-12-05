import { useState, useEffect } from 'react';
import type { User } from '../types';
import { DatabaseService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [dbError, setDbError] = useState(false);
    const [profile, setProfile] = useState<Partial<User>>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        monthlyTarget: 50000
    });

    useEffect(() => {
        const loadProfileAndCheckDb = async () => {
            if (!currentUser) return;

            // 1. Diagnostic Check: Verify if email_config column exists
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
                // Auto-fill defaults for Home.pl (requested by user) if empty
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
                    emailConfig: defaultConfig
                });
            }
        };

        loadProfileAndCheckDb();
    }, [currentUser, profile.email]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: name === 'monthlyTarget' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        try {
            await DatabaseService.updateUserProfile(profile);
            toast.success('Profil zapisany pomyślnie');
        } catch (error) {
            console.error('Error saving profile:', JSON.stringify(error, null, 2));
            const errorMessage = (error as any)?.message || 'Nieznany błąd';
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
            // First verify current password by attempting to sign in
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

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Ustawienia Profilu</h2>

                {dbError && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-800 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-bold">Błąd Krytyczny Bazy Danych</h3>
                        </div>
                        <p className="mb-4 font-semibold">
                            Twoja baza danych nie posiada wymaganych kolumn (email_config, monthly_target lub phone).
                        </p>
                        <p className="mb-2 text-sm">Wykonaj poniższe polecenie w Supabase SQL Editor, aby naprawić problem:</p>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto select-all cursor-text relative group">
                            <code className="block">
                                ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT '{ }'::jsonb;
                                ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_target NUMERIC DEFAULT 50000;
                                ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
                                NOTIFY pgrst, 'reload config';
                            </code>
                        </div>
                        <p className="mt-2 text-xs text-red-600 font-bold">Po wykonaniu odśwież tę stronę (F5).</p>
                    </div>
                )}


                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Dane Osobowe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                            <input
                                type="text"
                                name="firstName"
                                value={profile.firstName || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                            <input
                                type="text"
                                name="lastName"
                                value={profile.lastName || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={profile.email || ''}
                                onChange={handleChange}
                                disabled
                                className="w-full p-2 border rounded-lg bg-slate-50 text-slate-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                value={profile.phone || ''}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Miesięczny Cel Sprzedażowy (EUR)</label>
                            <input
                                type="number"
                                name="monthlyTarget"
                                value={profile.monthlyTarget || 50000}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">Ten cel będzie używany do obliczania paska postępu na Dashboardzie.</p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors"
                        >
                            Zapisz Dane
                        </button>
                    </div>
                </div>
            </div>

            {/* Email Configuration */}
            <div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Konfiguracja Poczty (SMTP/IMAP)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
                                <p className="font-bold">Informacja:</p>
                                <p>Wprowadź dane serwera pocztowego, aby wysyłać i odbierać wiadomości bezpośrednio z aplikacji.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Host SMTP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.smtpHost || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, smtpHost: e.target.value }
                                }))}
                                placeholder="np. smtp.gmail.com"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Port SMTP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.smtpPort || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, smtpPort: parseInt(e.target.value) || 587 }
                                }))}
                                placeholder="np. 587"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Użytkownik SMTP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.smtpUser || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, smtpUser: e.target.value }
                                }))}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hasło SMTP</label>
                            <input
                                type="password"
                                value={profile.emailConfig?.smtpPassword || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, smtpPassword: e.target.value }
                                }))}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>

                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-3">Ustawienia Odbierania (IMAP)</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Host IMAP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.imapHost || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, imapHost: e.target.value }
                                }))}
                                placeholder="np. imap.gmail.com"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Port IMAP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.imapPort || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, imapPort: parseInt(e.target.value) || 993 }
                                }))}
                                placeholder="np. 993"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Użytkownik IMAP</label>
                            <input
                                type="text"
                                value={profile.emailConfig?.imapUser || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, imapUser: e.target.value }
                                }))}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hasło IMAP</label>
                            <input
                                type="password"
                                value={profile.emailConfig?.imapPassword || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, imapPassword: e.target.value }
                                }))}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stopka (Podpis)</label>
                            <textarea
                                value={profile.emailConfig?.signature || ''}
                                onChange={(e) => setProfile(prev => ({
                                    ...prev,
                                    emailConfig: { ...prev.emailConfig, signature: e.target.value }
                                }))}
                                rows={4}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none font-mono text-sm"
                                placeholder="Tutaj wpisz treść swojej stopki..."
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-accent-dark font-bold shadow-lg shadow-accent/20 transition-colors"
                        >
                            Zapisz Konfigurację
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Zmiana Hasła</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Obecne Hasło</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                                placeholder="Wprowadź obecne hasło"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nowe Hasło</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                                placeholder="Min. 6 znaków"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Potwierdź Nowe Hasło</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                                placeholder="Powtórz nowe hasło"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleUpdatePassword}
                            className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 font-bold shadow-lg shadow-slate-800/20 transition-colors"
                        >
                            Zmień Hasło
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-center text-xs text-slate-300 mt-8 pb-4">
                <p>System ID: {import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'Unknown'}</p>
                <p>Version: 1.0.2</p>
            </div>
        </div>
    );
};
