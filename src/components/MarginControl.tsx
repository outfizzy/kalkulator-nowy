import React from 'react';

interface MarginControlProps {
    value: number; // 0.30 to 0.60
    onChange: (value: number) => void;
    purchasePrice: number;
    sellingPrice: number;
}

export const MarginControl: React.FC<MarginControlProps> = ({ value, onChange, purchasePrice, sellingPrice }) => {
    const percentage = Math.round(value * 100);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Marża (Margin Control)</h3>
                <span className="text-2xl font-bold text-accent">{percentage}%</span>
            </div>

            <div className="mb-6">
                <input
                    type="range"
                    min="30"
                    max="60"
                    step="1"
                    value={percentage}
                    onChange={(e) => onChange(Number(e.target.value) / 100)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Min: 30%</span>
                    <span>Max: 60%</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Koszt zakupu (Netto)</p>
                    <p className="text-lg font-medium text-slate-700">
                        {Number(purchasePrice || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Cena sprzedaży (Netto)</p>
                    <p className="text-xl font-bold text-green-600">
                        {Number(sellingPrice || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                </div>
            </div>

            <div className="mt-4 text-xs text-center text-slate-400">
                Przesuń suwak, aby dostosować cenę końcową dla klienta.
            </div>
        </div>
    );
};
