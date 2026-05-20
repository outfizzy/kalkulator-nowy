import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { NotificationRulesService } from '../../services/database/notificationRules.service';
import type { NotificationRule } from '../../services/database/notificationRules.service';
import { PermissionsService, AVAILABLE_MODULES } from '../../services/database/permissions.service';
import type { ModulePermission } from '../../services/database/permissions.service';
import type { UserRole } from '../../types';
import {
    ShieldCheck, Bell, LayoutGrid, Search, RefreshCw, AlertTriangle,
    ToggleLeft, ToggleRight, ChevronDown, ChevronRight
} from 'lucide-react';

export const SystemPermissionsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'modules' | 'notifications'>('modules');

    // Module State
    const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);

    // Notification State
    const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const roles: { key: UserRole; label: string; shortLabel: string; color: string }[] = [
        { key: 'admin', label: 'Administrator', shortLabel: 'Admin', color: 'text-red-600 bg-red-50 border-red-200' },
        { key: 'manager', label: 'Manager', shortLabel: 'Mgr', color: 'text-violet-600 bg-violet-50 border-violet-200' },
        { key: 'sales_rep', label: 'Handlowiec DE', shortLabel: 'DE', color: 'text-blue-600 bg-blue-50 border-blue-200' },
        { key: 'sales_rep_pl', label: 'Handlowiec PL', shortLabel: 'PL', color: 'text-rose-600 bg-rose-50 border-rose-200' },
        { key: 'installer', label: 'Montażysta', shortLabel: 'Mont', color: 'text-orange-600 bg-orange-50 border-orange-200' },
        { key: 'partner', label: 'Partner B2B', shortLabel: 'B2B', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    ];

    const notificationEvents = [
        { key: 'offer_viewed', label: 'Oferta wyświetlona', description: 'Klient otworzył link do oferty', icon: '👁️' },
        { key: 'contract_signed', label: 'Podpisanie Umowy', description: 'Nowa umowa zarejestrowana w systemie', icon: '📝' },
        { key: 'lead_assigned', label: 'Nowy Lead (przypisanie)', description: 'Lead przypisany do handlowca', icon: '🎯' },
        { key: 'installation_scheduled', label: 'Zaplanowanie Montażu', description: 'Termin montażu ustalony', icon: '📅' },
        { key: 'installation_completed', label: 'Montaż zakończony', description: 'Montaż zrealizowany', icon: '✅' },
        { key: 'installation_issue', label: 'Problem na montażu', description: 'Zgłoszenie problemu z montażem', icon: '⚠️' },
        { key: 'complaint_created', label: 'Zgłoszenie Reklamacji', description: 'Nowe zgłoszenie serwisowe', icon: '🔧' },
        { key: 'stock_low', label: 'Niski stan magazynowy', description: 'Produkt poniżej minimalnego stanu', icon: '📦' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [rules, permissions] = await Promise.all([
                NotificationRulesService.getRules(),
                PermissionsService.getAllPermissions()
            ]);
            setNotificationRules(rules);
            setModulePermissions(permissions);
        } catch (err: any) {
            console.error('Error loading permissions:', err);
            setError('Nie udało się pobrać konfiguracji uprawnień.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (ruleId: string, currentState: boolean) => {
        try {
            setNotificationRules(prev => prev.map(r => r.id === ruleId ? { ...r, isEnabled: !currentState } : r));
            await NotificationRulesService.updateRule(ruleId, !currentState);
            toast.success('Powiadomienie zaktualizowane', { duration: 1200 });
        } catch (err) {
            console.error('Failed to update rule', err);
            setNotificationRules(prev => prev.map(r => r.id === ruleId ? { ...r, isEnabled: currentState } : r));
            toast.error('Błąd aktualizacji');
        }
    };

    const handleToggleModule = async (permId: string, currentState: boolean) => {
        try {
            setModulePermissions(prev => prev.map(p => p.id === permId ? { ...p, isEnabled: !currentState } : p));
            await PermissionsService.updatePermission(permId, !currentState);
            toast.success('Uprawnienie zaktualizowane', { duration: 1200 });
        } catch (err) {
            console.error('Failed to update permission', err);
            setModulePermissions(prev => prev.map(p => p.id === permId ? { ...p, isEnabled: currentState } : p));
            toast.error('Błąd aktualizacji');
        }
    };

    const handleToggleRole = async (roleKey: UserRole, targetState: boolean) => {
        try {
            const permissionsToUpdate = modulePermissions.filter(p => p.role === roleKey && p.isEnabled !== targetState);
            const ids = permissionsToUpdate.map(p => p.id);
            if (ids.length === 0) return;

            setModulePermissions(prev => prev.map(p =>
                p.role === roleKey ? { ...p, isEnabled: targetState } : p
            ));

            await Promise.all(ids.map(id => PermissionsService.updatePermission(id, targetState)));
            toast.success(`Uprawnienia ${targetState ? 'włączone' : 'wyłączone'} dla ${roles.find(r => r.key === roleKey)?.label}`, { duration: 2000 });
        } catch (err) {
            console.error('Failed to bulk update', err);
            toast.error('Błąd masowej aktualizacji');
            loadData();
        }
    };

    const isRoleFullyEnabled = (roleKey: UserRole) => {
        const rolePermissions = modulePermissions.filter(p => p.role === roleKey);
        return rolePermissions.length > 0 && rolePermissions.every(p => p.isEnabled);
    };

    const toggleCategory = (cat: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    // Group modules by category
    const groupedModules = AVAILABLE_MODULES.reduce((acc, module) => {
        if (!acc[module.category]) acc[module.category] = [];
        acc[module.category].push(module);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_MODULES[number][]>);

    // Search filter
    const filteredGroupedModules = Object.entries(groupedModules).reduce((acc, [cat, modules]) => {
        if (!searchQuery.trim()) {
            acc[cat] = modules;
            return acc;
        }
        const q = searchQuery.toLowerCase();
        const filtered = modules.filter(m =>
            m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
        );
        if (filtered.length > 0) acc[cat] = filtered;
        return acc;
    }, {} as Record<string, typeof AVAILABLE_MODULES[number][]>);

    // Stats
    const totalModules = AVAILABLE_MODULES.length;
    const totalEnabled = modulePermissions.filter(p => p.isEnabled).length;
    const totalPossible = totalModules * roles.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-20 max-w-[1600px] mx-auto">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Centrum Uprawnień</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Pełna kontrola nad dostępem do systemu i powiadomieniami</p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                    title="Odśwież"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* ═══ KPI Cards ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white shadow-sm">
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Moduły</p>
                    <h3 className="text-2xl font-bold mt-0.5">{totalModules}</h3>
                    <p className="text-white/60 text-[10px]">Zdefiniowane w systemie</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-sm">
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Aktywne uprawnienia</p>
                    <h3 className="text-2xl font-bold mt-0.5">{totalEnabled}</h3>
                    <p className="text-white/60 text-[10px]">z {totalPossible} możliwych</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-4 text-white shadow-sm">
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Role</p>
                    <h3 className="text-2xl font-bold mt-0.5">{roles.length}</h3>
                    <p className="text-white/60 text-[10px]">Poziomy dostępu</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-sm">
                    <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Powiadomienia</p>
                    <h3 className="text-2xl font-bold mt-0.5">{notificationEvents.length}</h3>
                    <p className="text-white/60 text-[10px]">Typy zdarzeń</p>
                </div>
            </div>

            {/* ═══ Tabs + Search ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('modules')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'modules' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Dostęp do Modułów
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Bell className="w-4 h-4" />
                            Powiadomienia
                        </button>
                    </div>
                    {activeTab === 'modules' && (
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Szukaj modułu..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ MODULES TAB ═══ */}
            {activeTab === 'modules' && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/3">
                                            Moduł Systemowy
                                        </th>
                                        {roles.map(role => {
                                            const allEnabled = isRoleFullyEnabled(role.key);
                                            return (
                                                <th key={role.key} className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-l border-slate-200 min-w-[110px]">
                                                    <button
                                                        onClick={() => handleToggleRole(role.key, !allEnabled)}
                                                        className="group flex flex-col items-center gap-1 w-full hover:opacity-80 transition-opacity"
                                                    >
                                                        <span>{role.label}</span>
                                                        <span className={`text-[9px] font-normal transition-colors ${allEnabled ? 'text-emerald-500' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                                            {allEnabled ? '✓ Wszystko ON' : 'Zaznacz wszystko'}
                                                        </span>
                                                    </button>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(filteredGroupedModules).map(([category, modules]) => (
                                        <React.Fragment key={category}>
                                            {/* Category header */}
                                            <tr
                                                className="bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                                onClick={() => toggleCategory(category)}
                                            >
                                                <td colSpan={roles.length + 1} className="px-5 py-2.5">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                                        {collapsedCategories.has(category) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        {category}
                                                        <span className="text-slate-400 font-normal normal-case">({modules.length})</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Module rows */}
                                            {!collapsedCategories.has(category) && modules.map((moduleDef) => (
                                                <tr key={moduleDef.key} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-medium text-sm text-slate-800 group-hover:text-slate-900 transition-colors">{moduleDef.label}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{moduleDef.description}</div>
                                                    </td>
                                                    {roles.map(role => {
                                                        const perm = modulePermissions.find(p => p.moduleKey === moduleDef.key && p.role === role.key);
                                                        const isEnabled = perm?.isEnabled || false;

                                                        return (
                                                            <td key={role.key} className="px-3 py-3.5 text-center border-l border-slate-100">
                                                                <button
                                                                    onClick={() => perm && handleToggleModule(perm.id, isEnabled)}
                                                                    disabled={!perm}
                                                                    className={`inline-flex items-center justify-center transition-all ${!perm ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                                                                    title={`${moduleDef.label} → ${role.label}: ${isEnabled ? 'ON' : 'OFF'}`}
                                                                >
                                                                    {isEnabled ? (
                                                                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                                                                    ) : (
                                                                        <ToggleLeft className="w-8 h-8 text-slate-300 hover:text-slate-400" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-3">
                        {Object.entries(filteredGroupedModules).map(([category, modules]) => (
                            <div key={category} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200"
                                >
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                                        {collapsedCategories.has(category) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        {category}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{modules.length} modułów</span>
                                </button>
                                {!collapsedCategories.has(category) && (
                                    <div className="divide-y divide-slate-100">
                                        {modules.map(moduleDef => (
                                            <div key={moduleDef.key} className="p-4">
                                                <div className="font-medium text-sm text-slate-800 mb-1">{moduleDef.label}</div>
                                                <div className="text-xs text-slate-400 mb-3">{moduleDef.description}</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {roles.map(role => {
                                                        const perm = modulePermissions.find(p => p.moduleKey === moduleDef.key && p.role === role.key);
                                                        const isEnabled = perm?.isEnabled || false;
                                                        return (
                                                            <button
                                                                key={role.key}
                                                                onClick={() => perm && handleToggleModule(perm.id, isEnabled)}
                                                                disabled={!perm}
                                                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                                                                    isEnabled
                                                                        ? role.color
                                                                        : 'bg-slate-100 border-slate-200 text-slate-400'
                                                                } ${!perm ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            >
                                                                {role.shortLabel} {isEnabled ? '✓' : '✗'}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ═══ NOTIFICATIONS TAB ═══ */}
            {activeTab === 'notifications' && (
                <div className="space-y-3">
                    {/* Role legend */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Legenda ról</p>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => (
                                <span key={role.key} className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${role.color}`}>
                                    {role.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Event cards */}
                    {notificationEvents.map((event) => {
                        const eventRules = notificationRules.filter(r => r.eventType === event.key);
                        const activeCount = eventRules.filter(r => r.isEnabled).length;

                        return (
                            <div key={event.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all hover:shadow-md">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{event.icon}</span>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-sm">{event.label}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {activeCount}/{roles.length}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(role => {
                                        const rule = notificationRules.find(r => r.eventType === event.key && r.role === role.key);
                                        const isEnabled = rule?.isEnabled || false;

                                        return (
                                            <button
                                                key={role.key}
                                                onClick={() => rule && handleToggleNotification(rule.id, isEnabled)}
                                                disabled={!rule}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                                                    isEnabled
                                                        ? role.color + ' shadow-sm'
                                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                } ${!rule ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                {role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
