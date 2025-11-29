import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { UserRole } from '../../types';

export const PartnerRegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        companyName: '',
        nip: '',
        role: 'partner' as UserRole
    });
    const [loading, setLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Hasła nie są identyczne');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Hasło musi mieć minimum 8 znaków');
            return;
        }

        setLoading(true);

        try {
            // Pass company data in metadata
            const { error } = await register({
                ...formData,
                // These will be passed to supabase metadata and handled by the trigger
            });
            if (error) throw error;

            setShowSuccessMessage(true);

            setTimeout(() => {
                navigate('/partner/login');
            }, 8000);
        } catch (error: any) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Błąd rejestracji. Spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    };

    if (showSuccessMessage) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mb-4">
                                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Wniosek przyjęty!
                            </h2>
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-6">
                                <p className="text-emerald-300 text-sm leading-relaxed">
                                    Dziękujemy za rejestrację w Strefie Partnera B2B.
                                    Twoje konto firmowe oczekuje na weryfikację przez dział handlowy.
                                    <br /><br />
                                    Proces akceptacji trwa zwykle do <strong className="text-emerald-200">24 godzin roboczych</strong>.
                                    Po weryfikacji danych firmy otrzymasz pełny dostęp do cen hurtowych i konfiguratora.
                                </p>
                            </div>
                            <p className="text-slate-400 mt-6 text-sm">
                                Za chwilę nastąpi przekierowanie do logowania...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Side - Info */}
                <div className="hidden lg:block space-y-8">
                    <div>
                        <img src="/logo.png" alt="PolenDach 24" className="h-16 w-auto mb-8" />
                        <h1 className="text-4xl font-bold text-white mb-4">
                            Zostań Partnerem B2B
                        </h1>
                        <p className="text-xl text-slate-400">
                            Dołącz do grona profesjonalistów i korzystaj z dedykowanych warunków współpracy.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Ceny Hurtowe</h3>
                                <p className="text-slate-400 text-sm">Dostęp do specjalnych cenników dla partnerów i atrakcyjne marże.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Kalkulator Ofert</h3>
                                <p className="text-slate-400 text-sm">Błyskawiczne tworzenie wycen i generowanie profesjonalnych ofert PDF.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Wsparcie Techniczne</h3>
                                <p className="text-slate-400 text-sm">Priorytetowa pomoc techniczna i dostęp do dokumentacji montażowej.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 lg:hidden">Rejestracja Partnera</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Company Info Section */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Dane Firmy</h3>

                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">
                                    Nazwa Firmy *
                                </label>
                                <input
                                    id="companyName"
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="Nazwa Twojej Firmy Sp. z o.o."
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="nip" className="block text-sm font-medium text-slate-300 mb-2">
                                    NIP (Opcjonalnie)
                                </label>
                                <input
                                    id="nip"
                                    type="text"
                                    value={formData.nip}
                                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="1234567890"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-700 my-4"></div>

                        {/* Contact Person Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Osoba Kontaktowa</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                                        Imię *
                                    </label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="Jan"
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
                                        Nazwisko *
                                    </label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="Kowalski"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Adres email *
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="biuro@twojafirma.pl"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                                    Telefon *
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="+48 123 456 789"
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                        Hasło *
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={8}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                                        Potwierdź hasło *
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-emerald-200">
                                    <p className="font-medium mb-1">Weryfikacja Partnera</p>
                                    <p className="text-emerald-300/80">
                                        Konto wymaga akceptacji administratora (do 24h).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 mt-6"
                        >
                            {loading ? 'Przetwarzanie...' : 'Zarejestruj Firmę'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Masz już konto partnera?{' '}
                            <button
                                onClick={() => navigate('/partner/login')}
                                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                            >
                                Zaloguj się
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
