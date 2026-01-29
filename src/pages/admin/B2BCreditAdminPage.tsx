/**
 * B2B Credit Applications Admin Page
 * Admin page for reviewing and managing credit applications
 */

import React, { useState, useEffect } from 'react';
import { B2BService } from '../../services/database/b2b.service';
import type { B2BCreditApplication } from '../../services/database/b2b.service';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-700', icon: '📝' },
    submitted: { label: 'Eingereicht', color: 'bg-blue-100 text-blue-700', icon: '📤' },
    under_review: { label: 'In Prüfung', color: 'bg-yellow-100 text-yellow-800', icon: '🔍' },
    approved: { label: 'Genehmigt', color: 'bg-green-100 text-green-700', icon: '✅' },
    rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: '❌' },
    cancelled: { label: 'Storniert', color: 'bg-gray-100 text-gray-500', icon: '🚫' }
};

type FilterType = 'pending' | 'approved' | 'rejected' | 'all';

export function B2BCreditAdminPage() {
    const [applications, setApplications] = useState<B2BCreditApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<B2BCreditApplication | null>(null);
    const [filter, setFilter] = useState<FilterType>('pending');

    // Decision form
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [approvedDays, setApprovedDays] = useState('30');
    const [decisionNotes, setDecisionNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadApplications();
    }, []);

    async function loadApplications() {
        setLoading(true);
        try {
            const data = await B2BService.getCreditApplications();
            setApplications(data);
        } catch (err) {
            console.error('Error loading applications:', err);
            toast.error('Fehler beim Laden der Anträge');
        }
        setLoading(false);
    }

    async function loadDetail(id: string) {
        try {
            const app = await B2BService.getCreditApplicationById(id);
            setSelectedApp(app);
        } catch (err) {
            console.error('Error loading application:', err);
        }
    }

    function openDecisionModal(type: 'approve' | 'reject') {
        if (!selectedApp) return;
        setDecisionType(type);
        setApprovedAmount(selectedApp.requested_amount.toString());
        setApprovedDays(selectedApp.requested_payment_days.toString());
        setDecisionNotes('');
        setShowDecisionModal(true);
    }

    async function handleDecision() {
        if (!selectedApp) return;

        setSubmitting(true);
        try {
            if (decisionType === 'approve') {
                await B2BService.approveCreditApplication(
                    selectedApp.id,
                    parseFloat(approvedAmount),
                    parseInt(approvedDays),
                    decisionNotes || undefined
                );
                toast.success('Kreditantrag genehmigt!');
            } else {
                if (!decisionNotes) {
                    toast.error('Bitte geben Sie einen Ablehnungsgrund an');
                    setSubmitting(false);
                    return;
                }
                await B2BService.rejectCreditApplication(selectedApp.id, decisionNotes);
                toast.success('Kreditantrag abgelehnt');
            }
            setShowDecisionModal(false);
            setSelectedApp(null);
            await loadApplications();
        } catch (err: any) {
            toast.error(err.message || 'Fehler bei der Bearbeitung');
        }
        setSubmitting(false);
    }

    async function markUnderReview(id: string) {
        try {
            await B2BService.updateCreditApplication(id, { status: 'under_review' });
            toast.success('Status aktualisiert');
            await loadApplications();
            if (selectedApp?.id === id) {
                await loadDetail(id);
            }
        } catch (err) {
            toast.error('Fehler beim Aktualisieren');
        }
    }

    const filteredApps = applications.filter(app => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['submitted', 'under_review'].includes(app.status);
        if (filter === 'approved') return app.status === 'approved';
        if (filter === 'rejected') return app.status === 'rejected';
        return true;
    });

    const counts = {
        pending: applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
        approved: applications.filter(a => a.status === 'approved').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
        all: applications.length
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    💳 Kreditanträge
                </h1>
                <p className="text-gray-500 mt-1">Prüfen und genehmigen Sie Kreditanträge von B2B Partnern</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-yellow-700">{counts.pending}</div>
                    <div className="text-sm text-yellow-600">Offen</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-green-700">{counts.approved}</div>
                    <div className="text-sm text-green-600">Genehmigt</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-red-700">{counts.rejected}</div>
                    <div className="text-sm text-red-600">Abgelehnt</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-gray-700">{counts.all}</div>
                    <div className="text-sm text-gray-600">Gesamt</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-6">
                {(['pending', 'approved', 'rejected', 'all'] as FilterType[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'pending' && 'Offene Anträge'}
                        {f === 'approved' && 'Genehmigt'}
                        {f === 'rejected' && 'Abgelehnt'}
                        {f === 'all' && 'Alle'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Applications List */}
                <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="font-semibold text-gray-800">{filteredApps.length} Anträge</h2>
                    </div>
                    <div className="divide-y max-h-[700px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Lade...</div>
                        ) : filteredApps.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <div className="text-4xl mb-2">📋</div>
                                <p>Keine Anträge gefunden</p>
                            </div>
                        ) : (
                            filteredApps.map(app => (
                                <div
                                    key={app.id}
                                    onClick={() => loadDetail(app.id)}
                                    className={`p-4 cursor-pointer transition-colors ${selectedApp?.id === app.id
                                        ? 'bg-blue-50 border-l-4 border-blue-600'
                                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-gray-900">
                                                {(app.partner as any)?.company_name || app.company_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                €{app.requested_amount.toLocaleString()} • {app.requested_payment_days} Tage
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_CONFIG[app.status]?.color}`}>
                                            {STATUS_CONFIG[app.status]?.icon}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Eingereicht: {format(new Date(app.created_at), 'dd.MM.yyyy HH:mm')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Application Detail */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border shadow-sm min-h-[700px]">
                    {selectedApp ? (
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedApp.company_name}</h2>
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedApp.status]?.color}`}>
                                        {STATUS_CONFIG[selectedApp.status]?.icon} {STATUS_CONFIG[selectedApp.status]?.label}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-blue-600">
                                        €{selectedApp.requested_amount.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {selectedApp.requested_payment_days} Tage Zahlungsziel
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {['submitted', 'under_review'].includes(selectedApp.status) && (
                                <div className="flex gap-3 mb-6">
                                    {selectedApp.status === 'submitted' && (
                                        <button
                                            onClick={() => markUnderReview(selectedApp.id)}
                                            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium"
                                        >
                                            🔍 In Prüfung nehmen
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openDecisionModal('approve')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                    >
                                        ✅ Genehmigen
                                    </button>
                                    <button
                                        onClick={() => openDecisionModal('reject')}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                    >
                                        ❌ Ablehnen
                                    </button>
                                </div>
                            )}

                            {/* Company Information */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-3">🏢 Unternehmen</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Steuernummer:</span>
                                            <span className="font-medium">{selectedApp.tax_id}</span>
                                        </div>
                                        {selectedApp.registration_number && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">HRB:</span>
                                                <span>{selectedApp.registration_number}</span>
                                            </div>
                                        )}
                                        {selectedApp.industry && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Branche:</span>
                                                <span>{selectedApp.industry}</span>
                                            </div>
                                        )}
                                        {selectedApp.company_address && (
                                            <div className="mt-2 pt-2 border-t">
                                                <span className="text-gray-500">Adresse:</span>
                                                <div className="mt-1">
                                                    {selectedApp.company_address.street}<br />
                                                    {selectedApp.company_address.zip} {selectedApp.company_address.city}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-3">📊 Finanzen</h3>
                                    <div className="space-y-2 text-sm">
                                        {selectedApp.annual_revenue && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Jahresumsatz:</span>
                                                <span className="font-medium">€{selectedApp.annual_revenue.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {selectedApp.years_in_business && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Jahre am Markt:</span>
                                                <span>{selectedApp.years_in_business}</span>
                                            </div>
                                        )}
                                        {selectedApp.number_of_employees && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Mitarbeiter:</span>
                                                <span>{selectedApp.number_of_employees}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bank & Contact */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-3">🏦 Bank</h3>
                                    <div className="space-y-2 text-sm">
                                        {selectedApp.bank_name && (
                                            <div>{selectedApp.bank_name}</div>
                                        )}
                                        {selectedApp.bank_account_iban && (
                                            <div className="font-mono text-xs">{selectedApp.bank_account_iban}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-3">👤 Ansprechpartner</h3>
                                    <div className="space-y-1 text-sm">
                                        {selectedApp.credit_contact_name && (
                                            <div className="font-medium">{selectedApp.credit_contact_name}</div>
                                        )}
                                        {selectedApp.credit_contact_email && (
                                            <div className="text-blue-600">{selectedApp.credit_contact_email}</div>
                                        )}
                                        {selectedApp.credit_contact_phone && (
                                            <div>{selectedApp.credit_contact_phone}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Trade References */}
                            {selectedApp.trade_references?.length > 0 && (
                                <div className="p-4 bg-blue-50 rounded-xl mb-6">
                                    <h3 className="font-semibold text-blue-800 mb-3">📇 Handelsreferenzen</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedApp.trade_references.map((ref, idx) => (
                                            <div key={idx} className="p-3 bg-white rounded-lg text-sm">
                                                <div className="font-medium">{ref.company}</div>
                                                <div className="text-gray-500">{ref.contact}</div>
                                                <div className="text-gray-400 text-xs mt-1">
                                                    {ref.phone} • {ref.email}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Decision Info */}
                            {selectedApp.status === 'approved' && (
                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <h3 className="font-semibold text-green-800 mb-2">✅ Genehmigt</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-green-600">Genehmigter Betrag:</span>
                                            <span className="font-bold text-green-800 ml-2">
                                                €{selectedApp.approved_amount?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-green-600">Zahlungsziel:</span>
                                            <span className="font-bold text-green-800 ml-2">
                                                {selectedApp.approved_payment_days} Tage
                                            </span>
                                        </div>
                                    </div>
                                    {selectedApp.decision_notes && (
                                        <div className="mt-2 text-sm text-green-700">{selectedApp.decision_notes}</div>
                                    )}
                                    <div className="mt-2 text-xs text-green-600">
                                        Entschieden am {format(new Date(selectedApp.decision_at!), 'dd.MM.yyyy HH:mm')}
                                    </div>
                                </div>
                            )}

                            {selectedApp.status === 'rejected' && (
                                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                    <h3 className="font-semibold text-red-800 mb-2">❌ Abgelehnt</h3>
                                    {selectedApp.decision_notes && (
                                        <div className="text-sm text-red-700">{selectedApp.decision_notes}</div>
                                    )}
                                    <div className="mt-2 text-xs text-red-600">
                                        Entschieden am {format(new Date(selectedApp.decision_at!), 'dd.MM.yyyy HH:mm')}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-32">
                            <div className="text-6xl mb-6 opacity-20">👈</div>
                            <h3 className="text-xl font-medium text-gray-600 mb-2">Antrag auswählen</h3>
                            <p>Klicken Sie auf einen Antrag, um Details anzuzeigen</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Decision Modal */}
            {showDecisionModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {decisionType === 'approve' ? '✅ Kredit genehmigen' : '❌ Kredit ablehnen'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500">Antrag von</div>
                                <div className="font-bold text-lg">{selectedApp.company_name}</div>
                                <div className="text-gray-600">
                                    Beantragt: €{selectedApp.requested_amount.toLocaleString()} / {selectedApp.requested_payment_days} Tage
                                </div>
                            </div>

                            {decisionType === 'approve' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Genehmigter Betrag (€)
                                        </label>
                                        <input
                                            type="number"
                                            value={approvedAmount}
                                            onChange={e => setApprovedAmount(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Zahlungsziel (Tage)
                                        </label>
                                        <select
                                            value={approvedDays}
                                            onChange={e => setApprovedDays(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="14">14 Tage</option>
                                            <option value="30">30 Tage</option>
                                            <option value="45">45 Tage</option>
                                            <option value="60">60 Tage</option>
                                            <option value="90">90 Tage</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {decisionType === 'approve' ? 'Anmerkungen (optional)' : 'Ablehnungsgrund *'}
                                </label>
                                <textarea
                                    value={decisionNotes}
                                    onChange={e => setDecisionNotes(e.target.value)}
                                    rows={3}
                                    placeholder={decisionType === 'approve' ? 'Optionale Anmerkungen...' : 'Bitte geben Sie einen Grund an...'}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t flex gap-3">
                            <button
                                onClick={() => setShowDecisionModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleDecision}
                                disabled={submitting}
                                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${decisionType === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {submitting ? 'Wird gespeichert...' : decisionType === 'approve' ? 'Genehmigen' : 'Ablehnen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BCreditAdminPage;
