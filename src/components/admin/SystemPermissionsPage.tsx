import React, { useState, useEffect } from 'react';

import { NotificationRulesService } from '../../services/database/notificationRules.service';
import type { NotificationRule } from '../../services/database/notificationRules.service';
import { PermissionsService, AVAILABLE_MODULES } from '../../services/database/permissions.service';
import type { ModulePermission } from '../../services/database/permissions.service';
import type { UserRole } from '../../types';

export const SystemPermissionsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'modules' | 'notifications'>('modules');

    // Module State
    const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);

    // Notification State
    const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const roles: { key: UserRole; label: string }[] = [
        { key: 'admin', label: 'Administrator' },
        { key: 'manager', label: 'Manager' },
        { key: 'sales_rep', label: 'Przedstawiciel DE' },
        { key: 'sales_rep_pl', label: 'Przedstawiciel PL' },
        { key: 'partner', label: 'Partner' },
        { key: 'installer', label: 'Montażysta' }
    ];

    const notificationEvents = [
        { key: 'contract_signed', label: 'Podpisanie Umowy' },
        { key: 'installation_scheduled', label: 'Zaplanowanie Montażu' },
        { key: 'complaint_created', label: 'Zgłoszenie Reklamacji' },
        { key: 'lead_assigned', label: 'nowy Lead (Przypisanie)' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [rules, permissions] = await Promise.all([
                NotificationRulesService.getRules(),
                PermissionsService.getAllPermissions()
            ]);
            setNotificationRules(rules);
            setModulePermissions(permissions);
        } catch (err: any) {
            console.error('Error loading permissions:', err);
            setError('Nie udało się pobrać konfiguracji.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (ruleId: string, currentState: boolean) => {
        try {
            // Optimistic update
            setNotificationRules(prev => prev.map(r => r.id === ruleId ? { ...r, isEnabled: !currentState } : r));
            await NotificationRulesService.updateRule(ruleId, !currentState);
        } catch (err) {
            console.error('Failed to update rule', err);
            // Revert
            setNotificationRules(prev => prev.map(r => r.id === ruleId ? { ...r, isEnabled: currentState } : r));
        }
    };

    const handleToggleModule = async (permId: string, currentState: boolean) => {
        try {
            // Optimistic update
            setModulePermissions(prev => prev.map(p => p.id === permId ? { ...p, isEnabled: !currentState } : p));
            await PermissionsService.updatePermission(permId, !currentState);
        } catch (err) {
            console.error('Failed to update permission', err);
            // Revert
            setModulePermissions(prev => prev.map(p => p.id === permId ? { ...p, isEnabled: currentState } : p));
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie konfiguracji systemowej...</div>;

    // Group modules by category
    const groupedModules = AVAILABLE_MODULES.reduce((acc, module) => {
        if (!acc[module.category]) acc[module.category] = [];
        acc[module.category].push(module);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_MODULES[number][]>);

    const handleToggleRole = async (roleKey: UserRole, targetState: boolean) => {
        try {
            // Find all permissions for this role that need updating
            const permissionsToUpdate = modulePermissions.filter(p => p.role === roleKey && p.isEnabled !== targetState);
            const ids = permissionsToUpdate.map(p => p.id);

            if (ids.length === 0) return;

            // Optimistic Update
            setModulePermissions(prev => prev.map(p =>
                p.role === roleKey ? { ...p, isEnabled: targetState } : p
            ));

            // Parallel requests (or bulk endpoint if available, but parallel is fine for <50 items)
            // Ideally we'd have a bulk update endpoint, but for now loop is acceptable for this scale
            await Promise.all(ids.map(id => PermissionsService.updatePermission(id, targetState)));

        } catch (err) {
            console.error('Failed to bulk update', err);
            // Revert is complex here, simpler to reload
            loadData();
        }
    };

    // Helper to check if all modules for a role are enabled (for header checkbox)
    const isRoleFullyEnabled = (roleKey: UserRole) => {
        const rolePermissions = modulePermissions.filter(p => p.role === roleKey);
        return rolePermissions.length > 0 && rolePermissions.every(p => p.isEnabled);
    };

    return (
        <div className="min-h-screen bg-background text-slate-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Centrum Uprawnień
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Pełna kontrola nad dostępem do systemu i przepływem informacji.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                    </div>
                )}

                {/* TABS HEADER */}
                <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit">
                    <button
                        onClick={() => setActiveTab('modules')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all rounded-lg flex items-center gap-2 ${activeTab === 'modules'
                            ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-accent/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        Dostęp do Modułów
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all rounded-lg flex items-center gap-2 ${activeTab === 'notifications'
                            ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-accent/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        Powiadomienia
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="bg-surface border border-slate-800 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/5">

                    {activeTab === 'modules' && (
                        <div className="relative overflow-x-auto max-h-[70vh] custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-20 bg-slate-900 border-b border-slate-700 shadow-md">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-300 w-1/3 bg-slate-900">
                                            Moduł Systemowy
                                            <div className="text-[10px] font-normal text-slate-500 uppercase tracking-widest mt-1">Funkcja / Obszar</div>
                                        </th>
                                        {roles.map(role => {
                                            const allEnabled = isRoleFullyEnabled(role.key);
                                            return (
                                                <th key={role.key} className="p-4 font-semibold text-slate-300 text-center border-l border-slate-800 min-w-[120px] bg-slate-900 group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleToggleRole(role.key, !allEnabled)}>
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span>{role.label}</span>
                                                        <span className="text-[10px] font-normal text-accent/50 group-hover:text-accent transition-colors">
                                                            {allEnabled ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
                                                        </span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {Object.entries(groupedModules).map(([category, modules]) => (
                                        <React.Fragment key={category}>
                                            <tr className="bg-slate-900/30">
                                                <td colSpan={roles.length + 1} className="p-3 pl-4 text-xs font-bold text-accent uppercase tracking-wider border-y border-slate-800/50">
                                                    {category}
                                                </td>
                                            </tr>
                                            {modules.map((moduleDef) => (
                                                <tr key={moduleDef.key} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-4 border-r border-slate-800/50 group-hover:border-slate-800 transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{moduleDef.label}</span>
                                                            <span className="text-sm text-slate-500 mt-0.5">{moduleDef.description}</span>
                                                        </div>
                                                    </td>
                                                    {roles.map(role => {
                                                        const perm = modulePermissions.find(p => p.moduleKey === moduleDef.key && p.role === role.key);
                                                        const isEnabled = perm?.isEnabled || false;

                                                        return (
                                                            <td key={role.key} className="p-4 text-center border-l border-slate-800/50 relative">
                                                                <label className="relative inline-flex items-center cursor-pointer justify-center w-full h-full group/toggle">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only peer"
                                                                        checked={isEnabled}
                                                                        onChange={() => perm && handleToggleModule(perm.id, isEnabled)}
                                                                        disabled={!perm}
                                                                    />
                                                                    <div className={`
                                                                        w-9 h-5 rounded-full peer-focus:outline-none transition-all duration-300
                                                                        ${isEnabled
                                                                            ? 'bg-accent shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                                            : 'bg-slate-700/50 border border-slate-600 group-hover/toggle:border-slate-500'
                                                                        }
                                                                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                                                                        after:absolute after:top-[2px] after:left-[calc(50%-16px)] after:bg-white after:border-gray-300 
                                                                        after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm
                                                                    `}></div>
                                                                </label>
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
                    )}

                    {activeTab === 'notifications' && (
                        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 max-w-2xl w-full">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-accent/10 rounded-lg text-accent">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Matryca Powiadomień</h2>
                                        <p className="text-sm text-slate-500">Kto i kiedy otrzymuje alerty systemowe.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {notificationEvents.map((event) => (
                                        <div key={event.key} className="bg-slate-900 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-slate-200">{event.label}</h3>
                                                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">{event.key}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {roles.map(role => {
                                                    const rule = notificationRules.find(r => r.eventType === event.key && r.role === role.key);
                                                    const isEnabled = rule?.isEnabled || false;

                                                    return (
                                                        <button
                                                            key={role.key}
                                                            onClick={() => rule && handleToggleNotification(rule.id, isEnabled)}
                                                            className={`
                                                                px-3 py-1.5 text-xs font-medium rounded-full transition-all border
                                                                ${isEnabled
                                                                    ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20'
                                                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                                                }
                                                            `}
                                                        >
                                                            {role.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
