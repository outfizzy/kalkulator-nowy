import React, { useState } from 'react';
import { MeasurementCalculator } from '../components/measurements/MeasurementCalculator';
import toast from 'react-hot-toast';

export const DachrechnerPage: React.FC = () => {

    // Standalone mode - just for testing/playground
    // We could add save functionality here if we wanted to save "unassigned" measurements,
    // but the schema requires customer_id, so let's keep it read-only/playground or mock save.

    const handleMockSave = async (data: any) => {
        console.log('Saved data:', data);
        toast.success('To jest tryb demo. Aby zapisać, wejdź przez Kartę Klienta.');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Dachrechner
                            </h1>
                            <p className="text-slate-500 mt-1">Kalkulator wymiarów konstrukcji dachowych (Tryb Demo)</p>
                        </div>
                    </div>
                </div>

                <MeasurementCalculator onSave={handleMockSave} />
            </div>
        </div>
    );
};

export default DachrechnerPage;
