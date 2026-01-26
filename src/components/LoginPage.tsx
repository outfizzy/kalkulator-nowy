import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Security: Honeypot & Time-based protection
    const [honeypot, setHoneypot] = useState(''); // Hidden field, should be empty
    const startTime = React.useRef(Date.now());

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Honeypot Check (If filled, it's a bot)
        if (honeypot) {
            console.warn('Bot detected: Honeypot filled');
            return;
        }

        // 2. Time-based Check (If submitted instantly < 1s, it's a bot)
        const timeElapsed = Date.now() - startTime.current;
        if (timeElapsed < 1000) {
            console.warn('Bot detected: Too fast submission');
            return;
        }

        setLoading(true);

        try {
            const { error, user } = await login(email, password);
            if (error) throw error;

            // Redirect based on role
            if (user?.role === 'partner' || user?.role === 'b2b_partner') {
                navigate('/b2b/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (error: unknown) {
            console.error('Login error:', error);
            const message = error instanceof Error ? error.message : 'Błąd logowania. Sprawdź email i hasło.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex">
            {/* Left Side - Hero / Benefits */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 transition-colors duration-500 bg-slate-800">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-transparent transition-opacity duration-500 opacity-100"></div>

                <div className="relative z-10 w-full max-w-lg mx-auto flex-grow flex flex-col justify-center">
                    <div className="mb-8">
                        <img src="/logo.png" alt="PolenDach 24" className="h-20 w-auto mb-8 brightness-0 invert" />

                        <h2 className="text-4xl font-bold text-white mb-6 animate-fade-in">
                            Dla Handlowca
                        </h2>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8 h-12 animate-fade-in">
                            Zaloguj się, aby uzyskać dostęp do nowoczesnych narzędzi sprzedaży.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start animate-fade-in">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Szybkie Ofertowanie</h3>
                                <p className="text-slate-400">Twórz profesjonalne oferty w kilka minut dzięki gotowym szablonom.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 3.666V14m-7 8h2a9.516 9.516 0 011.833-8.834m6.5 0a9.518 9.518 0 011.833 8.833m-1.833-8.833v.001M12 21a9.004 9.004 0 01-2.992-1.789m2.992 1.789a9.004 9.004 0 002.992-1.789M2.25 9.388a10.51 10.51 0 017-8.834 10.51 10.51 0 017 8.834m-14 0c1.036 2.152 1.94 4.542 2.084 7.258a11.96 11.96 0 005.918 2.029h.001" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Asystent AI</h3>
                                <p className="text-slate-400">Inteligentne wsparcie w pisaniu maili i analizie klientów.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Automatyczne Wyceny</h3>
                                <p className="text-slate-400">Błyskawiczne kalkulacje marży i kosztów instalacji.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Kalendarz i Realizacja</h3>
                                <p className="text-slate-400">Pełna kontrola nad terminami montaży i statusem zleceń.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Side Footer */}
                <div className="relative z-10 w-full max-w-lg mx-auto pt-8 border-t border-slate-700/50 mt-8 text-center lg:text-left">
                    <p className="text-white font-medium mb-1">© 2026 Polendach24 s.c. Wszelkie prawa zastrzeżone.</p>
                    <div className="text-slate-400 text-sm space-y-0.5">
                        <p>Właściciele: Tomasz Fijołek, Mariusz Duź</p>
                        <p>Kontakt: <a href="mailto:buero@polendach24.de" className="text-accent hover:text-accent/80 transition-colors">buero@polendach24.de</a></p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-slate-900">
                <div className="w-full max-w-md">
                    {/* Mobile Header (visible only on small screens) */}
                    <div className="text-center mb-8 lg:hidden">
                        <img src="/logo.png" alt="PolenDach 24" className="h-16 w-auto mx-auto mb-4 brightness-0 invert" />
                        <h1 className="text-2xl font-bold text-white">System Ofertowy</h1>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 transition-all duration-300">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Logowanie Handlowca
                            </h2>
                            <p className="text-slate-400">
                                Zaloguj się do swojego konta handlowego
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Security: Honeypot Field (Hidden) */}
                            <div className="hidden opacity-0 absolute -z-10 h-0 w-0 overflow-hidden">
                                <label htmlFor="website_url">Website</label>
                                <input
                                    type="text"
                                    id="website_url"
                                    name="website_url"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={honeypot}
                                    onChange={(e) => setHoneypot(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Adres email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                    placeholder="twoj.email@firma.pl"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                        Hasło
                                    </label>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg bg-accent hover:bg-accent/90 shadow-accent/20"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Logowanie...
                                    </span>
                                ) : (
                                    'Zaloguj się'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-700/50">
                            <div className="flex flex-col space-y-3">
                                <button
                                    onClick={() => navigate('/partner/login')}
                                    className="text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center group"
                                >
                                    Jesteś Partnerem B2B?
                                    <span className="ml-2 text-indigo-400 group-hover:text-indigo-300">Przejdź do logowania &rarr;</span>
                                </button>

                                <button
                                    onClick={() => navigate('/register')}
                                    className="text-slate-400 hover:text-accent text-sm transition-colors"
                                >
                                    Nie masz jeszcze konta? Zarejestruj się
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-slate-500 text-xs space-y-1 lg:hidden">
                        <p>© 2026 Polendach24 s.c. Wszelkie prawa zastrzeżone.</p>
                        <p>Właściciele: Tomasz Fijołek, Mariusz Duź</p>
                        <p>Kontakt: <a href="mailto:buero@polendach24.de" className="hover:text-accent transition-colors">buero@polendach24.de</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};
