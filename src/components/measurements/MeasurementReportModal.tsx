import React, { useState } from 'react';
import { DatabaseService } from '../../services/database';
import type { Measurement, MeasurementReport, Visit } from '../../types';
import { toast } from 'react-hot-toast';

interface MeasurementReportModalProps {
    date: Date;
    measurements: Measurement[];
    onClose: () => void;
    onSave: () => void;
    currentUserId: string;
}

export const MeasurementReportModal: React.FC<MeasurementReportModalProps> = ({
    date,
    measurements,
    onClose,
    onSave,
    currentUserId
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        carPlate: '',
        odometerStart: 0,
        odometerEnd: 0,
        withDriver: false,
        carIssues: '',
        reportDescription: ''
    });

    // Initialize/Auto-calculate total km
    const totalKm = Math.max(0, formData.odometerEnd - formData.odometerStart);

    // Prepare visits snapshot from measurements
    const visitsPreview: Visit[] = measurements.map(m => ({
        id: m.id,
        offerId: m.offerId,
        customerName: m.customerName,
        address: m.customerAddress,
        productSummary: 'N/A', // Could fetch if needed, relying on snapshot
        price: 0,
        outcome: m.status === 'completed' ? 'measured' : 'pending',
        notes: m.notes || ''
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.odometerEnd < formData.odometerStart) {
            toast.error('Licznik końcowy nie może być mniejszy od początkowego');
            return;
        }

        setLoading(true);
        try {
            const report: Omit<MeasurementReport, 'id' | 'createdAt'> = {
                date: date.toISOString().split('T')[0],
                salesRepId: currentUserId,
                carPlate: formData.carPlate,
                odometerStart: formData.odometerStart,
                odometerEnd: formData.odometerEnd,
                totalKm,
                withDriver: formData.withDriver,
                carIssues: formData.carIssues,
                reportDescription: formData.reportDescription,
                visits: visitsPreview,
                signedContractsCount: 0, // Calculated on server or explicit input
                offerIds: measurements.map(m => m.offerId).filter(Boolean) as string[]
            };

            await DatabaseService.createMeasurementReport(report);
            toast.success('Raport został utworzony');
            onSave();
            onClose();
        } catch (error) {
            console.error('Error creating report:', error);
            toast.error('Nie udało się zapisać raportu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">
                        Raport dzienny: {date.toLocaleDateString('pl-PL')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Visits Summary */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Klienci w raporcie ({visitsPreview.length})</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {visitsPreview.length > 0 ? visitsPreview.map((visit, idx) => (
                                <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-sm flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-slate-800">{visit.customerName}</div>
                                        <div className="text-xs text-slate-500">{visit.address}</div>
                                    </div>
                                    <div className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                        {visit.outcome === 'measured' ? 'Zmierzono' : 'Zaplanowano'}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400 italic">Brak pomiarów w tym dniu.</p>
                            )}
                        </div>
                    </div>

                    {/* Car Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nr Rejestracyjny</label>
                            <input
                                type="text"
                                required
                                value={formData.carPlate}
                                onChange={e => setFormData({ ...formData, carPlate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                                placeholder="np. DW 12345"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.withDriver}
                                    onChange={e => setFormData({ ...formData, withDriver: e.target.checked })}
                                    className="w-4 h-4 text-accent rounded border-slate-300 focus:ring-accent"
                                />
                                <span className="text-sm font-medium text-slate-700">Jazda z kierowcą</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Licznik Start (km)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.odometerStart}
                                onChange={e => setFormData({ ...formData, odometerStart: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Licznik Koniec (km)</label>
                            <input
                                type="number"
                                required
                                min={formData.odometerStart}
                                value={formData.odometerEnd}
                                onChange={e => setFormData({ ...formData, odometerEnd: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dystans (km)</label>
                            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium">
                                {totalKm} km
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Uwagi dot. auta / trasy</label>
                        <textarea
                            rows={3}
                            value={formData.carIssues}
                            onChange={e => setFormData({ ...formData, carIssues: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                            placeholder="Zgłoszone usterki, uwagi..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={loading || visitsPreview.length === 0}
                            className="px-6 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Zapisywanie...
                                </>
                            ) : (
                                'Utwórz Raport'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
