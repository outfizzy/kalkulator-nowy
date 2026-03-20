/**
 * B2B Layout
 * Premium layout wrapper for B2B partner portal with modern navigation
 */

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BPartner } from '../../services/database/b2b.service';

export function B2BLayout() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const navItems = [
        { path: '/b2b/dashboard', label: 'Panel', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        )},
        { path: '/b2b/calculator', label: 'Kalkulator', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        )},
        { path: '/b2b/offers', label: 'Oferty', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        )},
        { path: '/b2b/orders', label: 'Zamówienia', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        )},
        { path: '/b2b/promotions', label: 'Promocje', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
        )},
        { path: '/b2b/materials', label: 'Materiały', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        )},
        { path: '/b2b/credit', label: 'Kredyt', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        )},
        { path: '/b2b/invoices', label: 'Faktury', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        )},
        { path: '/b2b/profile', label: 'Ustawienia', icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )},
    ];

    useEffect(() => {
        loadPartner();
    }, []);

    async function loadPartner() {
        try {
            const data = await B2BService.getOrCreateCurrentPartner();
            setPartner(data);
        } catch (err) {
            console.error('Error loading/creating partner:', err);
        }
    }

    async function handleLogout() {
        await logout();
        navigate('/');
    }

    const initials = currentUser?.full_name
        ? currentUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Premium Header */}
            <header className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
                {/* Top bar with branding and user */}
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs tracking-tight"
                                     style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                    B2B
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900"></div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-white font-bold text-sm tracking-wide">Partner Portal</div>
                                {partner && (
                                    <div className="text-slate-400 text-[11px] font-medium">{partner.company_name}</div>
                                )}
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center">
                            <div className="flex items-center gap-0.5 bg-white/[0.06] rounded-xl p-1 backdrop-blur-sm border border-white/[0.08]">
                                {navItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `group relative px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${isActive
                                                ? 'bg-white text-slate-900 shadow-sm shadow-black/10'
                                                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                                            }`
                                        }
                                    >
                                        <span className="opacity-75 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </nav>

                        {/* User section */}
                        <div className="flex items-center gap-3">
                            {/* User avatar & dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all duration-200"
                                >
                                    <div className="hidden sm:block text-right">
                                        <div className="text-[12px] font-semibold text-white leading-tight">
                                            {currentUser?.full_name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight">
                                            {partner?.company_name || currentUser?.email}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                         style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        {initials}
                                    </div>
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown menu */}
                                {userMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl shadow-black/15 border border-slate-100 z-50 overflow-hidden">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100">
                                                <div className="font-semibold text-sm text-slate-800">{currentUser?.full_name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</div>
                                            </div>
                                            <div className="p-1.5">
                                                <NavLink
                                                    to="/b2b/profile"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    Ustawienia
                                                </NavLink>
                                                <button
                                                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    Wyloguj się
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white transition-all"
                            >
                                {mobileMenuOpen ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(20px)' }}>
                        <nav className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-1">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${isActive
                                            ? 'bg-white/[0.1] text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                        }`
                                    }
                                >
                                    <span className="opacity-75">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="min-h-[calc(100vh-4rem)]">
                <Outlet />
            </main>

            {/* Premium Footer */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white"
                                 style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                B2B
                            </div>
                            <span>© {new Date().getFullYear()} Portal Partnera B2B</span>
                        </div>
                        <div className="flex gap-6 text-sm text-slate-400">
                            <a href="#" className="hover:text-slate-700 transition-colors">Pomoc</a>
                            <a href="#" className="hover:text-slate-700 transition-colors">Kontakt</a>
                            <a href="#" className="hover:text-slate-700 transition-colors">Regulamin</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default B2BLayout;
