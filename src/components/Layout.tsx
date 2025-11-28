import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
    const { currentUser, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

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
                        className="w-full h-auto max-w-[200px]"
                    />
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    <NavLink to="/" label="Dashboard" icon="dashboard" />
                    <NavLink to="/new-offer" label="Nowa Oferta" icon="plus" />
                    <NavLink to="/offers" label="Lista Ofert" icon="offers" />
                    <NavLink to="/reports" label="Raporty" icon="reports" />
                    <NavLink to="/installations" label="Planowanie Montaży" icon="map" />
                    <NavLink to="/contracts" label="Lista Umów" icon="contracts" />
                    {isAdmin() && <NavLink to="/admin/users" label="Użytkownicy" icon="settings" />}
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b border-slate-200 bg-surface flex items-center justify-between px-8">
                    <h2 className="text-lg font-semibold text-slate-800">Kreator Ofert</h2>
                    <div className="md:hidden">
                        {/* Mobile menu button placeholder */}
                        <button className="p-2 text-slate-600">Menu</button>
                    </div>
                </header>
                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-4xl mx-auto">
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
    icon: 'dashboard' | 'offers' | 'plus' | 'settings' | 'reports' | 'map' | 'contracts';
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, icon }) => {
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
        settings: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    };

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${isActive
                ? 'bg-accent/10 text-accent'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            {icons[icon]}
            {label}
        </Link>
    );
};

