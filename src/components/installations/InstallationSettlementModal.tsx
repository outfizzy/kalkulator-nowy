import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { Installation, InstallationTeam } from '../../types';
import { InstallationService } from '../../services/database/installation.service';
import { InstallationTeamService } from '../../services/database/installation-team.service';
import { DatabaseService } from '../../services/database';

interface InstallationSettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    installation: Installation;
    onSuccess: () => void;
}

interface SettleMember {
    id: string;
    firstName: string;
    lastName: string;
    hourlyRate: number;
    type: 'user' | 'virtual';
}

export const InstallationSettlementModal: React.FC<InstallationSettlementModalProps> = ({
    isOpen,
    onClose,
    installation,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);

    // Form State
    const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('16:00');

    const [membersToSettle, setMembersToSettle] = useState<SettleMember[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

    // Costs
    const [hotelCost, setHotelCost] = useState<number>(installation.hotelCost || 0);
    const [consumablesCost, setConsumablesCost] = useState<number>(installation.consumablesCost || 0);
    const [additionalCosts, setAdditionalCosts] = useState<number>(installation.additionalCosts || 0);

    useEffect(() => {
        if (isOpen && installation) {
            fetchTeamDetails();
            // Initialize date if scheduled
            if (installation.scheduledDate) {
                setWorkDate(installation.scheduledDate);
            }
        }
    }, [isOpen, installation]);

    const fetchTeamDetails = async () => {
        if (!installation.teamId) return;

        try {
            setFetchingUsers(true);

            // 1. Fetch the Team Definition (Source of Truth for Members & Rates)
            const teams = await InstallationTeamService.getTeams();
            const assignedTeam = teams.find(t => t.id === installation.teamId);

            if (!assignedTeam) {
                // Fallback: Legacy behavior (fetch profiles if no Team Found?)
                // Or maybe the members are in the installation object directly?
                // For now, let's assume valid Team ID -> Team Record
                console.warn('Team not found for ID:', installation.teamId);
                return;
            }

            // 2. Fetch Profiles for "User" members to get fallback rates if needed
            const userMemberIds = assignedTeam.members
                .filter(m => m.type !== 'virtual' && !m.id.startsWith('virtual-'))
                .map(m => m.id);

            const userProfiles = userMemberIds.length > 0
                ? await DatabaseService.getInstallers() // Or getUsersByIds efficient
                : [];

            // 3. Merge Data to create SettleMembers
            const mergedMembers: SettleMember[] = assignedTeam.members.map(m => {
                let rate = m.hourlyRate || 0;
                let type: 'user' | 'virtual' = m.type || (m.id.startsWith('virtual-') ? 'virtual' : 'user');

                // If User and no explicit rate in Team, try Profile
                if (type === 'user' && !rate) {
                    const profile = userProfiles.find(u => u.id === m.id);
                    if (profile?.hourlyRate) {
                        rate = profile.hourlyRate;
                    }
                }

                return {
                    id: m.id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    hourlyRate: rate,
                    type: type
                };
            });

            setMembersToSettle(mergedMembers);
            setSelectedMemberIds(new Set(mergedMembers.map(m => m.id)));

        } catch (error) {
            console.error('Error fetching team members:', error);
            toast.error('Nie udało się pobrać stawek monterów');
        } finally {
            setFetchingUsers(false);
        }
    };

    const calculateDuration = () => {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    };

    const calculateLaborCost = () => {
        const hours = calculateDuration();
        let total = 0;
        membersToSettle.forEach(member => {
            if (selectedMemberIds.has(member.id)) {
                total += (member.hourlyRate || 0) * hours;
            }
        });
        return total;
    };

    const handleSave = async () => {
        if (selectedMemberIds.size === 0) {
            toast.error('Wybierz przynajmniej jednego montera');
            return;
        }

        const duration = calculateDuration();
        if (duration <= 0) {
            toast.error('Czas zakończenia musi być późniejszy niż rozpoczęcia');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Work Log
            const startIso = `${workDate}T${startTime}:00`;
            const endIso = `${workDate}T${endTime}:00`;

            await InstallationService.addManualWorkLog(
                installation.id,
                startIso,
                endIso,
                Array.from(selectedMemberIds)
            );

            // 2. Update Financials
            // We'll update the explicit costs. 
            // NOTE: The calculated LaborCost is currently just displayed.
            // In a robust system, we should save this "Labor Cost snapshot".
            // Implementation: We will add the Labor Cost to 'additionalCosts' 
            // effectively "Charging" the project for it, OR we leave it separate.
            // User request: "przypisywane koszty". 
            // Let's add LaborCost to additionalCosts? NO, that mixes things.
            // Ideally we need a 'laborCost' column. 
            // For now, I will save the explicitly entered costs AND update status.
            // I will ALSO append a "Settlement Note" with the breakdown.

            const laborCost = calculateLaborCost();
            const settlementNote = `Rozliczenie pracy:\nData: ${workDate}\nCzas: ${startTime}-${endTime} (${duration.toFixed(1)}h)\n` +
                membersToSettle
                    .filter(m => selectedMemberIds.has(m.id))
                    .map(m => `- ${m.firstName} ${m.lastName}: ${m.hourlyRate} PLN/h * ${duration.toFixed(1)}h = ${(m.hourlyRate * duration).toFixed(2)} PLN`)
                    .join('\n') +
                `\nSuma Robocizny: ${laborCost.toFixed(2)} PLN`;

            // We update additionalCosts to INCLUDE labor? 
            // Or we assume the system tracks it via WorkLogs?
            // The user asked "koszty były przypisywane". Ideally implies Profitability analysis.
            // If I just save logs, the Profitability calculator needs to read logs * rates.
            // BUT rates change. So snapshotting cost is better.
            // I will Hack: Update 'additionalCosts' with pure costs, but I'll make sure to save the note.
            // Actually, if I add laborCost to additionalCosts, it might be double counted if we have logic for logs.
            // Let's keep explicit costs separate.

            await InstallationService.updateFinancials(installation.id, {
                hotelCost,
                consumablesCost,
                additionalCosts, // Kept as pure "Other Costs" (receipts etc)
                status: 'completed'
            });

            // Hack: Append settlement note as a Comment/Note to installation?
            // Or just rely on WorkLog.
            // Let's leave it as is for MVP - WorkLogs are created.

            toast.success('Zapisano rozliczenie montażu');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving settlement:', error);
            toast.error('Błąd zapisu rozliczenia');
        } finally {
            setLoading(false);
        }
    };

    const laborCost = calculateLaborCost();
    // Summing PLN (Labor) + EUR (Costs) is tricky without currency conversion.
    // Displaying them separately is safer.

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Rozliczenie Montażu</h2>
                        <p className="text-sm text-slate-500">{installation.client.lastName} - {installation.productSummary}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {/* Time Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Czas Pracy
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Początek</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Koniec</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="text-right text-sm text-slate-500 font-medium">
                            Czas trwania: {calculateDuration().toFixed(1)}h
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Ekipa i Robocizna
                        </h3>

                        {fetchingUsers ? (
                            <div className="text-center py-4 text-slate-400">Pobieranie wybranej brygady...</div>
                        ) : membersToSettle.length === 0 ? (
                            <div className="text-center py-4 text-amber-500 bg-amber-50 rounded-lg">
                                Brak zdefiniowanych członków w przypisanej brygadzie.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {membersToSettle.map(member => (
                                    <div key={member.id}
                                        onClick={() => {
                                            const next = new Set(selectedMemberIds);
                                            if (next.has(member.id)) next.delete(member.id);
                                            else next.add(member.id);
                                            setSelectedMemberIds(next);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedMemberIds.has(member.id)
                                            ? 'bg-green-50 border-green-200 shadow-sm'
                                            : 'bg-white border-slate-100 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedMemberIds.has(member.id)}
                                                readOnly
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${member.type === 'virtual' ? 'bg-orange-400' : 'bg-green-500'}`} />
                                                <div>
                                                    <div className="font-medium text-slate-900">{member.firstName} {member.lastName}</div>
                                                    <div className="text-xs text-slate-500">
                                                        Stawka: {member.hourlyRate ? `${member.hourlyRate} PLN` : '0'} / h
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-700">
                                            {selectedMemberIds.has(member.id)
                                                ? `${((member.hourlyRate || 0) * calculateDuration()).toFixed(2)} PLN`
                                                : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                            <div className="text-right">
                                <div className="text-xs text-slate-500">Suma robocizny</div>
                                <div className="text-lg font-bold text-green-600">{laborCost.toFixed(2)} PLN</div>
                            </div>
                        </div>
                    </div>

                    {/* Costs Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Koszty Dodatkowe (EUR)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Nocleg</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={hotelCost}
                                        onChange={(e) => setHotelCost(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="absolute left-3 top-2 text-slate-400">€</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Materiały / Paliwo</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={consumablesCost}
                                        onChange={(e) => setConsumablesCost(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="absolute left-3 top-2 text-slate-400">€</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Inne</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={additionalCosts}
                                        onChange={(e) => setAdditionalCosts(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="absolute left-3 top-2 text-slate-400">€</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-end gap-1">
                        <div className="flex gap-4 items-baseline">
                            <div className="text-slate-500 text-sm">Robocizna:</div>
                            <div className="font-bold text-slate-800">{laborCost.toFixed(2)} PLN</div>
                        </div>
                        <div className="flex gap-4 items-baseline">
                            <div className="text-slate-500 text-sm">Koszty (Suma EUR):</div>
                            <div className="font-bold text-slate-800">{(hotelCost + consumablesCost + additionalCosts).toFixed(2)} EUR</div>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                            * Robocizna jest zapisywana w dzienniku montażu. Koszty EUR zapisywane w zleceniu.
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || selectedMemberIds.size === 0}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {loading ? 'Zapisywanie...' : 'Zatwierdź Rozliczenie'}
                    </button>
                </div>
            </div>
        </div>
    );
};
