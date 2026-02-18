import React from 'react';
import { type LedResults, formatPrice } from '../../services/led-calculator.service';

interface LedPartsTableProps {
    results: LedResults;
}

export const LedPartsTable: React.FC<LedPartsTableProps> = ({ results }) => {
    const { products, totalNet, totalVat, totalGross, endCustomerNet, endCustomerVat, endCustomerGross } = results;

    if (products.length === 0) {
        return (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                <span className="text-4xl mb-3 block">📋</span>
                <p className="text-slate-500 text-sm">
                    Keine Produkte konfiguriert. Bitte wählen Sie mindestens eine LED-Option.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    Stückliste / Listenpreise ALUXE
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-left">
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Pos.</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">AXE</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Art.-Nr.</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Beschreibung</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Menge</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">VK/Stück</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product, i) => (
                            <tr
                                key={`${product.pos}-${i}`}
                                className={`border-t border-slate-50 hover:bg-amber-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                            >
                                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{product.pos}</td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.axe}</td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.articleNr || '—'}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{product.nameDE}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold text-sm">
                                        {product.quantity}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-slate-600">{formatPrice(product.unitPrice)}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800">{formatPrice(product.totalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="grid grid-cols-2 divide-x divide-slate-200">
                    {/* EK Prices */}
                    <div className="p-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Einkaufspreise</div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Netto</span>
                                <span className="font-semibold text-slate-700">{formatPrice(totalNet)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">MwSt. (19%)</span>
                                <span className="text-slate-600">{formatPrice(totalVat)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
                                <span className="text-slate-700">Brutto</span>
                                <span className="text-slate-900">{formatPrice(totalGross)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Endkunde Prices */}
                    <div className="p-4 bg-amber-50/50">
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Endkundenpreise</div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700/70">Netto</span>
                                <span className="font-semibold text-amber-800">{formatPrice(endCustomerNet)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700/70">MwSt. (19%)</span>
                                <span className="text-amber-700">{formatPrice(endCustomerVat)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-1 border-t border-amber-200">
                                <span className="text-amber-800">Brutto</span>
                                <span className="text-amber-900 text-lg">{formatPrice(endCustomerGross)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
