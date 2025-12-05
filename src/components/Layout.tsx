import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
    const { currentUser, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!currentUser) return null;

    const userInitials = `${currentUser.firstName[0]}${currentUser.lastName[0]}`;
    const roleName = isAdmin() ? 'Administrator' : 'Przedstawiciel';

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 bg-primary text-white hidden md:flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-800">
                    <img
                        src="/logo.png"
                        alt="PolenDach 24"
                        className="w-full h-auto max-w-[200px] brightness-0 invert"
                    />
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    <NavLink to="/dashboard" label="Dashboard" icon="dashboard" />
                    <NavLink to="/new-offer" label="Nowa Oferta" icon="plus" />
                    <NavLink to="/offers" label="Lista Ofert" icon="offers" />
                    <NavLink to="/customers" label="Klienci" icon="users" />
                    <NavLink to="/reports" label="Raporty" icon="reports" />
                    <NavLink to="/installations" label="Planowanie Montaży" icon="map" />
                    <NavLink to="/contracts" label="Lista Umów" icon="contracts" />
                    <NavLink to="/deliveries" label="Kalendarz Dostaw" icon="calendar" />
                    {isAdmin() && <NavLink to="/admin/users" label="Użytkownicy" icon="settings" />}
                    {isAdmin() && <NavLink to="/admin/partner-offers" label="Oferty Partnerów" icon="clipboard" />}
                    <NavLink to="/admin/stats" label="Statystyki" icon="dashboard" />
                    <NavLink to="/settings" label="Ustawienia" icon="settings" />
                </nav>
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">
                            {userInitials}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{currentUser.firstName} {currentUser.lastName}</p>
                            <p className="text-xs text-slate-400">{roleName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Wyloguj
                    </button>
                </div>
            </aside>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <aside className="fixed top-0 left-0 bottom-0 w-80 bg-primary text-white z-50 md:hidden flex flex-col transform transition-transform">
                        {/* Header with close button */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <img
                                src="/logo.png"
                                alt="PolenDach 24"
                                className="h-12 w-auto brightness-0 invert"
                            />
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                aria-label="Close menu"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                            <NavLink to="/dashboard" label="Dashboard" icon="dashboard" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/new-offer" label="Nowa Oferta" icon="plus" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/offers" label="Lista Ofert" icon="offers" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/reports" label="Raporty" icon="reports" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/installations" label="Planowanie Montaży" icon="map" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/contracts" label="Lista Umów" icon="contracts" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/deliveries" label="Kalendarz Dostaw" icon="calendar" onClick={() => setMobileMenuOpen(false)} />
                            {isAdmin() && <NavLink to="/admin/users" label="Użytkownicy" icon="settings" onClick={() => setMobileMenuOpen(false)} />}
                            {isAdmin() && <NavLink to="/admin/partner-offers" label="Oferty Partnerów" icon="clipboard" onClick={() => setMobileMenuOpen(false)} />}
                            <NavLink to="/admin/stats" label="Statystyki" icon="dashboard" onClick={() => setMobileMenuOpen(false)} />
                            <NavLink to="/settings" label="Ustawienia" icon="settings" onClick={() => setMobileMenuOpen(false)} />
                        </nav>

                        <div className="p-4 border-t border-slate-800 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-lg">
                                    {userInitials}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{currentUser.firstName} {currentUser.lastName}</p>
                                    <p className="text-xs text-slate-400">{roleName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                                className="w-full px-4 py-3 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Wyloguj
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b border-slate-200 bg-surface flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h2 className="text-lg font-semibold text-slate-800">Kreator Ofert</h2>
                    </div>
                    {/* Mobile logo */}
                    <div className="md:hidden">
                        <img src="/logo.png" alt="PolenDach 24" className="h-8 w-auto" />
                    </div>
                </header>
                <div className="flex-1 p-4 md:p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

interface NavLinkProps {
    to: string;
    label: string;
    icon: 'dashboard' | 'offers' | 'plus' | 'settings' | 'reports' | 'map' | 'contracts' | 'clipboard' | 'calendar' | 'users';
    onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, icon, onClick }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    const icons = {
        dashboard: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
        plus: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
        offers: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
        reports: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        map: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        ),
        contracts: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        clipboard: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        ),
        calendar: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        settings: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        users: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    };

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                ? 'bg-accent/10 text-accent'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            {icons[icon]}
            {label}
        </Link>
    );
};

