import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'sales_rep' as UserRole
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
            const { error } = await register(formData);
            if (error) throw error;

            setShowSuccessMessage(true);

            setTimeout(() => {
                navigate('/login');
            }, 5000);
        } catch (error: unknown) {
            console.error('Registration error:', error);
            const message = error instanceof Error ? error.message : 'Błąd rejestracji. Spróbuj ponownie.';
            toast.error(message);
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
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
                                <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Rejestracja przesłana pomyślnie!
                            </h2>
                            <div className="bg-accent-soft/60 border border-accent/40 rounded-lg p-4 mt-6">
                                <p className="text-accent text-sm leading-relaxed">
                                    Twoje konto zostało utworzone i oczekuje na weryfikację przez administratora systemu.
                                    Proces akceptacji trwa zwykle do <strong className="text-white">24 godzin roboczych</strong>.
                                    Po zatwierdzeniu konta otrzymasz powiadomienie email z potwierdzeniem dostępu do platformy.
                                </p>
                            </div>
                            <p className="text-slate-400 mt-6 text-sm">
                                Zostaniesz przekierowany na stronę logowania...
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

            <div className="w-full max-w-2xl relative z-10">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="PolenDach 24"
                            className="h-16 w-auto brightness-0 invert"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Dołącz do zespołu
                    </h1>
                    <p className="text-slate-400">
                        Utwórz konto w systemie ofertowym PolenDach 24
                    </p>
                </div>

                {/* Registration Form */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
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
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                placeholder="jan.kowalski@firma.pl"
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
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                placeholder="+48 123 456 789"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-2">
                                Stanowisko *
                            </label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                required
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                disabled={loading}
                            >
                                <option value="sales_rep">Przedstawiciel Handlowy</option>
                                <option value="installer">Monter</option>
                                <option value="manager">Menedżer</option>
                                <option value="admin">Administrator</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Wybierz stanowisko odpowiadające Twoim obowiązkom
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                                <p className="text-xs text-slate-500 mt-1">Minimum 8 znaków</p>
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-amber-200">
                                    <p className="font-medium mb-1">Weryfikacja konta</p>
                                    <p className="text-amber-300/80">
                                        Po rejestracji Twoje konto zostanie poddane weryfikacji przez administratora systemu.
                                        Proces akceptacji trwa zwykle do <strong>24 godzin roboczych</strong>.
                                        O aktywacji konta zostaniesz poinformowany drogą mailową.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Rejestracja...
                                </span>
                            ) : (
                                'Zarejestruj się'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Masz już konto?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-accent hover:text-accent/80 font-medium transition-colors"
                            >
                                Zaloguj się
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                        © 2024 PolenDach 24. Profesjonalne zadaszenia aluminiowe.
                    </p>
                </div>
            </div>
        </div>
    );
};
