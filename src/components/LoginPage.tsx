
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await login(email, password);
            if (error) throw error;
            // Login successful - AuthContext will handle redirect via user state change or we can do it here
            navigate('/'); // AuthContext usually handles this or App.tsx routing
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Błąd logowania. Sprawdź email i hasło.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-800">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="PolenDach 24" className="h-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Logowanie</h2>
                    <p className="text-slate-400 mt-2">Zaloguj się do systemu ofertowania</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                            placeholder="twoj@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Hasło</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>

                    <div className="text-center mt-4">
                        <Link to="/register" className="text-sm text-accent hover:text-accent-hover">
                            Nie masz konta? Zarejestruj się
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};
