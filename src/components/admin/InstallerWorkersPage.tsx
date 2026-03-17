import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InstallerWorkerService, type InstallerWorker } from '../../services/database/installer-worker.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { InstallerSessionService, type WorkSession } from '../../services/database/installer-session.service';
import { DatabaseService } from '../../services/database';
import type { InstallationTeam, Installation } from '../../types';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// ============================================================================
// INSTALLER WORKERS PAGE - Central Worker Registry + Waiting Pool
// ============================================================================

interface WorkerFormData {
    firstName: string;
    lastName: string;
    phone: string;
    hourlyRate: string;
    preferredLanguage: string;
    teamId: string;
    notes: string;
}

const emptyForm: WorkerFormData = {
    firstName: '',
    lastName: '',
    phone: '',
    hourlyRate: '0',
    preferredLanguage: 'pl',
    teamId: '',
    notes: '',
};

const LANG_LABELS: Record<string, string> = { pl: '🇵🇱 PL', mo: '🇲🇩 MD', uk: '🇺🇦 UA' };
const STATUS_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
    available: { emoji: '🟢', label: 'Dostępny', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    on_leave: { emoji: '🟡', label: 'Urlop', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    inactive: { emoji: '⚫', label: 'Nieaktywny', color: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export const InstallerWorkersPage: React.FC = () => {
    const [workers, setWorkers] = useState<InstallerWorker[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingWorker, setEditingWorker] = useState<InstallerWorker | null>(null);
    const [form, setForm] = useState<WorkerFormData>(emptyForm);
    const [saving, setSaving] = useState(false);

    // Create account modal
    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [accountWorkerId, setAccountWorkerId] = useState<string>('');
    const [accountWorkerName, setAccountWorkerName] = useState('');
    const [accountLogin, setAccountLogin] = useState('');
    const [accountPassword, setAccountPassword] = useState('');
    const [creatingAccount, setCreatingAccount] = useState(false);

    // Cost report state
    const [showCosts, setShowCosts] = useState(false);
    const [costMonth, setCostMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [costSessions, setCostSessions] = useState<WorkSession[]>([]);
    const [costInstallations, setCostInstallations] = useState<Installation[]>([]);
    const [loadingCosts, setLoadingCosts] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [w, t] = await Promise.all([
                InstallerWorkerService.getAllWorkers(),
                InstallationTeamService.getTeams(),
            ]);
            setWorkers(w);
            setTeams(t);
        } catch (err) {
            console.error('Error loading workers:', err);
            toast.error('Błąd ładowania pracowników');
        } finally {
            setLoading(false);
        }
    };

    // Load cost data when cost panel opened or month changes
    const loadCostData = useCallback(async () => {
        if (!showCosts) return;
        setLoadingCosts(true);
        try {
            const [y, m] = costMonth.split('-').map(Number);
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
            const [sessions, installs] = await Promise.all([
                InstallerSessionService.getAllSessions(startDate, endDate),
                DatabaseService.getInstallations(),
            ]);
            setCostSessions(sessions.filter(s => s.status === 'completed'));
            // Filter installations that have scheduled date in this month OR have costs entered
            setCostInstallations(installs.filter(i => {
                if (!i.scheduledDate) return false;
                const d = i.scheduledDate.split('T')[0];
                return d >= startDate && d <= endDate;
            }));
        } catch (err) {
            console.error('Error loading cost data:', err);
            toast.error('Błąd ładowania kosztów');
        } finally {
            setLoadingCosts(false);
        }
    }, [showCosts, costMonth]);

    useEffect(() => { loadCostData(); }, [loadCostData]);

    // ---- COST CALCULATIONS ----
    const costReport = useMemo(() => {
        // Per-worker cost (from work sessions crew_members)
        const workerCosts: Record<string, { name: string; teamName: string; hours: number; labor: number; fuel: number; hotel: number; total: number }> = {};
        for (const s of costSessions) {
            const crewCount = Math.max(s.crewMembers?.length || 1, 1);
            const perPersonLabor = s.laborCost / crewCount;
            const perPersonFuel = s.fuelCost / crewCount;
            const perPersonHotel = s.hotelCost / crewCount;
            const perPersonTotal = perPersonLabor + perPersonFuel + perPersonHotel;
            const team = teams.find(t => t.id === s.teamId);
            if (s.crewMembers && s.crewMembers.length > 0) {
                for (const cm of s.crewMembers) {
                    const key = `${cm.firstName}-${cm.lastName}`;
                    if (!workerCosts[key]) workerCosts[key] = { name: `${cm.firstName} ${cm.lastName}`, teamName: team?.name || '—', hours: 0, labor: 0, fuel: 0, hotel: 0, total: 0 };
                    workerCosts[key].hours += (s.totalWorkMinutes || 0) / 60;
                    workerCosts[key].labor += perPersonLabor;
                    workerCosts[key].fuel += perPersonFuel;
                    workerCosts[key].hotel += perPersonHotel;
                    workerCosts[key].total += perPersonTotal;
                }
            }
        }
        // Per-team cost aggregation
        const teamCosts: Record<string, { teamName: string; sessions: number; labor: number; fuel: number; hotel: number; installHotel: number; installMaterials: number; installOther: number; total: number }> = {};
        for (const s of costSessions) {
            const team = teams.find(t => t.id === s.teamId);
            const key = s.teamId;
            if (!teamCosts[key]) teamCosts[key] = { teamName: team?.name || '?', sessions: 0, labor: 0, fuel: 0, hotel: 0, installHotel: 0, installMaterials: 0, installOther: 0, total: 0 };
            teamCosts[key].sessions++;
            teamCosts[key].labor += s.laborCost;
            teamCosts[key].fuel += s.fuelCost;
            teamCosts[key].hotel += s.hotelCost;
            teamCosts[key].total += s.totalCost;
        }
        // Add installation-level costs (hotel, materials, other) per team
        for (const inst of costInstallations) {
            const h = inst.hotelCost || 0;
            const m = inst.consumablesCost || 0;
            const o = inst.additionalCosts || 0;
            if (h + m + o <= 0) continue;
            const key = inst.teamId || 'unassigned';
            if (!teamCosts[key]) {
                const team = teams.find(t => t.id === inst.teamId);
                teamCosts[key] = { teamName: team?.name || 'Bez ekipy', sessions: 0, labor: 0, fuel: 0, hotel: 0, installHotel: 0, installMaterials: 0, installOther: 0, total: 0 };
            }
            teamCosts[key].installHotel += h;
            teamCosts[key].installMaterials += m;
            teamCosts[key].installOther += o;
            teamCosts[key].total += (h + m + o);
        }
        // Per-installation cost entries (only those with costs)
        const installCosts = costInstallations
            .filter(i => (i.hotelCost || 0) + (i.consumablesCost || 0) + (i.additionalCosts || 0) > 0)
            .map(i => {
                const team = teams.find(t => t.id === i.teamId);
                return {
                    id: i.id,
                    client: `${i.client?.firstName || ''} ${i.client?.lastName || ''}`.trim(),
                    city: i.client?.city || '',
                    teamName: team?.name || '—',
                    hotel: i.hotelCost || 0,
                    materials: i.consumablesCost || 0,
                    other: i.additionalCosts || 0,
                    total: (i.hotelCost || 0) + (i.consumablesCost || 0) + (i.additionalCosts || 0),
                    date: i.scheduledDate?.split('T')[0] || '',
                };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

        const grandTotal = Object.values(teamCosts).reduce((s, t) => s + t.total, 0);

        return { workerCosts: Object.values(workerCosts).sort((a, b) => b.total - a.total), teamCosts: Object.values(teamCosts).sort((a, b) => b.total - a.total), installCosts, grandTotal };
    }, [costSessions, costInstallations, teams]);

    // Group workers by team
    const unassigned = workers.filter(w => !w.teamId);
    const teamGroups = teams.map(team => ({
        team,
        members: workers.filter(w => w.teamId === team.id),
    }));

    // ---- FORM HANDLERS ----
    const openNewWorker = () => {
        setForm(emptyForm);
        setEditingWorker(null);
        setShowForm(true);
    };

    const openEditWorker = (worker: InstallerWorker) => {
        setForm({
            firstName: worker.firstName,
            lastName: worker.lastName,
            phone: worker.phone || '',
            hourlyRate: String(worker.hourlyRate),
            preferredLanguage: worker.preferredLanguage,
            teamId: worker.teamId || '',
            notes: worker.notes || '',
        });
        setEditingWorker(worker);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.firstName.trim()) {
            toast.error('Imię jest wymagane');
            return;
        }
        try {
            setSaving(true);
            if (editingWorker) {
                await InstallerWorkerService.updateWorker(editingWorker.id, {
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: form.phone.trim() || undefined,
                    hourlyRate: parseFloat(form.hourlyRate) || 0,
                    preferredLanguage: form.preferredLanguage,
                    teamId: form.teamId || null,
                    notes: form.notes.trim() || undefined,
                });
                toast.success('Pracownik zaktualizowany');
            } else {
                await InstallerWorkerService.createWorker({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: form.phone.trim() || undefined,
                    hourlyRate: parseFloat(form.hourlyRate) || 0,
                    preferredLanguage: form.preferredLanguage,
                    teamId: form.teamId || null,
                    notes: form.notes.trim() || undefined,
                });
                toast.success('Pracownik dodany');
            }
            setShowForm(false);
            setEditingWorker(null);
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignToTeam = async (workerId: string, teamId: string | null) => {
        try {
            if (teamId) {
                await InstallerWorkerService.assignToTeam(workerId, teamId);
                toast.success('Przypisano do ekipy');
            } else {
                await InstallerWorkerService.removeFromTeam(workerId);
                toast.success('Przeniesiono do poczekalni');
            }
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Błąd');
        }
    };

    const handleDeactivate = async (worker: InstallerWorker) => {
        if (!confirm(`Dezaktywować ${worker.firstName} ${worker.lastName}?`)) return;
        try {
            await InstallerWorkerService.deactivateWorker(worker.id);
            toast.success('Pracownik dezaktywowany');
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Błąd');
        }
    };

    const handleStatusToggle = async (worker: InstallerWorker) => {
        const newStatus = worker.status === 'available' ? 'on_leave' : 'available';
        try {
            await InstallerWorkerService.updateWorker(worker.id, { status: newStatus });
            toast.success(newStatus === 'on_leave' ? 'Urlop ustawiony' : 'Status: Dostępny');
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Błąd');
        }
    };

    // ---- CREATE ACCOUNT FOR WORKER ----
    const openCreateAccount = (worker: InstallerWorker) => {
        setAccountWorkerId(worker.id);
        setAccountWorkerName(`${worker.firstName} ${worker.lastName}`.trim());
        setAccountLogin(worker.firstName.toLowerCase().replace(/[^a-z0-9]/g, ''));
        setAccountPassword(generatePassword());
        setShowCreateAccount(true);
    };

    const handleCreateAccount = async () => {
        if (!accountLogin || !accountPassword) { toast.error('Wypełnij login i hasło'); return; }
        setCreatingAccount(true);
        try {
            const fakeEmail = `${accountLogin.toLowerCase().replace(/[^a-z0-9]/g, '')}@installer.local`;
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: fakeEmail,
                password: accountPassword,
                options: {
                    data: {
                        full_name: accountWorkerName,
                        role: 'installer',
                        username: accountLogin,
                    }
                }
            });
            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('Nie udało się utworzyć konta');

            // Update profile
            await supabase.from('profiles').update({
                full_name: accountWorkerName,
                role: 'installer',
                status: 'active',
            }).eq('id', signUpData.user.id);

            // Link profile to worker
            await InstallerWorkerService.linkProfile(accountWorkerId, signUpData.user.id);

            // Copy credentials
            navigator.clipboard.writeText(`Login: ${accountLogin}\nHasło: ${accountPassword}`);
            toast.success(`Konto utworzone! Dane skopiowane do schowka.`, { duration: 5000 });
            setShowCreateAccount(false);
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Błąd tworzenia konta');
        } finally {
            setCreatingAccount(false);
        }
    };

    // ---- RENDER ----
    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Pula pracowników</h2>
                    <p className="text-sm text-slate-500">
                        {workers.length} pracowników łącznie • {unassigned.length} w poczekalni
                    </p>
                </div>
                <button
                    onClick={openNewWorker}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Dodaj pracownika
                </button>
            </div>

            {/* ---- COST REPORT PANEL ---- */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 overflow-hidden">
                <button
                    onClick={() => setShowCosts(!showCosts)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-purple-100/30 transition-colors"
                >
                    <span className="text-lg">📊</span>
                    <span className="font-bold text-purple-900">Koszty Miesięczne</span>
                    <span className="ml-auto text-purple-500 text-sm">{showCosts ? '▲ Zwiń' : '▼ Rozwiń'}</span>
                </button>

                {showCosts && (
                    <div className="border-t border-purple-200 p-5 space-y-5">
                        {/* Month Selector */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const [y, m] = costMonth.split('-').map(Number);
                                    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
                                    setCostMonth(prev);
                                }}
                                className="p-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-600"
                            >◀</button>
                            <input
                                type="month"
                                value={costMonth}
                                onChange={e => setCostMonth(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-purple-200 text-sm font-bold text-purple-800 bg-white focus:ring-2 focus:ring-purple-300 outline-none"
                            />
                            <button
                                onClick={() => {
                                    const [y, m] = costMonth.split('-').map(Number);
                                    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
                                    setCostMonth(next);
                                }}
                                className="p-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-600"
                            >▶</button>
                            {loadingCosts && <span className="text-xs text-purple-400 animate-pulse">Ładowanie...</span>}
                        </div>

                        {/* Grand Total */}
                        <div className="bg-white rounded-xl p-4 border border-purple-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-purple-800">💰 Suma kosztów za miesiąc</span>
                            <span className="text-2xl font-black text-purple-700">{costReport.grandTotal.toFixed(2)} €</span>
                        </div>

                        {/* Per-Team Costs */}
                        {costReport.teamCosts.length > 0 && (
                            <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
                                <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 font-bold text-sm text-purple-800 flex items-center gap-2">
                                    🏗️ Koszty per ekipa
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                                <th className="text-left px-3 py-2">Ekipa</th>
                                                <th className="text-right px-2 py-2">Sesje</th>
                                                <th className="text-right px-2 py-2">👷 Robocizna</th>
                                                <th className="text-right px-2 py-2">⛽ Paliwo</th>
                                                <th className="text-right px-2 py-2">🏨 Hotel (sesje)</th>
                                                <th className="text-right px-2 py-2">🏨 Hotel (montaże)</th>
                                                <th className="text-right px-2 py-2">📦 Materiały</th>
                                                <th className="text-right px-3 py-2 font-black">RAZEM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costReport.teamCosts.map((t, i) => (
                                                <tr key={i} className="border-t border-slate-50 hover:bg-purple-50/50">
                                                    <td className="px-3 py-2 font-bold text-slate-800">{t.teamName}</td>
                                                    <td className="px-2 py-2 text-right text-slate-500">{t.sessions}</td>
                                                    <td className="px-2 py-2 text-right text-blue-700 font-mono">{t.labor.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-amber-700 font-mono">{t.fuel.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-purple-700 font-mono">{t.hotel.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-purple-700 font-mono">{t.installHotel.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-slate-600 font-mono">{(t.installMaterials + t.installOther).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right font-black text-red-600">{t.total.toFixed(2)} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Per-Worker Costs */}
                        {costReport.workerCosts.length > 0 && (
                            <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
                                <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 font-bold text-sm text-purple-800 flex items-center gap-2">
                                    👷 Koszty per pracownik
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                                <th className="text-left px-3 py-2">Pracownik</th>
                                                <th className="text-left px-2 py-2">Ekipa</th>
                                                <th className="text-right px-2 py-2">Godziny</th>
                                                <th className="text-right px-2 py-2">Robocizna</th>
                                                <th className="text-right px-2 py-2">Paliwo</th>
                                                <th className="text-right px-2 py-2">Hotel</th>
                                                <th className="text-right px-3 py-2 font-black">RAZEM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costReport.workerCosts.map((w, i) => (
                                                <tr key={i} className="border-t border-slate-50 hover:bg-purple-50/50">
                                                    <td className="px-3 py-2 font-bold text-slate-800">{w.name}</td>
                                                    <td className="px-2 py-2 text-slate-500">{w.teamName}</td>
                                                    <td className="px-2 py-2 text-right text-slate-600 font-mono">{w.hours.toFixed(1)}h</td>
                                                    <td className="px-2 py-2 text-right text-blue-700 font-mono">{w.labor.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-amber-700 font-mono">{w.fuel.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-right text-purple-700 font-mono">{w.hotel.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right font-black text-red-600">{w.total.toFixed(2)} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Per-Installation (Hotel) Costs */}
                        {costReport.installCosts.length > 0 && (
                            <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
                                <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100 font-bold text-sm text-purple-800 flex items-center gap-2">
                                    🏨 Koszty per montaż (hotel/materiały/inne)
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                                <th className="text-left px-3 py-2">Data</th>
                                                <th className="text-left px-2 py-2">Klient</th>
                                                <th className="text-left px-2 py-2">Miasto</th>
                                                <th className="text-left px-2 py-2">Ekipa</th>
                                                <th className="text-right px-2 py-2">🏨 Hotel</th>
                                                <th className="text-right px-2 py-2">⛽ Materiały</th>
                                                <th className="text-right px-2 py-2">📦 Inne</th>
                                                <th className="text-right px-3 py-2 font-black">RAZEM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costReport.installCosts.map((ic) => (
                                                <tr key={ic.id} className="border-t border-slate-50 hover:bg-purple-50/50">
                                                    <td className="px-3 py-2 text-slate-600 font-mono">{ic.date}</td>
                                                    <td className="px-2 py-2 font-bold text-slate-800">{ic.client}</td>
                                                    <td className="px-2 py-2 text-slate-500">{ic.city}</td>
                                                    <td className="px-2 py-2 text-slate-500">{ic.teamName}</td>
                                                    <td className="px-2 py-2 text-right text-purple-700 font-mono">{ic.hotel > 0 ? ic.hotel.toFixed(2) : '—'}</td>
                                                    <td className="px-2 py-2 text-right text-amber-700 font-mono">{ic.materials > 0 ? ic.materials.toFixed(2) : '—'}</td>
                                                    <td className="px-2 py-2 text-right text-slate-600 font-mono">{ic.other > 0 ? ic.other.toFixed(2) : '—'}</td>
                                                    <td className="px-3 py-2 text-right font-black text-red-600">{ic.total.toFixed(2)} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {costSessions.length === 0 && costReport.installCosts.length === 0 && !loadingCosts && (
                            <div className="text-center py-8 text-purple-400 text-sm">
                                Brak danych kosztowych za wybrany miesiąc
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---- WAITING POOL (oczekujący) ---- */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-200 bg-amber-100/50 flex items-center gap-2">
                    <span className="text-lg">⏳</span>
                    <h3 className="font-bold text-amber-900">Poczekalnia</h3>
                    <span className="ml-auto text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                        {unassigned.length}
                    </span>
                </div>
                {unassigned.length === 0 ? (
                    <div className="p-8 text-center text-amber-600/60 text-sm">
                        Wszyscy pracownicy są przypisani do ekip
                    </div>
                ) : (
                    <div className="divide-y divide-amber-100">
                        {unassigned.map(w => (
                            <WorkerRow
                                key={w.id}
                                worker={w}
                                teams={teams}
                                onEdit={() => openEditWorker(w)}
                                onAssign={(teamId) => handleAssignToTeam(w.id, teamId)}
                                onDeactivate={() => handleDeactivate(w)}
                                onStatusToggle={() => handleStatusToggle(w)}
                                onCreateAccount={() => openCreateAccount(w)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ---- TEAM GROUPS ---- */}
            {teamGroups.map(({ team, members }) => (
                <div
                    key={team.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    style={{ borderLeftColor: team.color || '#3b82f6', borderLeftWidth: 4 }}
                >
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: team.color || '#3b82f6' }}
                        />
                        <h3 className="font-bold text-slate-800">{team.name}</h3>
                        <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {members.length} os.
                        </span>
                    </div>
                    {members.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">
                            Brak przypisanych pracowników
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {members.map(w => (
                                <WorkerRow
                                    key={w.id}
                                    worker={w}
                                    teams={teams}
                                    onEdit={() => openEditWorker(w)}
                                    onAssign={(teamId) => handleAssignToTeam(w.id, teamId)}
                                    onDeactivate={() => handleDeactivate(w)}
                                    onStatusToggle={() => handleStatusToggle(w)}
                                    onCreateAccount={() => openCreateAccount(w)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* ---- ADD/EDIT FORM MODAL ---- */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">
                                {editingWorker ? 'Edytuj pracownika' : 'Nowy pracownik'}
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Imię *</label>
                                        <input
                                            type="text"
                                            value={form.firstName}
                                            onChange={e => setForm({ ...form, firstName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                            placeholder="Jan"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Nazwisko</label>
                                        <input
                                            type="text"
                                            value={form.lastName}
                                            onChange={e => setForm({ ...form, lastName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                            placeholder="Kowalski"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Telefon</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                            placeholder="+48 123 456 789"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Stawka (zł/h)</label>
                                        <input
                                            type="number"
                                            value={form.hourlyRate}
                                            onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Język</label>
                                        <select
                                            value={form.preferredLanguage}
                                            onChange={e => setForm({ ...form, preferredLanguage: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                        >
                                            <option value="pl">🇵🇱 Polski</option>
                                            <option value="mo">🇲🇩 Mołdawski</option>
                                            <option value="uk">🇺🇦 Ukraiński</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Ekipa</label>
                                        <select
                                            value={form.teamId}
                                            onChange={e => setForm({ ...form, teamId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                        >
                                            <option value="">⏳ Poczekalnia</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Notatki</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm resize-none"
                                        rows={2}
                                        placeholder="Opcjonalne notatki..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-5">
                                <button
                                    onClick={() => { setShowForm(false); setEditingWorker(null); }}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !form.firstName.trim()}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? 'Zapisywanie...' : editingWorker ? 'Zapisz zmiany' : 'Dodaj'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- CREATE ACCOUNT MODAL ---- */}
            {showCreateAccount && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateAccount(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Utwórz konto</h3>
                            <p className="text-sm text-slate-500 mb-4">Dla: <b>{accountWorkerName}</b></p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Login</label>
                                    <input
                                        type="text"
                                        value={accountLogin}
                                        onChange={e => setAccountLogin(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Hasło</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={accountPassword}
                                            onChange={e => setAccountPassword(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none text-sm font-mono"
                                        />
                                        <button
                                            onClick={() => setAccountPassword(generatePassword())}
                                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors text-sm"
                                        >
                                            🔄
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-5">
                                <button
                                    onClick={() => setShowCreateAccount(false)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleCreateAccount}
                                    disabled={creatingAccount || !accountLogin}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {creatingAccount ? 'Tworzenie...' : 'Utwórz konto'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---- WORKER ROW ----
const WorkerRow: React.FC<{
    worker: InstallerWorker;
    teams: InstallationTeam[];
    onEdit: () => void;
    onAssign: (teamId: string | null) => void;
    onDeactivate: () => void;
    onStatusToggle: () => void;
    onCreateAccount: () => void;
}> = ({ worker, teams, onEdit, onAssign, onDeactivate, onStatusToggle, onCreateAccount }) => {
    const [showTeamPicker, setShowTeamPicker] = useState(false);
    const badge = STATUS_BADGES[worker.status] || STATUS_BADGES.available;

    return (
        <div className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-colors">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {worker.firstName[0]}{worker.lastName?.[0] || ''}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{worker.firstName} {worker.lastName}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.emoji} {badge.label}
                        </span>
                        {worker.hasAccount ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                                🔐 Konto
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                                👤 Bez konta
                            </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                            {LANG_LABELS[worker.preferredLanguage] || worker.preferredLanguage}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                        {worker.hourlyRate > 0 && <span>{worker.hourlyRate} zł/h</span>}
                        {worker.phone && <span className="ml-2">📞 {worker.phone}</span>}
                        {worker.notes && <span className="ml-2 italic">— {worker.notes}</span>}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                <button
                    onClick={onEdit}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Edytuj"
                >
                    ✏️
                </button>
                <button
                    onClick={onStatusToggle}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title={worker.status === 'available' ? 'Ustaw urlop' : 'Ustaw dostępny'}
                >
                    {worker.status === 'available' ? '🏖️' : '✅'}
                </button>

                {/* Team assignment */}
                <div className="relative">
                    <button
                        onClick={() => setShowTeamPicker(!showTeamPicker)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Przypisz do ekipy"
                    >
                        🔄 Ekipa
                    </button>
                    {showTeamPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 min-w-[180px]">
                            <button
                                onClick={() => { onAssign(null); setShowTeamPicker(false); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-colors ${!worker.teamId ? 'font-bold text-amber-700 bg-amber-50' : 'text-slate-600'}`}
                            >
                                ⏳ Poczekalnia
                            </button>
                            {teams.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { onAssign(t.id); setShowTeamPicker(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${worker.teamId === t.id ? 'font-bold text-indigo-700 bg-indigo-50' : 'text-slate-600'}`}
                                >
                                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: t.color || '#3b82f6' }} />
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!worker.hasAccount && (
                    <button
                        onClick={onCreateAccount}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Utwórz konto logowania"
                    >
                        🔐 Konto
                    </button>
                )}

                <button
                    onClick={onDeactivate}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Dezaktywuj"
                >
                    ❌
                </button>
            </div>
        </div>
    );
};

// ---- UTILS ----
function generatePassword(length = 10): string {
    const upper = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    let pw = '';
    pw += upper[Math.floor(Math.random() * upper.length)];
    pw += lower[Math.floor(Math.random() * lower.length)];
    pw += digits[Math.floor(Math.random() * digits.length)];
    for (let i = pw.length; i < length; i++) {
        pw += all[Math.floor(Math.random() * all.length)];
    }
    return pw.split('').sort(() => Math.random() - 0.5).join('');
}
