import { useState, useEffect } from 'react';
import type { User } from '../types';
import { DatabaseService } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState<Partial<User>>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        monthlyTarget: 50000
    });

    useEffect(() => {
        if (currentUser && profile.email !== currentUser.email) {
            setProfile({
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email,
                phone: currentUser.phone || '',
                monthlyTarget: currentUser.monthlyTarget || 50000
            });
        }
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
            console.error('Error saving profile:', error);
            toast.error('Błąd zapisu profilu');
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
        </div>
    );
};
