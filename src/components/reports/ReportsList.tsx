import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReportsForUser, deleteReport, getSalesReps, getUserById, getReports, getAllOffers } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import type { MeasurementReport, User, Offer } from '../../types';
import { toast } from 'react-hot-toast';

export const ReportsList: React.FC = () => {
    const { currentUser, isAdmin } = useAuth();
    const [reports, setReports] = useState<MeasurementReport[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);

    const loadReports = () => {
        if (!currentUser) return;

        // Admin: load all or filter by selected user
        if (isAdmin()) {
            const allReports = getReports();
            const filtered = selectedUserId === 'all'
                ? allReports
                : allReports.filter(r => r.salesRepId === selectedUserId);
            setReports(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            // Sales rep: load only own reports
            const userReports = getReportsForUser(currentUser.id, currentUser.role);
            setReports(userReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    };

    useEffect(() => {
        // Load sales reps for admin filter
        if (isAdmin()) {
            setSalesReps(getSalesReps());
        }
    }, [isAdmin]);

    useEffect(() => {
        loadReports();
        setOffers(getAllOffers());
    }, [currentUser, selectedUserId]);

    const handleDelete = (id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten raport?')) {
            deleteReport(id);
            loadReports();
            toast.success('Raport usunięty');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Raporty Pomiarowe</h1>
                    <p className="text-slate-500 mt-1">Historia Twoich wyjazdów i wizyt.</p>
                </div>
                <div className="flex gap-3">
                    {/* Admin: Sales Rep Filter */}
                    {isAdmin() && salesReps.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-accent outline-none"
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
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy Raport
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
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
                    <tbody className="divide-y divide-slate-100">
                        {reports.length > 0 ? (
                            reports.map((report) => (
                                <React.Fragment key={report.id}>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">
                                                {new Date(report.date).toLocaleDateString('pl-PL')}
                                            </div>
                                        </td>
                                        {isAdmin() && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-700">
                                                    {getUserById(report.salesRepId)?.firstName} {getUserById(report.salesRepId)?.lastName || 'Nieznany'}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{report.carPlate}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-slate-600">
                                            {report.totalKm} km
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {report.visits.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                                                disabled={!report.offerIds || report.offerIds.length === 0}
                                                className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${!report.offerIds || report.offerIds.length === 0
                                                        ? 'bg-slate-100 text-slate-400 cursor-default'
                                                        : expandedReportId === report.id
                                                            ? 'bg-purple-200 text-purple-900 ring-2 ring-purple-500'
                                                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                    }`}
                                            >
                                                {report.offerIds ? report.offerIds.length : 0}
                                                {report.offerIds && report.offerIds.length > 0 && (
                                                    <svg className={`w-3 h-3 ml-1 transform transition-transform ${expandedReportId === report.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {report.signedContractsCount > 0 ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                                    {report.signedContractsCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                                title="Usuń raport"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedReportId === report.id && report.offerIds && report.offerIds.length > 0 && (
                                        <tr className="bg-purple-50">
                                            <td colSpan={isAdmin() ? 8 : 7} className="px-6 py-4 border-t border-purple-100">
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-700 mb-2">Przypisane oferty:</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {report.offerIds.map(offerId => {
                                                            const offer = offers.find(o => o.id === offerId);
                                                            if (!offer) return (
                                                                <div key={offerId} className="text-slate-400 italic text-xs">
                                                                    Oferta #{offerId.slice(0, 8)} (usunięta)
                                                                </div>
                                                            );
                                                            return (
                                                                <div key={offerId} className="bg-white p-3 rounded border border-purple-100 shadow-sm flex justify-between items-center">
                                                                    <div>
                                                                        <div className="font-medium text-slate-900">{offer.customer.firstName} {offer.customer.lastName}</div>
                                                                        <div className="text-xs text-slate-500">{offer.customer.city} • #{offer.id.slice(0, 8)}</div>
                                                                    </div>
                                                                    {/* Note: We don't have direct link to specific offer in OffersList yet, but we can link to list */}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isAdmin() ? 8 : 7} className="px-6 py-12 text-center text-slate-400">
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
