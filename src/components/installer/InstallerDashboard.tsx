import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { DatabaseService } from '../../services/database';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { InstallerSessionService, type WorkSession, type CrewMember, type InstallerVehicle } from '../../services/database/installer-session.service';
import { InstallerWorkerService } from '../../services/database/installer-worker.service';
import { SupportService } from '../../services/database/support.service';
import { InstallationService } from '../../services/database/installation.service';
import { TasksList } from '../tasks/TasksList';
import type { Installation, InstallationTeam, OrderItem } from '../../types';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const InstallerDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    // Data
    const [myTeam, setMyTeam] = useState<InstallationTeam | null>(null);
    const [todayInstallations, setTodayInstallations] = useState<Installation[]>([]);
    const [weekInstallations, setWeekInstallations] = useState<Installation[]>([]);
    const [session, setSession] = useState<WorkSession | null>(null);
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [allTeamMembers, setAllTeamMembers] = useState<CrewMember[]>([]);
    const [selectedInstallationId, setSelectedInstallationId] = useState<string>('');

    // Timer
    const [elapsed, setElapsed] = useState(0);
    const [showEndModal, setShowEndModal] = useState(false);
    const [sessionCollapsed, setSessionCollapsed] = useState(true);
    const [endHotelCost, setEndHotelCost] = useState<string>('');

    // Photo documentation
    const [photoUploading, setPhotoUploading] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [photoTargetInstId, setPhotoTargetInstId] = useState<string>('');

    // Fuel indicator
    const [lastFuelInfo, setLastFuelInfo] = useState<{date: string; liters: number; daysAgo: number} | null>(null);

    // Office contact
    const [officePhone, setOfficePhone] = useState<string>('');
    const [officeManagerName, setOfficeManagerName] = useState<string>('');

    // Installer notes per installation
    const [installerNotes, setInstallerNotes] = useState<Record<string, string>>({});
    const [savingNote, setSavingNote] = useState<string | null>(null);
    const [togglingTask, setTogglingTask] = useState<string | null>(null);

    // Vehicles
    const [teamVehicles, setTeamVehicles] = useState<InstallerVehicle[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

    // Installation photos
    const [installationPhotos, setInstallationPhotos] = useState<Record<string, string[]>>({});

    // Order items per installation
    const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});

    // Contract data per installation (product, notes, etc.)
    const [contractDataMap, setContractDataMap] = useState<Record<string, any>>({});

    // Load data
    useEffect(() => {
        const load = async () => {
            if (!currentUser) { setLoading(false); return; }
            try {
                const teams = await InstallationTeamService.getTeams();
                const team = teams.find(t => t.members.some(m => m.id === currentUser.id));
                setMyTeam(team || null);

                if (team) {
                    // Load crew from installer_workers table (includes workers without accounts)
                    try {
                        const teamWorkers = await InstallerWorkerService.getTeamWorkers(team.id);
                        if (teamWorkers.length > 0) {
                            const members: CrewMember[] = teamWorkers.map(w => ({
                                id: w.id,
                                firstName: w.firstName,
                                lastName: w.lastName,
                                role: 'installer',
                                hourlyRate: w.hourlyRate || 0,
                            }));
                            setCrewMembers(members);
                        } else {
                            // Fallback to team.members if no workers in DB yet
                            const members: CrewMember[] = team.members.map(m => ({
                                id: m.id,
                                firstName: m.firstName,
                                lastName: m.lastName,
                                role: m.role,
                                hourlyRate: m.hourlyRate || 0,
                            }));
                            setCrewMembers(members);
                        }
                    } catch {
                        // Fallback to team.members
                        const members: CrewMember[] = team.members.map(m => ({
                            id: m.id, firstName: m.firstName, lastName: m.lastName,
                            role: m.role, hourlyRate: m.hourlyRate || 0,
                        }));
                        setCrewMembers(members);
                    }

                    // All workers from all teams for swapping (from installer_workers)
                    try {
                        const allWorkers = await InstallerWorkerService.getAllWorkers();
                        const allMembers: CrewMember[] = allWorkers.map(w => ({
                            id: w.id,
                            firstName: w.firstName,
                            lastName: w.lastName,
                            hourlyRate: w.hourlyRate || 0,
                        }));
                        setAllTeamMembers(allMembers);
                    } catch {
                        // Fallback
                        const allMembers: CrewMember[] = teams.flatMap(t => t.members.map(m => ({
                            id: m.id, firstName: m.firstName, lastName: m.lastName, hourlyRate: m.hourlyRate || 0,
                        })));
                        const unique = allMembers.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
                        setAllTeamMembers(unique);
                    }

                    // Get today's session
                    const todaySession = await InstallerSessionService.getTodaySession(team.id, currentUser.id);
                    if (todaySession) {
                        setSession(todaySession);
                        setCrewMembers(todaySession.crewMembers);
                        if (todaySession.installationId) setSelectedInstallationId(todaySession.installationId);
                    }
                }

                // Load installations
                const installations = await DatabaseService.getInstallations();
                const today = new Date().toISOString().split('T')[0];

                const todayInsts = installations.filter(inst => {
                    if (!inst.scheduledDate) return false;
                    const startDate = inst.scheduledDate.split('T')[0];
                    const duration = inst.expectedDuration || 1;
                    // Check if today falls within the installation's multi-day span
                    const startMs = new Date(startDate).getTime();
                    const todayMs = new Date(today).getTime();
                    const endMs = startMs + (duration - 1) * 86400000;
                    const isTodayInRange = todayMs >= startMs && todayMs <= endMs;
                    if (!team) return isTodayInRange;
                    return isTodayInRange && inst.teamId === team.id;
                });
                setTodayInstallations(todayInsts);
                if (todayInsts.length === 1 && !selectedInstallationId) {
                    setSelectedInstallationId(todayInsts[0].id);
                }

                const now = new Date();
                const weekEnd = new Date(now);
                weekEnd.setDate(weekEnd.getDate() + 7);
                const weekInsts = installations.filter(inst => {
                    if (!inst.scheduledDate) return false;
                    const d = new Date(inst.scheduledDate);
                    if (!team) return d >= now && d <= weekEnd;
                    return d >= now && d <= weekEnd && inst.teamId === team.id;
                }).sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
                setWeekInstallations(weekInsts);

                // Load team vehicles
                if (team) {
                    try {
                        const vehicles = await InstallerSessionService.getTeamVehicles(team.id);
                        setTeamVehicles(vehicles);
                        const defaultV = vehicles.find(v => v.isDefault);
                        if (defaultV) setSelectedVehicleId(defaultV.id);
                        else if (vehicles.length === 1) setSelectedVehicleId(vehicles[0].id);
                    } catch { /* ignore */ }
                }

                // Load photos for today's installations
                try {
                    const photoMap: Record<string, string[]> = {};
                    for (const inst of todayInsts) {
                        const allPhotos: string[] = [];

                        // 1. Photos from Supabase storage (uploaded by installer)
                        const { data: files } = await supabase.storage
                            .from('fuel-logs')
                            .list(`installation-photos/${inst.id}`, { limit: 20 });
                        if (files && files.length > 0) {
                            files.forEach(f => {
                                allPhotos.push(
                                    supabase.storage.from('fuel-logs').getPublicUrl(`installation-photos/${inst.id}/${f.name}`).data.publicUrl
                                );
                            });
                        }

                        // 2. Photos from acceptance protocol
                        if (inst.acceptance?.photos && Array.isArray(inst.acceptance.photos)) {
                            inst.acceptance.photos.forEach((p: string) => {
                                if (!allPhotos.includes(p)) allPhotos.push(p);
                            });
                        }

                        if (allPhotos.length > 0) photoMap[inst.id] = allPhotos;
                    }
                    setInstallationPhotos(photoMap);
                } catch { /* ignore */ }

                // Load order items for today's installations
                try {
                    const oiMap: Record<string, OrderItem[]> = {};
                    for (const inst of todayInsts) {
                        const items = await InstallationService.getOrderItems(inst.id);
                        if (items.length > 0) oiMap[inst.id] = items;
                    }
                    setOrderItemsMap(oiMap);
                } catch { /* ignore */ }

                // Load contract data for today's installations (product details, notes)
                try {
                    const cdMap: Record<string, any> = {};
                    const oIds = todayInsts.map(i => i.offerId).filter(Boolean);
                    if (oIds.length > 0) {
                        const { data: contracts } = await supabase
                            .from('contracts')
                            .select('offer_id, contract_data')
                            .in('offer_id', oIds);
                        contracts?.forEach((c: any) => { cdMap[c.offer_id] = c.contract_data; });
                    }
                    setContractDataMap(cdMap);
                } catch { /* ignore */ }

                // Load last fuel info
                try {
                    const fuelLogs = await SupportService.getFuelLogs(currentUser.id);
                    if (fuelLogs && fuelLogs.length > 0) {
                        const sorted = [...fuelLogs].sort((a: any, b: any) =>
                            new Date(b.logDate || b.createdAt).getTime() - new Date(a.logDate || a.createdAt).getTime()
                        );
                        const last = sorted[0] as any;
                        const lastDate = new Date(last.logDate || last.createdAt);
                        const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                        setLastFuelInfo({
                            date: last.logDate || last.createdAt?.split('T')[0] || '',
                            liters: last.liters || 0,
                            daysAgo,
                        });
                    }
                } catch { /* ignore */ }

                // Load office/manager contact
                try {
                    const { data: managers } = await supabase
                        .from('profiles')
                        .select('first_name, last_name, phone')
                        .in('role', ['manager', 'admin'])
                        .not('phone', 'is', null)
                        .limit(1);
                    if (managers && managers.length > 0) {
                        const mgr = managers[0];
                        setOfficeManagerName(`${mgr.first_name || ''} ${mgr.last_name || ''}`.trim());
                        setOfficePhone(mgr.phone || '');
                    }
                } catch { /* ignore */ }
            } catch (err) {
                console.error('Dashboard load error:', err);
                toast.error('Błąd ładowania danych');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser]);

    // Timer effect
    useEffect(() => {
        if (!session?.startedAt || session.status !== 'started') return;
        const start = new Date(session.startedAt).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const formatTime = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatMinutes = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}min`;
    };

    // Actions
    const handleConfirmCrew = async () => {
        if (!myTeam || !currentUser) return;
        try {
            if (session) {
                await InstallerSessionService.updateCrew(session.id, crewMembers);
                setSession({ ...session, crewMembers, crewConfirmed: true });
            } else {
                const newSession = await InstallerSessionService.createSession(
                    myTeam.id,
                    currentUser.id,
                    crewMembers,
                    selectedInstallationId || undefined
                );
                setSession(newSession);
            }
            toast.success('Skład ekipy potwierdzony ✅');
        } catch (err) {
            console.error(err);
            toast.error('Błąd potwierdzania składu');
        }
    };

    const handleStartDay = async () => {
        if (!session) return;
        try {
            // Link installation if selected and not yet linked
            if (selectedInstallationId && session.installationId !== selectedInstallationId) {
                await InstallerSessionService.linkInstallation(session.id, selectedInstallationId);
            }
            const updated = await InstallerSessionService.startDay(session.id);
            setSession(updated);
            toast.success('Dzień pracy rozpoczęty! ⏱️');
        } catch (err) {
            console.error(err);
            toast.error('Błąd rozpoczynania dnia');
        }
    };

    const handleEndDay = async (driveToBase: boolean) => {
        if (!session) return;
        try {
            const hotel = parseFloat(endHotelCost) || 0;
            const updated = await InstallerSessionService.endDay(session.id, driveToBase, hotel);
            setSession(updated);
            setShowEndModal(false);
            setEndHotelCost('');
            toast.success('Dzień pracy zakończony! ✅');
        } catch (err) {
            console.error(err);
            toast.error('Błąd kończenia dnia');
        }
    };

    const handleRestartDay = async () => {
        if (!session) return;
        if (!window.confirm('Czy na pewno chcesz wznowić dzień pracy? Timer zostanie uruchomiony od nowa.')) return;
        try {
            const updated = await InstallerSessionService.restartDay(session.id);
            setSession(updated);
            toast.success('Timer wznowiony! ⏱️');
        } catch (err) {
            console.error(err);
            toast.error('Błąd wznawiania');
        }
    };

    const removeMember = (memberId: string) => {
        setCrewMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const addMember = (member: CrewMember) => {
        if (crewMembers.some(m => m.id === member.id)) return;
        setCrewMembers(prev => [...prev, member]);
    };

    const openNavigation = (inst: Installation) => {
        const addr = encodeURIComponent(`${inst.client.address}, ${inst.client.postalCode || ''} ${inst.client.city}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
    };

    const triggerPhotoUpload = (installationId: string) => {
        setPhotoTargetInstId(installationId);
        photoInputRef.current?.click();
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !photoTargetInstId || !currentUser) return;

        setPhotoUploading(photoTargetInstId);
        try {
            const ext = file.name.split('.').pop();
            const path = `installation-photos/${photoTargetInstId}/${uuidv4()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('fuel-logs').upload(path, file);
            if (uploadErr) throw uploadErr;

            const publicUrl = supabase.storage.from('fuel-logs').getPublicUrl(path).data.publicUrl;

            // Append photo URL to installation notes
            const { data: instData } = await supabase
                .from('installations')
                .select('notes')
                .eq('id', photoTargetInstId)
                .single();

            const existingNotes = instData?.notes || '';
            const photoEntry = `\n📸 [${new Date().toLocaleString('pl-PL')}] ${currentUser.firstName}: ${publicUrl}`;

            await supabase
                .from('installations')
                .update({ notes: existingNotes + photoEntry })
                .eq('id', photoTargetInstId);

            toast.success('📸 Zdjęcie dodane!');

            // Update gallery instantly
            setInstallationPhotos(prev => ({
                ...prev,
                [photoTargetInstId]: [...(prev[photoTargetInstId] || []), publicUrl]
            }));
        } catch (err) {
            console.error('Photo upload error:', err);
            toast.error('Błąd wysyłania zdjęcia');
        } finally {
            setPhotoUploading(null);
            setPhotoTargetInstId('');
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    // Toggle measurement task completion
    const handleToggleMeasurementTask = async (installationId: string, taskId: string) => {
        setTogglingTask(taskId);
        try {
            const inst = todayInstallations.find(i => i.id === installationId);
            if (!inst || !inst.measurementTasks) return;

            const updatedTasks = inst.measurementTasks.map((t: any) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
            );

            await DatabaseService.updateInstallation(installationId, {
                measurementTasks: updatedTasks
            } as any);

            // Update local state
            setTodayInstallations(prev => prev.map(i =>
                i.id === installationId ? { ...i, measurementTasks: updatedTasks } : i
            ));
            toast.success('Zaktualizowano ✅');
        } catch (err) {
            console.error(err);
            toast.error('Błąd aktualizacji zadania');
        } finally {
            setTogglingTask(null);
        }
    };

    // Save installer notes for an installation
    const handleSaveInstallerNote = async (installationId: string) => {
        setSavingNote(installationId);
        try {
            const noteText = installerNotes[installationId] || '';
            const timestamp = new Date().toLocaleString('pl-PL');
            const entry = `\n📝 [${timestamp}] ${currentUser?.firstName}: ${noteText}`;

            const { data: instData } = await supabase
                .from('installations')
                .select('notes')
                .eq('id', installationId)
                .single();

            const existingNotes = instData?.notes || '';

            await supabase
                .from('installations')
                .update({ notes: existingNotes + entry })
                .eq('id', installationId);

            // Update local state
            setTodayInstallations(prev => prev.map(i =>
                i.id === installationId ? { ...i, notes: (existingNotes + entry) } : i
            ));
            setInstallerNotes(prev => ({ ...prev, [installationId]: '' }));
            toast.success('Notatka zapisana 📝');
        } catch (err) {
            console.error(err);
            toast.error('Błąd zapisu notatki');
        } finally {
            setSavingNote(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-500">Zaloguj się, aby rozpocząć</div>
            </div>
        );
    }

    const isCrewDifferent = JSON.stringify(crewMembers.map(m => m.id).sort()) !==
        JSON.stringify((session?.crewMembers || myTeam?.members || []).map((m: any) => m.id).sort());

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24">
            <div className="max-w-2xl mx-auto space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Cześć, {currentUser.firstName}! 👋
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {myTeam && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: myTeam.color }} />
                            <span className="text-sm font-medium text-slate-600">{myTeam.name}</span>
                            {myTeam.vehicle && <span className="text-xs text-slate-400">• {myTeam.vehicle}</span>}
                        </div>
                    )}
                    {/* Fuel Indicator Badge */}
                    {lastFuelInfo && (
                        <Link to="/installer/fuel" className="mt-2 inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm hover:shadow transition-shadow">
                            <span className="text-sm">⛽</span>
                            <span className={`text-xs font-medium ${lastFuelInfo.daysAgo > 5 ? 'text-red-600' : lastFuelInfo.daysAgo > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {lastFuelInfo.daysAgo === 0 ? 'Dziś' : lastFuelInfo.daysAgo === 1 ? 'Wczoraj' : `${lastFuelInfo.daysAgo} dni temu`}
                            </span>
                            <span className="text-[10px] text-slate-400">• {lastFuelInfo.liters.toFixed(0)} L</span>
                        </Link>
                    )}
                    {/* Vehicle Selector */}
                    {teamVehicles.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm">🚗</span>
                            <select
                                value={selectedVehicleId}
                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 font-medium"
                            >
                                <option value="">Wybierz pojazd...</option>
                                {teamVehicles.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.licensePlate} {v.vehicleName ? `(${v.vehicleName})` : ''}
                                    </option>
                                ))}
                            </select>
                            {selectedVehicleId && (
                                <span className="text-xs text-emerald-600 font-medium">✅</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Hidden photo input */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={photoInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                />


                {/* ============ CREW CARD ============ */}
                {/* When day is started, show collapsed bar; otherwise show full card */}
                {session?.status === 'started' && sessionCollapsed ? (
                    <div
                        onClick={() => setSessionCollapsed(false)}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-sm p-4 flex items-center justify-between cursor-pointer hover:from-emerald-600 hover:to-emerald-700 transition-all"
                    >
                        <div className="flex items-center gap-3 text-white">
                            <span className="text-2xl animate-pulse">🔴</span>
                            <div>
                                <p className="font-bold text-lg">{formatTime(elapsed)}</p>
                                <p className="text-xs opacity-80">Dzień pracy w toku • {crewMembers.length} os.</p>
                            </div>
                        </div>
                        <div className="text-white text-right">
                            <p className="text-xs opacity-80">Kliknij, aby rozwinąć</p>
                            <p className="font-bold text-sm">▼ Rozwiń i zakończ dzień</p>
                        </div>
                    </div>
                ) : (
                <>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h2 className="font-bold text-lg">Skład ekipy</h2>
                        </div>
                        <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                            {crewMembers.length} osób
                        </span>
                    </div>
                    <div className="p-4 space-y-3">
                        {crewMembers.map((member, idx) => (
                            <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                        {member.firstName[0]}{member.lastName?.[0] || ''}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{member.firstName} {member.lastName}</p>
                                        <p className="text-xs text-slate-400">
                                            {member.id === currentUser.id ? '👑 Lider' : `Członek #${idx}`}
                                        </p>
                                    </div>
                                </div>
                                {member.id !== currentUser.id && (!session || session.status === 'pending') && (
                                    <button
                                        onClick={() => removeMember(member.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="Usuń z ekipy na dziś"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add member dropdown */}
                        {(!session || session.status === 'pending') && (
                            <div className="pt-2 border-t border-slate-100">
                                <select
                                    className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white text-slate-600"
                                    value=""
                                    onChange={(e) => {
                                        const m = allTeamMembers.find(x => x.id === e.target.value);
                                        if (m) addMember(m);
                                    }}
                                >
                                    <option value="">+ Dodaj osobę do ekipy...</option>
                                    {allTeamMembers
                                        .filter(m => !crewMembers.some(c => c.id === m.id))
                                        .map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.firstName} {m.lastName}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        {/* Select installation */}
                        {(!session || session.status === 'pending') && todayInstallations.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Montaż na dziś</label>
                                <select
                                    className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white text-slate-600"
                                    value={selectedInstallationId}
                                    onChange={(e) => setSelectedInstallationId(e.target.value)}
                                >
                                    <option value="">Wybierz montaż...</option>
                                    {todayInstallations.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.client.firstName} {inst.client.lastName} — {inst.client.city} ({inst.productSummary})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Confirm crew button */}
                        {(!session || (session.status === 'pending' && isCrewDifferent)) && crewMembers.length > 0 && (
                            <button
                                onClick={handleConfirmCrew}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Potwierdź skład ekipy
                            </button>
                        )}

                        {session?.crewConfirmed && session.status === 'pending' && !isCrewDifferent && (
                            <div className="text-center text-emerald-600 text-sm font-medium py-1">
                                ✅ Skład potwierdzony
                            </div>
                        )}
                    </div>
                </div>

                {/* ============ WORK TIMER CARD ============ */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`px-5 py-3 flex items-center justify-between ${session?.status === 'started'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        : session?.status === 'completed'
                            ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600'
                        }`}>
                        <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h2 className="font-bold text-lg">Czas pracy</h2>
                        </div>
                        {session?.status === 'started' && (
                            <div className="flex items-center gap-2">
                                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full animate-pulse font-medium">
                                    🔴 W TRAKCIE
                                </span>
                                <button
                                    onClick={() => setSessionCollapsed(true)}
                                    className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium hover:bg-white/30"
                                >▲ Zwiń</button>
                            </div>
                        )}
                    </div>
                    <div className="p-5">
                        {/* Timer display */}
                        {session?.status === 'started' && (
                            <div className="text-center mb-5">
                                <div className="text-5xl font-mono font-bold text-slate-800 tracking-wider">
                                    {formatTime(elapsed)}
                                </div>
                                <p className="text-sm text-slate-400 mt-1">
                                    Od {new Date(session.startedAt!).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}

                        {/* Completed summary */}
                        {session?.status === 'completed' && (
                            <div className="text-center mb-4 space-y-3">
                                <div className="text-3xl font-bold text-slate-600">
                                    {session.totalWorkMinutes != null ? formatMinutes(session.totalWorkMinutes) : '—'}
                                </div>
                                <p className="text-sm text-slate-400">
                                    {session.startedAt && new Date(session.startedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    {' → '}
                                    {session.endedAt && new Date(session.endedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    {session.driveToBase && (
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">🏠 Do bazy</span>
                                    )}
                                    {session.driveToHotel && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">🏨 Do hotelu</span>
                                    )}
                                </div>
                                {/* Time summary only - no cost details for installers */}
                                <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Podsumowanie dnia</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">⏱️ Czas pracy</span>
                                        <span className="font-bold text-slate-800">{session.totalWorkMinutes != null ? formatMinutes(session.totalWorkMinutes) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">👷 Skład ekipy</span>
                                        <span className="font-bold text-slate-800">{session.crewMembers?.length || crewMembers.length} osób</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Restart button after accidental end */}
                        {session?.status === 'completed' && (
                            <div className="space-y-2">
                                <button
                                    onClick={handleRestartDay}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                    </svg>
                                    Wznów dzień (przez pomyłkę zakończony)
                                </button>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-2">
                            {(!session || session.status === 'pending') && session?.crewConfirmed && (
                                <button
                                    onClick={handleStartDay}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-200"
                                >
                                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    Rozpocznij dzień
                                </button>
                            )}

                            {session?.status === 'started' && (
                                <button
                                    onClick={() => setShowEndModal(true)}
                                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-lg flex items-center justify-center gap-3 shadow-lg shadow-red-200"
                                >
                                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 6h12v12H6z" />
                                    </svg>
                                    Zakończ dzień
                                </button>
                            )}

                            {!session && (
                                <p className="text-center text-sm text-slate-400 py-2">
                                    Potwierdź skład ekipy, aby rozpocząć dzień
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                </>
                )}

                {/* ============ TODAY'S INSTALLATIONS ============ */}
                {todayInstallations.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <h2 className="font-bold text-lg">Dzisiejsze montaże</h2>
                            </div>
                            <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                                {todayInstallations.length}
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {todayInstallations.map(inst => (
                                <div key={inst.id} className={`p-4 ${selectedInstallationId === inst.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">
                                                {inst.client.firstName} {inst.client.lastName}
                                                {inst.contractNumber && <span className="text-xs text-slate-400 ml-2">{inst.contractNumber}</span>}
                                            </h3>
                                            {/* Multi-day badge */}
                                            {inst.expectedDuration && inst.expectedDuration > 1 && (
                                                <div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                                                    📅 Dzień {Math.round((new Date(new Date().toISOString().split('T')[0]).getTime() - new Date(inst.scheduledDate!.split('T')[0]).getTime()) / 86400000) + 1}/{inst.expectedDuration}
                                                </div>
                                            )}
                                            <p className="text-sm text-slate-500">{inst.client.address}</p>
                                            <p className="text-sm text-slate-500">{inst.client.postalCode} {inst.client.city}</p>
                                            {inst.client.phone && (
                                                <a href={`tel:${inst.client.phone}`} className="inline-flex items-center gap-1.5 mt-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 font-medium hover:bg-blue-100 transition-colors">
                                                    📞 {inst.client.phone}
                                                </a>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">{inst.productSummary}</p>

                                            {(inst.paymentMethod === 'cash' || inst.contractData?.paymentMethod === 'cash') && (
                                                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                                                    <span className="text-lg">💵</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-yellow-700">GOTÓWKA DO POBRANIA</p>
                                                        <p className="text-sm font-bold text-yellow-800">
                                                            {inst.contractData?.remainingAmount?.toLocaleString('de-DE') || inst.contractData?.totalPrice?.toLocaleString('de-DE') || '---'} EUR
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                {inst.partsReady || inst.partsStatus === 'all_delivered' ? (
                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✅ Materiały komplet</span>
                                                ) : inst.partsStatus === 'partial' ? (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⚠️ Częściowo</span>
                                                ) : (
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">❌ Sprawdź z biurem</span>
                                                )}
                                                {inst.expectedDuration && inst.expectedDuration > 1 && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                                        📅 {inst.expectedDuration} dni
                                                    </span>
                                                )}
                                            </div>

                                            {(inst.notes || inst.contractData?.notes) && (
                                                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                                                    ⚠️ {inst.notes || inst.contractData?.notes}
                                                </div>
                                            )}

                                            {/* Order Items — what needs to be installed */}
                                            {orderItemsMap[inst.id] && orderItemsMap[inst.id].length > 0 && (
                                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1">
                                                        📦 Elementy do montażu ({orderItemsMap[inst.id].filter(oi => oi.status === 'delivered').length}/{orderItemsMap[inst.id].length} dostarczone)
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {orderItemsMap[inst.id].map((oi) => (
                                                            <div key={oi.id} className="flex items-center gap-2 px-1 py-1">
                                                                <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 text-xs ${
                                                                    oi.status === 'delivered' ? 'bg-green-500 border-green-500 text-white' :
                                                                    oi.status === 'ordered' ? 'bg-amber-100 border-amber-300 text-amber-600' :
                                                                    'border-slate-300 bg-white text-slate-400'
                                                                }`}>
                                                                    {oi.status === 'delivered' ? '✓' : oi.status === 'ordered' ? '⏳' : '—'}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm ${oi.status === 'delivered' ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                                                                        {oi.name} {oi.quantity > 1 ? `×${oi.quantity}` : ''}
                                                                    </p>
                                                                    {oi.notes && <p className="text-[10px] text-slate-400 truncate">{oi.notes}</p>}
                                                                </div>
                                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                                                    oi.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                    oi.status === 'ordered' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {oi.status === 'delivered' ? 'Dostarczono' : oi.status === 'ordered' ? 'Zamówiono' : 'Oczekuje'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Contract notes / remarks */}
                                            {inst.offerId && contractDataMap[inst.offerId] && (
                                                <>
                                                    {contractDataMap[inst.offerId]?.notes && (
                                                        <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-2 text-xs text-purple-700">
                                                            📋 <strong>Uwagi z umowy:</strong> {contractDataMap[inst.offerId].notes}
                                                        </div>
                                                    )}
                                                    {contractDataMap[inst.offerId]?.product?.customItems && contractDataMap[inst.offerId].product.customItems.length > 0 && !orderItemsMap[inst.id]?.length && (
                                                        <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-xs text-indigo-700">
                                                            <strong>Elementy:</strong> {contractDataMap[inst.offerId].product.customItems.map((ci: any) => ci.name).join(', ')}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Measurement Tasks (Zadania do domierzenia) */}
                                            {inst.measurementTasks && inst.measurementTasks.length > 0 && (
                                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                    <h4 className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">
                                                        📐 Zadania do domierzenia ({inst.measurementTasks.filter((t: any) => t.completed).length}/{inst.measurementTasks.length})
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {inst.measurementTasks.map((task: any) => (
                                                            <button
                                                                key={task.id}
                                                                onClick={() => handleToggleMeasurementTask(inst.id, task.id)}
                                                                disabled={togglingTask === task.id}
                                                                className="flex items-center gap-2 w-full text-left hover:bg-amber-100/50 rounded px-1 py-1 transition-colors disabled:opacity-50"
                                                            >
                                                                <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                    task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-amber-300 bg-white'
                                                                }`}>
                                                                    {task.completed && (
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </span>
                                                                <p className={`text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                                    {task.description}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quick note from installer */}
                                            <div className="mt-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Notatka z montażu..."
                                                        value={installerNotes[inst.id] || ''}
                                                        onChange={(e) => setInstallerNotes(prev => ({ ...prev, [inst.id]: e.target.value }))}
                                                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && installerNotes[inst.id]?.trim()) {
                                                                handleSaveInstallerNote(inst.id);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleSaveInstallerNote(inst.id)}
                                                        disabled={!installerNotes[inst.id]?.trim() || savingNote === inst.id}
                                                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                                                    >
                                                        {savingNote === inst.id ? '...' : '📝'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Photo Gallery */}
                                            {installationPhotos[inst.id] && installationPhotos[inst.id].length > 0 && (
                                                <div className="mt-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                        📸 Zdjęcia ({installationPhotos[inst.id].length})
                                                    </h4>
                                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                                        {installationPhotos[inst.id].map((url, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-shrink-0"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Zdjęcie ${idx + 1}`}
                                                                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:border-blue-400 transition-colors"
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 ml-3">
                                            <button
                                                onClick={() => openNavigation(inst)}
                                                className="bg-blue-500 text-white p-2.5 rounded-xl hover:bg-blue-600 transition-colors"
                                                title="Nawigacja"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                </svg>
                                            </button>
                                            <a href={`tel:${inst.client.phone}`} className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-colors" title="Zadzwoń">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </a>
                                            <Link
                                                to={`/installer/acceptance/${inst.id}`}
                                                className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 transition-colors"
                                                title="Protokół odbioru"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => triggerPhotoUpload(inst.id)}
                                                disabled={photoUploading === inst.id}
                                                className={`text-white p-2.5 rounded-xl transition-colors ${photoUploading === inst.id ? 'bg-slate-400' : 'bg-purple-500 hover:bg-purple-600'}`}
                                                title="Zrób zdjęcie montażu"
                                            >
                                                {photoUploading === inst.id ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {todayInstallations.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-slate-500">Brak montaży na dziś</p>
                    </div>
                )}

                {/* ============ QUICK ACTION TILES ============ */}
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/installer/fuel" className="group">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-sm p-5 text-white group-hover:scale-[1.02] transition-transform">
                            <div className="bg-white/20 p-2.5 rounded-xl w-fit mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="font-bold">Tankowanie</h3>
                            <p className="text-xs opacity-80">Zapisz tankowanie</p>
                        </div>
                    </Link>
                    {officePhone ? (
                        <a href={`tel:${officePhone}`} className="group">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-sm p-5 text-white group-hover:scale-[1.02] transition-transform">
                                <div className="bg-white/20 p-2.5 rounded-xl w-fit mb-3">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <h3 className="font-bold">Zadzwoń do biura</h3>
                                <p className="text-xs opacity-80">{officeManagerName || 'Manager'}</p>
                            </div>
                        </a>
                    ) : (
                    <Link to="/installer/requests" className="group">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-sm p-5 text-white group-hover:scale-[1.02] transition-transform">
                            <div className="bg-white/20 p-2.5 rounded-xl w-fit mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="font-bold">Wnioski</h3>
                            <p className="text-xs opacity-80">Zgłoszenia i wnioski</p>
                        </div>
                    </Link>
                    )}
                    <Link to="/installer/failure-report" className="group">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-sm p-5 text-white group-hover:scale-[1.02] transition-transform">
                            <div className="bg-white/20 p-2.5 rounded-xl w-fit mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="font-bold">Usterka</h3>
                            <p className="text-xs opacity-80">Zgłoś problem</p>
                        </div>
                    </Link>
                    <Link to="/installer/calendar" className="group">
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-sm p-5 text-white group-hover:scale-[1.02] transition-transform">
                            <div className="bg-white/20 p-2.5 rounded-xl w-fit mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="font-bold">Kalendarz</h3>
                            <p className="text-xs opacity-80">Pełny terminarz</p>
                        </div>
                    </Link>
                </div>

                {/* ============ TASKS / TO-DO ============ */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <h2 className="font-bold text-lg">Zadania</h2>
                        </div>
                    </div>
                    <div className="p-4">
                        <TasksList filterUserId={currentUser.id} />
                    </div>
                </div>

                {/* ============ WEEK CALENDAR ============ */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h2 className="font-bold text-lg">Nadchodzący tydzień</h2>
                        </div>
                        <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                            {weekInstallations.length} montaży
                        </span>
                    </div>
                    {weekInstallations.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {weekInstallations.map(inst => {
                                const d = new Date(inst.scheduledDate!);
                                const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                                return (
                                    <div key={inst.id} className={`p-4 flex items-center gap-4 ${isToday ? 'bg-blue-50' : ''}`}>
                                        <div className={`text-center min-w-[50px] ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                                            <div className="text-xs font-medium uppercase">
                                                {d.toLocaleDateString('pl-PL', { weekday: 'short' })}
                                            </div>
                                            <div className="text-2xl font-bold">{d.getDate()}</div>
                                            <div className="text-[10px]">
                                                {d.toLocaleDateString('pl-PL', { month: 'short' })}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">
                                                {inst.client.firstName} {inst.client.lastName}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {inst.client.city} • {inst.client.address}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{inst.productSummary}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {inst.partsReady || inst.partsStatus === 'all_delivered' ? (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✅</span>
                                            ) : (
                                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">❌</span>
                                            )}
                                            {isToday && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">DZIŚ</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Brak zaplanowanych montaży na najbliższy tydzień
                        </div>
                    )}
                </div>
            </div>

            {/* ============ END DAY MODAL ============ */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEndModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Zakończ dzień pracy</h3>
                        <p className="text-sm text-slate-500 mb-4">Gdzie jedziesz po montażu?</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleEndDay(true)}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center gap-4 px-5"
                            >
                                <span className="text-2xl">🏠</span>
                                <div className="text-left">
                                    <p className="font-bold">Wracam na bazę</p>
                                    <p className="text-xs opacity-80">Zakończ dzień po dojeździe na bazę</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleEndDay(false)}
                                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors flex items-center gap-4 px-5"
                            >
                                <span className="text-2xl">🏨</span>
                                <div className="text-left">
                                    <p className="font-bold">Jadę do hotelu</p>
                                    <p className="text-xs opacity-80">Zakończ pracę teraz (koniec montażu)</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowEndModal(false)}
                                className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors text-sm"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
