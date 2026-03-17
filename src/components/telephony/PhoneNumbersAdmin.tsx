import React, { useEffect, useState } from 'react';
import { TelephonyService, type PhoneNumber } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Profile {
    id: string;
    full_name: string;
    role: string;
}

interface PhoneNumberUser {
    id: string;
    phone_number_id: string;
    user_id: string;
    can_whatsapp: boolean;
    can_voice: boolean;
    can_sms: boolean;
}

export const PhoneNumbersAdmin: React.FC = () => {
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [phoneUsers, setPhoneUsers] = useState<PhoneNumberUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSid, setNewSid] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [newName, setNewName] = useState('');
    const [expandedNumber, setExpandedNumber] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [nums, { data: profileData }, pUsers] = await Promise.all([
                TelephonyService.getPhoneNumbers(),
                supabase.from('profiles').select('id, full_name, role').order('full_name'),
                TelephonyService.getPhoneNumberUsers(),
            ]);
            setNumbers(nums);
            setProfiles(profileData || []);
            setPhoneUsers(pUsers);
        } catch (e) {
            toast.error('Błąd ładowania');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newSid || !newNumber) { toast.error('Podaj SID i numer'); return; }
        try {
            await TelephonyService.addPhoneNumber(newSid, newNumber, newName);
            toast.success('Numer dodany');
            setShowAddForm(false); setNewSid(''); setNewNumber(''); setNewName('');
            loadData();
        } catch (e) { toast.error('Błąd dodawania'); }
    };

    const handleToggle = async (id: string, currentActive: boolean) => {
        try {
            await TelephonyService.togglePhoneNumber(id, !currentActive);
            toast.success(!currentActive ? 'Aktywowany' : 'Deaktywowany');
            loadData();
        } catch (e) { toast.error('Błąd'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Usunąć numer?')) return;
        try { await TelephonyService.deletePhoneNumber(id); toast.success('Usunięto'); loadData(); }
        catch (e) { toast.error('Błąd'); }
    };

    const toggleUserAccess = async (phoneNumberId: string, userId: string, hasAccess: boolean) => {
        try {
            if (hasAccess) {
                await TelephonyService.removePhoneNumberUser(phoneNumberId, userId);
            } else {
                await TelephonyService.addPhoneNumberUser(phoneNumberId, userId);
            }
            toast.success(hasAccess ? 'Usunięto dostęp' : 'Dodano dostęp');
            loadData();
        } catch (e) { toast.error('Błąd'); }
    };

    const toggleCap = async (phoneNumberId: string, userId: string, cap: 'can_whatsapp' | 'can_voice' | 'can_sms', current: boolean) => {
        try {
            await TelephonyService.updatePhoneNumberUserCaps(phoneNumberId, userId, { [cap]: !current });
            loadData();
        } catch (e) { toast.error('Błąd'); }
    };

    const getUsersForNumber = (phoneNumberId: string) =>
        phoneUsers.filter(pu => pu.phone_number_id === phoneNumberId);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">📱 Numery Telefonów</h1>
                    <p className="text-slate-500 text-sm mt-1">Zarządzanie numerami, dostęp użytkowników, uprawnienia WhatsApp/Voice/SMS</p>
                </div>
                <button onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Dodaj Numer
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 animate-in slide-in-from-top-2 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-3">Nowy Numer Twilio</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder="Twilio SID (PN...)" value={newSid} onChange={e => setNewSid(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <input type="tel" placeholder="+49..." value={newNumber} onChange={e => setNewNumber(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
                        <input type="text" placeholder="Nazwa (np. Vertrieb)" value={newName} onChange={e => setNewName(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Dodaj</button>
                        <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">Anuluj</button>
                    </div>
                </div>
            )}

            {/* Numbers List */}
            {loading ? (
                <div className="text-center p-12 text-slate-400">Ładowanie...</div>
            ) : numbers.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-400 mb-2 text-3xl">📱</p>
                    <p className="text-slate-500 text-sm">Dodaj numer Twilio aby zacząć.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {numbers.map(num => {
                        const assignedUsers = getUsersForNumber(num.id);
                        const isExpanded = expandedNumber === num.id;

                        return (
                            <div key={num.id} className={`bg-white rounded-xl border ${num.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'} shadow-sm overflow-hidden`}>
                                {/* Number Header */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${num.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                                            <svg className={`w-5 h-5 ${num.is_active ? 'text-green-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 font-mono text-lg">{num.phone_number}</p>
                                            <p className="text-sm text-slate-500">{num.friendly_name || 'Bez nazwy'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* User count badge */}
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                            👥 {assignedUsers.length} użytk.
                                        </span>

                                        {/* Expand button */}
                                        <button
                                            onClick={() => setExpandedNumber(isExpanded ? null : num.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                        >
                                            {isExpanded ? '▼ Zwiń' : '▶ Zarządzaj dostępem'}
                                        </button>

                                        <button
                                            onClick={() => handleToggle(num.id, num.is_active)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${num.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {num.is_active ? '● Aktywny' : '○ Nieaktywny'}
                                        </button>

                                        <button onClick={() => handleDelete(num.id)} className="text-red-400 hover:text-red-600 p-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Assigned Users Summary */}
                                {assignedUsers.length > 0 && !isExpanded && (
                                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                                        {assignedUsers.map(pu => {
                                            const profile = profiles.find(p => p.id === pu.user_id);
                                            return (
                                                <span key={pu.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                                    👤 {profile?.full_name || 'Nieznany'}
                                                    {pu.can_whatsapp && <span className="text-green-500">💬</span>}
                                                    {pu.can_voice && <span className="text-orange-500">📞</span>}
                                                    {pu.can_sms && <span className="text-purple-500">📱</span>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Expanded: User Access Panel */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            👥 Dostęp użytkowników do numeru {num.phone_number}
                                        </h4>
                                        <div className="space-y-1">
                                            {profiles.map(profile => {
                                                const pu = assignedUsers.find(u => u.user_id === profile.id);
                                                const hasAccess = !!pu;

                                                return (
                                                    <div key={profile.id} className={`flex items-center justify-between p-3 rounded-lg transition-all ${hasAccess ? 'bg-white border border-green-200 shadow-sm' : 'bg-transparent hover:bg-white/50'}`}>
                                                        <div className="flex items-center gap-3">
                                                            {/* Toggle access */}
                                                            <button
                                                                onClick={() => toggleUserAccess(num.id, profile.id, hasAccess)}
                                                                className={`w-8 h-5 rounded-full transition-all relative ${hasAccess ? 'bg-green-500' : 'bg-slate-300'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${hasAccess ? 'left-3.5' : 'left-0.5'}`} />
                                                            </button>
                                                            <div>
                                                                <span className={`text-sm font-medium ${hasAccess ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                    {profile.full_name}
                                                                </span>
                                                                <span className="text-[10px] ml-2 text-slate-400">{profile.role}</span>
                                                            </div>
                                                        </div>

                                                        {/* Capability toggles */}
                                                        {hasAccess && pu && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleCap(num.id, profile.id, 'can_whatsapp', pu.can_whatsapp)}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${pu.can_whatsapp ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                                                                    title="WhatsApp"
                                                                >
                                                                    💬 WA
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleCap(num.id, profile.id, 'can_voice', pu.can_voice)}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${pu.can_voice ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}
                                                                    title="Telefon"
                                                                >
                                                                    📞 Tel
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleCap(num.id, profile.id, 'can_sms', pu.can_sms)}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${pu.can_sms ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}
                                                                    title="SMS"
                                                                >
                                                                    📱 SMS
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Quick assign all sales reps */}
                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                            <button
                                                onClick={async () => {
                                                    const salesProfiles = profiles.filter(p =>
                                                        ['sales', 'admin', 'sales_rep', 'representative'].some(r => p.role?.toLowerCase().includes(r))
                                                    );
                                                    for (const p of salesProfiles) {
                                                        if (!assignedUsers.find(u => u.user_id === p.id)) {
                                                            await TelephonyService.addPhoneNumberUser(num.id, p.id);
                                                        }
                                                    }
                                                    toast.success(`Dodano ${salesProfiles.length} handlowców`);
                                                    loadData();
                                                }}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                ⚡ Przypisz szybko wszystkich handlowców
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
