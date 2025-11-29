import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseService } from '../../services/database';
import { useAuth } from '../../contexts/AuthContext';
import type { MeasurementReport, User } from '../../types';
import { toast } from 'react-hot-toast';

export const ReportsList: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Map<string, User>>(new Map());

    const loadReports = useCallback(async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            // DatabaseService.getReports() now respects RLS automatically
            // Admin/Manager will get all reports, Sales Rep will get only their own
            const allReports = await DatabaseService.getReports();

            // Admin can additionally filter by specific user
            const filtered = (isAdmin() && selectedUserId !== 'all')
                ? allReports.filter(r => r.salesRepId === selectedUserId)
                : allReports;

            setReports(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Błąd podczas ładowania raportów');
        } finally {
            setLoading(false);
        }
    }, [currentUser, isAdmin, selectedUserId]);

    useEffect(() => {
        const loadData = async () => {
            // Load sales reps for admin filter
            if (isAdmin()) {
                try {
                    const reps = await DatabaseService.getSalesReps();
                    setSalesReps(reps);
                } catch (error) {
                    console.error('Error loading sales reps:', error);
                }
            }

            // Load all users for name lookup
            try {
                const users = await DatabaseService.getAllUsers();
                const map = new Map(users.map(u => [u.id, u]));
                setUserMap(map);
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };
        loadData();
    }, [isAdmin]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten raport?')) {
            try {
                await DatabaseService.deleteReport(id);
                await loadReports();
                toast.success('Raport usunięty');
            } catch (error) {
                console.error('Error deleting report:', error);
                toast.error('Błąd podczas usuwania raportu');
            }
        }
    };

    const getUserName = (userId: string): string => {
        const user = userMap.get(userId);
        return user ? `${user.firstName} ${user.lastName}` : 'Nieznany';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Raporty Pomiarowe</h1>
                    <p className="text-slate-400 mt-1">Historia Twoich wyjazdów i wizyt.</p>
                </div>
                <div className="flex gap-3">
                    {/* Admin: Sales Rep Filter */}
                    {isAdmin() && salesReps.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="px-4 py-2 border border-slate-700 rounded-lg bg-surface text-slate-300 font-medium focus:ring-2 focus:ring-accent outline-none"
                        >
                            <option value="all">Wszyscy przedstawiciele</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>
                                    {rep.firstName} {rep.lastName}
                                </option>
                            ))}
                        </select>
                    )}
                    <Link
                        to="/reports/new"
                        className="px-6 py-3 bg-accent text-white font-bold rounded-xl shadow-lg hover:bg-accent/80 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy Raport
                    </Link>
                </div>
            </div>

            <div className="bg-surface rounded-xl shadow-sm border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-slate-400 font-medium border-b border-slate-700">
                        <tr>
                            <th className="px-6 py-4">Data</th>
                            {isAdmin() && (
                                <th className="px-6 py-4">Przedstawiciel</th>
                            )}
                            <th className="px-6 py-4">Auto</th>
                            <th className="px-6 py-4 text-center">Dystans</th>
                            <th className="px-6 py-4 text-center">Wizyty</th>
                            <th className="px-6 py-4 text-center">Oferty</th>
                            <th className="px-6 py-4 text-center">Umowy</th>
                            <th className="px-6 py-4 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {reports.length > 0 ? (
                            reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">
                                            {new Date(report.date).toLocaleDateString('pl-PL')}
                                        </div>
                                    </td>
                                    {isAdmin() && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-300">
                                                {getUserName(report.salesRepId)}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-white">{report.carPlate}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-300">
                                        {report.totalKm} km
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
                                            {report.visits.length}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!report.offerIds || report.offerIds.length === 0
                                                ? 'bg-slate-800 text-slate-500'
                                                : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {report.offerIds ? report.offerIds.length : 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {report.signedContractsCount > 0 ? (
                                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">
                                                {report.signedContractsCount}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(report.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                            title="Usuń raport"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isAdmin() ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                                    Brak raportów. Dodaj pierwszy raport klikając przycisk powyżej.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
