import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const PartnerLoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isHuman, setIsHuman] = useState(false);
    const [loading, setLoading] = useState(false);

    // Security: Honeypot & Time-based protection
    const [honeypot, setHoneypot] = useState('');
    const startTime = React.useRef(Date.now());

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Honeypot Check
        if (honeypot) {
            console.warn('Bot detected: Honeypot filled');
            return;
        }

        // 2. Time-based Check (<1s)
        const timeElapsed = Date.now() - startTime.current;
        if (timeElapsed < 1000) {
            console.warn('Bot detected: Too fast submission');
            return;
        }

        if (!isHuman) {
            toast.error('Potwierdź, że nie jesteś robotem.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await login(email, password);
            if (error) throw error;
            navigate('/partner/dashboard');
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
            {/* Left Side - B2B Benefits */}
            <div className="hidden lg:flex w-1/2 bg-slate-800 relative overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-transparent"></div>

                <div className="relative z-10 w-full max-w-lg mx-auto flex-grow flex flex-col justify-center">
                    <div className="mb-8">
                        <img src="/logo.png" alt="PolenDach 24" className="h-20 w-auto mb-8 brightness-0 invert" />

                        <h2 className="text-4xl font-bold text-white mb-6 animate-fade-in">
                            Dla Partnera B2B
                        </h2>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8 h-12 animate-fade-in">
                            Dołącz do sieci partnerskiej i korzystaj z preferencyjnych warunków współpracy.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start animate-fade-in">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Atrakcyjne Prowizje</h3>
                                <p className="text-slate-400">Przejrzysty system procentowy i wysokie marże dla partnerów.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Program Cashback</h3>
                                <p className="text-slate-400">Dodatkowe bonusy finansowe za realizację celów sprzedażowych.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1v-5l4 2v-4l-4 2z" />
                                    <path d="M16 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Darmowy Transport B2B</h3>
                                <p className="text-slate-400">Bezpieczna dostawa prosto do Twojego magazynu lub klienta.</p>
                            </div>
                        </div>

                        <div className="flex items-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Kontrola Palet</h3>
                                <p className="text-slate-400">Pełna ewidencja obrotu paletowego i dokumentacji logistycznej.</p>
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
                                Strefa Partnera B2B
                            </h2>
                            <p className="text-slate-400">
                                Zaloguj się do panelu hurtowego
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="biuro@twojafirma.pl"
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
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>

                            {/* Custom "Not a Robot" Checkbox */}
                            <div className="flex items-center p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                                <input
                                    id="isHuman"
                                    type="checkbox"
                                    checked={isHuman}
                                    onChange={(e) => setIsHuman(e.target.checked)}
                                    className="w-5 h-5 text-emerald-500 bg-slate-800 border-slate-600 rounded focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                                />
                                <label htmlFor="isHuman" className="ml-3 text-sm text-slate-300 cursor-pointer select-none">
                                    Nie jestem robotem
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
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
                                    onClick={() => navigate('/login')}
                                    className="text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center group"
                                >
                                    Jesteś Handlowcem?
                                    <span className="ml-2 text-accent group-hover:text-accent-light">Przejdź do logowania &rarr;</span>
                                </button>

                                <button
                                    onClick={() => navigate('/partner/register')}
                                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                                >
                                    Nie masz konta partnera? Zarejestruj firmę
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
