/**
 * B2B Layout
 * Layout wrapper for B2B partner portal with navigation
 */

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { B2BService, B2BPartner } from '../../services/database/b2b.service';

export function B2BLayout() {
    const { currentUser, logout } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [partner, setPartner] = useState<B2BPartner | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/b2b/dashboard', label: t('b2b.portalTitle'), icon: '🏠' }, // Using portalTitle temporarily or add dashboard key to b2b
        { path: '/b2b/calculator', label: t('b2b.newOffer'), icon: '➕' },
        { path: '/b2b/offers', label: t('b2b.myOffers'), icon: '📋' },
        { path: '/b2b/orders', label: t('b2b.orders'), icon: '🛒' },
        { path: '/b2b/promotions', label: t('b2b.promotions'), icon: '🔥' },
        { path: '/b2b/materials', label: 'Materiały', icon: '📂' },
        { path: '/b2b/credit', label: t('b2b.credit'), icon: '💳' },
        { path: '/b2b/invoices', label: t('b2b.invoices'), icon: '📄' },
    ];

    useEffect(() => {
        loadPartner();
    }, []);

    async function loadPartner() {
        try {
            // Auto-create partner record if it doesn't exist
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                                B2B
                            </div>
                            <div className="hidden sm:block">
                                <div className="font-bold text-gray-900">Partner Portal</div>
                                {partner && (
                                    <div className="text-xs text-gray-500">{partner.company_name}</div>
                                )}
                            </div>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:block text-right">
                                <div className="text-sm font-medium text-gray-900">
                                    {currentUser?.full_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {currentUser?.email}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('b2b.logout')}
                            </button>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                            >
                                {mobileMenuOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-white p-4">
                        <nav className="flex flex-col gap-2">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <span className="text-xl">{item.icon}</span>
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

            {/* Footer */}
            <footer className="bg-white border-t py-6 mt-auto">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-500">
                            © {new Date().getFullYear()} TGA Partner Portal
                        </div>
                        <div className="flex gap-6 text-sm text-gray-500">
                            <a href="#" className="hover:text-gray-700">{t('b2b.help')}</a>
                            <a href="#" className="hover:text-gray-700">{t('b2b.contact')}</a>
                            <a href="#" className="hover:text-gray-700">{t('b2b.terms')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default B2BLayout;
