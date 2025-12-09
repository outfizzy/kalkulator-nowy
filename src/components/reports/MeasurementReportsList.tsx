import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import type { MeasurementReport } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const MeasurementReportsList: React.FC = () => {
    const { isAdmin, currentUser } = useAuth();
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, [currentUser, isAdmin]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const filters = isAdmin() ? {} : { userId: currentUser?.id };
            const data = await DatabaseService.getMeasurementReports(filters);
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
            toast.error('Nie udało się pobrać raportów');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie raportów...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Raporty Pomiarowe</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {reports.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        Brak raportów do wyświetlenia.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    {isAdmin() && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Przedstawiciel</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Auto</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dystans</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Klientów</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {new Date(report.date).toLocaleDateString('pl-PL')}
                                        </td>
                                        {isAdmin() && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {/* Would need to join user name in real app or fetch it */}
                                                {report.salesRepId}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {report.carPlate} {report.withDriver && <span className="ml-2 text-xs bg-slate-200 px-1.5 py-0.5 rounded">z kierowcą</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900 font-bold">
                                            {report.totalKm} km
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {report.visits.length}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
