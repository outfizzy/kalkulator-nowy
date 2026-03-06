import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Mailbox {
    id: string;
    name: string;
    color: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    imap_host: string;
    imap_port: number;
    imap_user: string;
    imap_password: string;
    signature: string;
    is_active: boolean;
    assigned_users?: { user_id: string; full_name: string; email: string }[];
}

interface UserOption {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];

export const MailboxManager = ({ onChange }: { onChange?: () => void }) => {
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Load mailboxes and users
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch all mailboxes
            const { data: mbData, error: mbErr } = await supabase
                .from('mailboxes')
                .select('*')
                .order('created_at');

            if (mbErr) throw mbErr;

            // Fetch all users (for assignment multi-select)
            const { data: userData, error: userErr } = await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .in('role', ['admin', 'manager', 'sales_rep'])
                .eq('status', 'active')
                .order('full_name');

            if (userErr) throw userErr;
            setUsers(userData || []);

            // Fetch assignments for each mailbox
            const { data: assignData } = await supabase
                .from('mailbox_users')
                .select('mailbox_id, user_id');

            const assignMap: Record<string, string[]> = {};
            (assignData || []).forEach((a: any) => {
                if (!assignMap[a.mailbox_id]) assignMap[a.mailbox_id] = [];
                assignMap[a.mailbox_id].push(a.user_id);
            });

            const enriched = (mbData || []).map(mb => ({
                ...mb,
                assigned_users: (assignMap[mb.id] || []).map(uid => {
                    const u = (userData || []).find((u: any) => u.id === uid);
                    return { user_id: uid, full_name: u?.full_name || '???', email: u?.email || '' };
                })
            }));

            setMailboxes(enriched);
        } catch (err: any) {
            console.error('Load mailbox error:', err);
            toast.error('Błąd ładowania skrzynek: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMailbox = () => {
        const newMb: Mailbox = {
            id: 'new_' + Date.now(),
            name: `Skrzynka ${mailboxes.length + 1}`,
            color: COLORS[mailboxes.length % COLORS.length],
            smtp_host: 'serwer2426445.home.pl',
            smtp_port: 587,
            smtp_user: '',
            smtp_password: '',
            imap_host: 'serwer2426445.home.pl',
            imap_port: 993,
            imap_user: '',
            imap_password: '',
            signature: '',
            is_active: true,
            assigned_users: []
        };
        setMailboxes(prev => [...prev, newMb]);
        setExpandedId(newMb.id);
    };

    const handleSaveMailbox = async (mb: Mailbox) => {
        setSaving(mb.id);
        try {
            const isNew = mb.id.startsWith('new_');
            const payload = {
                name: mb.name,
                color: mb.color,
                smtp_host: mb.smtp_host,
                smtp_port: mb.smtp_port,
                smtp_user: mb.smtp_user,
                smtp_password: mb.smtp_password,
                imap_host: mb.imap_host,
                imap_port: mb.imap_port,
                imap_user: mb.imap_user,
                imap_password: mb.imap_password,
                signature: mb.signature,
                is_active: mb.is_active
            };

            let finalId = mb.id;

            if (isNew) {
                const { data, error } = await supabase
                    .from('mailboxes')
                    .insert(payload)
                    .select('id')
                    .single();
                if (error) throw error;
                finalId = data.id;
                // Update local id
                setMailboxes(prev => prev.map(m => m.id === mb.id ? { ...m, id: finalId } : m));
            } else {
                const { error } = await supabase
                    .from('mailboxes')
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', mb.id);
                if (error) throw error;
            }

            // Sync user assignments
            // 1. Delete all existing assignments for this mailbox
            await supabase.from('mailbox_users').delete().eq('mailbox_id', finalId);

            // 2. Insert current assignments
            if (mb.assigned_users && mb.assigned_users.length > 0) {
                const inserts = mb.assigned_users.map(u => ({
                    mailbox_id: finalId,
                    user_id: u.user_id
                }));
                const { error: insErr } = await supabase.from('mailbox_users').insert(inserts);
                if (insErr) throw insErr;
            }

            toast.success(`Skrzynka "${mb.name}" zapisana`);
            if (isNew) setExpandedId(finalId);
            onChange?.();
        } catch (err: any) {
            console.error('Save mailbox error:', err);
            toast.error('Błąd zapisu: ' + err.message);
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteMailbox = async (mb: Mailbox) => {
        if (!confirm(`Usunąć skrzynkę "${mb.name}"? Ta operacja jest nieodwracalna.`)) return;

        if (mb.id.startsWith('new_')) {
            setMailboxes(prev => prev.filter(m => m.id !== mb.id));
            return;
        }

        try {
            const { error } = await supabase.from('mailboxes').delete().eq('id', mb.id);
            if (error) throw error;
            setMailboxes(prev => prev.filter(m => m.id !== mb.id));
            toast.success('Skrzynka usunięta');
            if (expandedId === mb.id) setExpandedId(null);
            onChange?.();
        } catch (err: any) {
            toast.error('Błąd usuwania: ' + err.message);
        }
    };

    const updateMailbox = (id: string, updates: Partial<Mailbox>) => {
        setMailboxes(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const toggleUserAssignment = (mailboxId: string, user: UserOption) => {
        setMailboxes(prev => prev.map(m => {
            if (m.id !== mailboxId) return m;
            const current = m.assigned_users || [];
            const exists = current.find(u => u.user_id === user.id);
            if (exists) {
                return { ...m, assigned_users: current.filter(u => u.user_id !== user.id) };
            } else {
                return { ...m, assigned_users: [...current, { user_id: user.id, full_name: user.full_name, email: user.email }] };
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Skrzynki pocztowe</h3>
                        <p className="text-sm text-slate-500">Zarządzaj skrzynkami i przypisuj użytkowników</p>
                    </div>
                </div>
                <button
                    onClick={handleAddMailbox}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Dodaj skrzynkę
                </button>
            </div>

            {mailboxes.length === 0 ? (
                <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500 font-medium">Brak skrzynek pocztowych</p>
                    <p className="text-sm text-slate-400 mt-1">Dodaj pierwszą skrzynkę, aby użytkownicy mogli korzystać z poczty</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {mailboxes.map(mb => {
                        const isExpanded = expandedId === mb.id;
                        const assignedCount = mb.assigned_users?.length || 0;

                        return (
                            <div key={mb.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: mb.color }}>
                                {/* Collapsed Header */}
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : mb.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: mb.color + '20' }}>
                                            <svg className="w-4 h-4" style={{ color: mb.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{mb.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{mb.imap_user || mb.smtp_user || 'nie skonfigurowano'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">
                                            {assignedCount} {assignedCount === 1 ? 'użytkownik' : 'użytkowników'}
                                        </span>
                                        {!mb.is_active && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded">Nieaktywna</span>
                                        )}
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 space-y-5">
                                        {/* Row 1: Name, Color, Active */}
                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-5">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nazwa skrzynki</label>
                                                <input type="text" value={mb.name} onChange={e => updateMailbox(mb.id, { name: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Kolor</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={mb.color} onChange={e => updateMailbox(mb.id, { color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200" />
                                                    <div className="flex gap-1 flex-wrap">
                                                        {COLORS.map(c => (
                                                            <button key={c} onClick={() => updateMailbox(mb.id, { color: c })} className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125" style={{ backgroundColor: c, borderColor: mb.color === c ? '#1e293b' : 'transparent' }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-4 flex items-end justify-end gap-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={mb.is_active} onChange={e => updateMailbox(mb.id, { is_active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                                                    <span className="text-sm font-medium text-slate-600">Aktywna</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* SMTP Section */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Wysyłanie (SMTP)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div><label className="block text-xs text-slate-500 mb-1">Host</label><input type="text" value={mb.smtp_host || ''} onChange={e => updateMailbox(mb.id, { smtp_host: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Port</label><input type="number" value={mb.smtp_port || ''} onChange={e => updateMailbox(mb.id, { smtp_port: parseInt(e.target.value) || 587 })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Użytkownik</label><input type="text" value={mb.smtp_user || ''} onChange={e => updateMailbox(mb.id, { smtp_user: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Hasło</label><input type="password" value={mb.smtp_password || ''} onChange={e => updateMailbox(mb.id, { smtp_password: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                            </div>
                                        </div>

                                        {/* IMAP Section */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Odbieranie (IMAP)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div><label className="block text-xs text-slate-500 mb-1">Host</label><input type="text" value={mb.imap_host || ''} onChange={e => updateMailbox(mb.id, { imap_host: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Port</label><input type="number" value={mb.imap_port || ''} onChange={e => updateMailbox(mb.id, { imap_port: parseInt(e.target.value) || 993 })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Użytkownik</label><input type="text" value={mb.imap_user || ''} onChange={e => updateMailbox(mb.id, { imap_user: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                                <div><label className="block text-xs text-slate-500 mb-1">Hasło</label><input type="password" value={mb.imap_password || ''} onChange={e => updateMailbox(mb.id, { imap_password: e.target.value })} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                            </div>
                                        </div>

                                        {/* Signature */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Stopka / Podpis (HTML lub tekst)</label>
                                            <textarea value={mb.signature || ''} onChange={e => updateMailbox(mb.id, { signature: e.target.value })} rows={3} className="w-full p-2.5 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Treść stopki..." />
                                        </div>

                                        {/* User Assignment */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                Przypisani użytkownicy
                                            </h4>
                                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {users.map(u => {
                                                        const isAssigned = mb.assigned_users?.some(au => au.user_id === u.id);
                                                        return (
                                                            <button
                                                                key={u.id}
                                                                onClick={() => toggleUserAssignment(mb.id, u)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isAssigned
                                                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                                    }`}
                                                            >
                                                                {isAssigned ? (
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                ) : (
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                )}
                                                                {u.full_name || u.email}
                                                            </button>
                                                        );
                                                    })}
                                                    {users.length === 0 && (
                                                        <p className="text-xs text-slate-400">Brak aktywnych użytkowników</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => handleDeleteMailbox(mb)}
                                                className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Usuń
                                            </button>
                                            <button
                                                onClick={() => handleSaveMailbox(mb)}
                                                disabled={saving === mb.id}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold text-sm shadow-sm transition-colors"
                                            >
                                                {saving === mb.id ? (
                                                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Zapisywanie...</>
                                                ) : (
                                                    'Zapisz skrzynkę'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
