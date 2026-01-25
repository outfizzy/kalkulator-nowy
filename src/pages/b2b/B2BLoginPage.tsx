/**
 * B2B Partner Login Page
 * Login page for B2B partners
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export function B2BLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Proszę podać email i hasło');
            return;
        }

        setLoading(true);

        try {
            const { error } = await login(email, password);

            if (error) {
                throw new Error(error.message || 'Błąd logowania');
            }

            // Navigate to B2B dashboard - AuthContext will handle role check
            navigate('/b2b/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Błąd logowania. Sprawdź dane i spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
                            <span className="text-white font-bold text-xl">B2B</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Partner Portal</h1>
                        <p className="text-slate-400 mt-1">Zaloguj się do strefy partnera</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="twoj@email.pl"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Hasło
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Logowanie...
                                </span>
                            ) : (
                                'Zaloguj się'
                            )}
                        </button>
                    </form>

                    {/* Pending account notice */}
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-300 text-sm text-center">
                            <strong>Uwaga:</strong> Nowe konta wymagają weryfikacji przez dział handlowy przed pierwszym logowaniem.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-slate-400 text-sm">
                            Nie masz jeszcze konta?{' '}
                            <Link
                                to="/b2b/register"
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Zarejestruj swoją firmę
                            </Link>
                        </p>
                        <p className="text-slate-500 text-xs">
                            <Link
                                to="/"
                                className="hover:text-slate-400 transition-colors"
                            >
                                ← Powrót do strony głównej
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                        <div className="text-2xl mb-2">💰</div>
                        <div className="text-slate-400 text-xs">Ceny hurtowe</div>
                    </div>
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                        <div className="text-2xl mb-2">📋</div>
                        <div className="text-slate-400 text-xs">Kalkulator ofert</div>
                    </div>
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                        <div className="text-2xl mb-2">🚚</div>
                        <div className="text-slate-400 text-xs">Szybka dostawa</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default B2BLoginPage;
