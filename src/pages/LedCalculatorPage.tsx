import React from 'react';
import { LedCalculator } from '../components/led-calculator';

export const LedCalculatorPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="text-3xl">💡</span>
                        LED Rechner
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Konfigurieren Sie die LED-Beleuchtung für ALUXE Dachsysteme
                    </p>
                </div>
            </div>

            {/* Calculator */}
            <LedCalculator
                onSave={(data) => {
                    console.log('LED config saved:', data);
                    // TODO: integrate with offer system
                }}
            />
        </div>
    );
};

export default LedCalculatorPage;
