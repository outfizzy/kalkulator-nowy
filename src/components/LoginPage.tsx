import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (login(username, password)) {
            toast.success('Zalogowano pomyślnie!');
            navigate('/');
        } else {
            toast.error('Nieprawidłowa nazwa użytkownika lub hasło');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="PolenDach 24"
                        className="h-16 mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-slate-800">System Ofert</h1>
                    <p className="text-slate-500 text-sm mt-2">Zaloguj się do systemu</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nazwa użytkownika
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="np. jan.kowalski"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Hasło
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
                    >
                        Zaloguj się
                    </button>
                </form>

                {/* Test Credentials */}
                <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-600 mb-2">Dane testowe:</p>
                    <div className="text-xs text-slate-600 space-y-1">
                        <p><strong>Administrator:</strong> admin / admin123</p>
                        <p><strong>Przedstawiciel 1:</strong> jan.kowalski / pass123</p>
                        <p><strong>Przedstawiciel 2:</strong> anna.nowak / pass123</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
