import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../services/database';
import type { FailureReport, FailureReportStatus } from '../../types';
import { toast } from 'react-hot-toast';

export const FailureReportManager: React.FC = () => {
    const [reports, setReports] = useState<FailureReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await DatabaseService.getFailureReports();
            setReports(data);
        } catch (error) {
            console.error('Error loading failure reports:', error);
            toast.error('Błąd ładowania zgłoszeń');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const handleStatusChange = async (id: string, status: FailureReportStatus) => {
        try {
            const { error } = await DatabaseService.updateFailureReportStatus(id, status);
            if (error) throw error;
            toast.success('Status zaktualizowany');
            loadLogs();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Błąd aktualizacji statusu');
        }
    };

    const filteredReports = reports.filter(report => {
        if (filterStatus === 'all') return true;
        return report.status === filterStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'resolved': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Oczekujące';
            case 'in_progress': return 'W trakcie';
            case 'resolved': return 'Rozwiązane';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Zgłoszenia Awarii</h1>
                <p className="text-slate-500 text-sm">Zarządzaj zgłoszeniami zepsutego sprzętu</p>
            </div>

            {/* Filter */}
            <div className="flex gap-3">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                >
                    <option value="all">Wszystkie</option>
                    <option value="pending">Oczekujące</option>
                    <option value="in_progress">W trakcie</option>
                    <option value="resolved">Rozwiązane</option>
                </select>
                <button
                    onClick={loadLogs}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    Odśwież
                </button>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Monter</th>
                                <th className="px-6 py-3">Sprzęt</th>
                                <th className="px-6 py-3">Opis</th>
                                <th className="px-6 py-3">Zdjęcie</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Brak zgłoszeń
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(report.createdAt).toLocaleDateString('pl-PL')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {report.user ? `${report.user.firstName} ${report.user.lastName}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{report.equipmentName}</td>
                                        <td className="px-6 py-4 max-w-xs truncate">{report.description}</td>
                                        <td className="px-6 py-4">
                                            {report.photoUrl ? (
                                                <a
                                                    href={report.photoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-accent hover:underline"
                                                >
                                                    Zobacz
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">Brak</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                                                {getStatusLabel(report.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={report.status}
                                                onChange={(e) => handleStatusChange(report.id, e.target.value as FailureReportStatus)}
                                                className="px-3 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                            >
                                                <option value="pending">Oczekujące</option>
                                                <option value="in_progress">W trakcie</option>
                                                <option value="resolved">Rozwiązane</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
