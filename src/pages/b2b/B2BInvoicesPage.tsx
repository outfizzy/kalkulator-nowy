/**
 * B2B Invoices Page
 * Partner page for viewing invoices and payment status
 */

import React, { useState, useEffect } from 'react';
import { B2BService, B2BInvoice } from '../../services/database/b2b.service';
import { formatCurrency } from '../../utils/translations';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { pl, de } from 'date-fns/locale';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'unpaid' | 'paid' | 'overdue';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    unpaid: { label: 'Oczekuje na płatność', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: '⏳' },
    paid: { label: 'Opłacona', color: 'bg-green-100 text-green-800 border-green-300', icon: '✅' },
    overdue: { label: 'Po terminie', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' }
};

const TYPE_LABELS: Record<string, string> = {
    prepayment: 'Zaliczka',
    final: 'Końcowa',
    correction: 'Korekta'
};

export function B2BInvoicesPage() {
    const [invoices, setInvoices] = useState<B2BInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoice | null>(null);

    useEffect(() => {
        loadInvoices();
    }, []);

    async function loadInvoices() {
        setLoading(true);
        try {
            const partner = await B2BService.getCurrentPartner();
            if (partner) {
                const data = await B2BService.getInvoices(partner.id);
                setInvoices(data);
            }
        } catch (err) {
            console.error('Error loading invoices:', err);
            toast.error('Błąd ładowania faktur');
        }
        setLoading(false);
    }

    function getInvoiceStatus(invoice: B2BInvoice): 'unpaid' | 'paid' | 'overdue' {
        if (invoice.paid_at) return 'paid';
        if (invoice.due_date && isPast(parseISO(invoice.due_date))) return 'overdue';
        return 'unpaid';
    }

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        const status = getInvoiceStatus(inv);
        if (filter === 'all') return true;
        return status === filter;
    });

    // Calculate totals
    const unpaidTotal = invoices
        .filter(inv => !inv.paid_at)
        .reduce((sum, inv) => sum + inv.amount, 0);

    const overdueCount = invoices
        .filter(inv => getInvoiceStatus(inv) === 'overdue')
        .length;

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    📄 Faktury
                </h1>
                <p className="text-gray-500 mt-1">Przegląd faktur i statusów płatności</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Wszystkich faktur</p>
                            <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">📄</div>
                    </div>
                </div>
                <div className={`rounded-xl p-5 border shadow-sm ${unpaidTotal > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Do zapłaty</p>
                            <p className={`text-3xl font-bold ${unpaidTotal > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                                {formatCurrency(unpaidTotal)}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${unpaidTotal > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            ⏳
                        </div>
                    </div>
                </div>
                <div className={`rounded-xl p-5 border shadow-sm ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Po terminie</p>
                            <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                                {overdueCount}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${overdueCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                            {overdueCount > 0 ? '🔴' : '✅'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border shadow-sm mb-6 flex gap-2 flex-wrap">
                {(['all', 'unpaid', 'paid', 'overdue'] as FilterType[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' && 'Wszystkie'}
                        {f === 'unpaid' && '⏳ Oczekujące'}
                        {f === 'paid' && '✅ Opłacone'}
                        {f === 'overdue' && '🔴 Po terminie'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p>Ładowanie faktur...</p>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Brak faktur</h3>
                    <p className="text-sm">Nie znaleziono faktur spełniających kryteria</p>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Invoice List */}
                    <div className="col-span-12 lg:col-span-7 space-y-3">
                        {filteredInvoices.map(invoice => {
                            const status = getInvoiceStatus(invoice);
                            const statusConfig = STATUS_CONFIG[status];

                            return (
                                <div
                                    key={invoice.id}
                                    onClick={() => setSelectedInvoice(invoice)}
                                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedInvoice?.id === invoice.id ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${status === 'paid' ? 'bg-green-100' :
                                                    status === 'overdue' ? 'bg-red-100' : 'bg-amber-100'
                                                }`}>
                                                {statusConfig.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {invoice.invoice_number || `FV-${invoice.id.slice(0, 8).toUpperCase()}`}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {TYPE_LABELS[invoice.type] || invoice.type} • {format(parseISO(invoice.created_at), 'dd.MM.yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-gray-900">
                                                {formatCurrency(invoice.amount)}
                                            </p>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${statusConfig.color}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Due date info */}
                                    {!invoice.paid_at && invoice.due_date && (
                                        <div className={`mt-3 text-sm ${status === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                                            Termin płatności: <strong>{format(parseISO(invoice.due_date), 'dd.MM.yyyy')}</strong>
                                            {status === 'overdue' && ' (po terminie!)'}
                                        </div>
                                    )}

                                    {invoice.paid_at && (
                                        <div className="mt-3 text-sm text-green-600">
                                            Opłacono: <strong>{format(parseISO(invoice.paid_at), 'dd.MM.yyyy')}</strong>
                                            {invoice.payment_reference && ` • Ref: ${invoice.payment_reference}`}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Detail Panel */}
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-white rounded-xl border shadow-sm p-6 sticky top-24">
                            {selectedInvoice ? (
                                <>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        📄 {selectedInvoice.invoice_number || `FV-${selectedInvoice.id.slice(0, 8).toUpperCase()}`}
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Amount */}
                                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                                            <p className="text-sm text-gray-500">Kwota do zapłaty</p>
                                            <p className="text-3xl font-black text-gray-900">
                                                {formatCurrency(selectedInvoice.amount)}
                                            </p>
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-gray-500">Typ faktury</span>
                                                <span className="font-medium">{TYPE_LABELS[selectedInvoice.type]}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-gray-500">Data wystawienia</span>
                                                <span className="font-medium">{format(parseISO(selectedInvoice.created_at), 'dd.MM.yyyy')}</span>
                                            </div>
                                            {selectedInvoice.due_date && (
                                                <div className="flex justify-between py-2 border-b">
                                                    <span className="text-gray-500">Termin płatności</span>
                                                    <span className="font-medium">{format(parseISO(selectedInvoice.due_date), 'dd.MM.yyyy')}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-gray-500">Status</span>
                                                <span className={`font-medium ${selectedInvoice.paid_at ? 'text-green-600' :
                                                        (selectedInvoice.due_date && isPast(parseISO(selectedInvoice.due_date))) ? 'text-red-600' : 'text-amber-600'
                                                    }`}>
                                                    {selectedInvoice.paid_at ? '✅ Opłacona' :
                                                        (selectedInvoice.due_date && isPast(parseISO(selectedInvoice.due_date))) ? '🔴 Po terminie' : '⏳ Oczekuje'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bank Details (for unpaid) */}
                                        {!selectedInvoice.paid_at && (
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                <h4 className="font-bold text-blue-800 mb-2">Dane do przelewu</h4>
                                                <div className="space-y-1 text-sm text-blue-700">
                                                    <p><strong>Bank:</strong> Deutsche Bank</p>
                                                    <p><strong>IBAN:</strong> DE89 3704 0044 0532 0130 00</p>
                                                    <p><strong>BIC:</strong> COBADEFFXXX</p>
                                                    <p className="mt-2"><strong>Tytuł:</strong> {selectedInvoice.invoice_number || selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* PDF Download */}
                                        {selectedInvoice.pdf_url && (
                                            <a
                                                href={selectedInvoice.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full text-center py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                            >
                                                📥 Pobierz PDF
                                            </a>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <div className="text-4xl mb-4 opacity-30">👆</div>
                                    <p className="font-medium text-gray-600">Wybierz fakturę</p>
                                    <p className="text-sm">Kliknij w pozycję aby zobaczyć szczegóły</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default B2BInvoicesPage;
