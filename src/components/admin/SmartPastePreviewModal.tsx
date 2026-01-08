import React from 'react';

interface SmartPastePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (finalRows: number[][]) => void;
    parsedRows: number[][];
    // Context for visualization
    startColIndex: number;
    startRowIndex: number;
    targetWidths: number[];
    targetProjections: number[];
    isLoading: boolean;
    originalText: string;
    // Product Selection
    products?: any[];
    selectedProductId?: string;
    onProductChange?: (id: string) => void;
    targetFieldName?: string; // e.g. "Cena Szkła"
}

export const SmartPastePreviewModal: React.FC<SmartPastePreviewModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    parsedRows,
    startColIndex,
    startRowIndex,
    targetWidths,
    targetProjections,
    isLoading,
    originalText,
    products = [],
    selectedProductId,
    onProductChange
}) => {
    // Local state for editing
    const [editableRows, setEditableRows] = React.useState<number[][]>([]);

    React.useEffect(() => {
        setEditableRows(parsedRows);
    }, [parsedRows]);

    const handleCellChange = (rIdx: number, cIdx: number, value: string) => {
        const newVal = parseFloat(value.replace(',', '.'));
        const newRows = [...editableRows];
        newRows[rIdx] = [...newRows[rIdx]];
        newRows[rIdx][cIdx] = isNaN(newVal) ? 0 : newVal;
        setEditableRows(newRows);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            📋 Inteligentne Wklejanie (Smart Paste AI)
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    {/* Product Selector Context */}
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center gap-4">
                        <div className="text-sm text-blue-800 font-medium whitespace-nowrap">
                            Do jakiego modelu wklejasz ceny?
                        </div>
                        <select
                            value={selectedProductId || ''}
                            onChange={(e) => onProductChange && onProductChange(e.target.value)}
                            className={`flex-1 p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm
                                ${!selectedProductId ? 'border-red-300 bg-red-50 text-red-700 animate-pulse' : 'border-slate-300 bg-white text-slate-700'}`}
                        >
                            <option value="">-- WYBIERZ MODEL ZADASZENIA (WYMAGANE) --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} {p.code ? `[${p.code}]` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div className="text-xs text-slate-500 flex justify-between">
                        <span>Wklejanie od: <span className="font-bold text-slate-700">{targetWidths[startColIndex]}mm x {targetProjections[startRowIndex]}mm</span></span>
                        {!selectedProductId && <span className="text-red-500 font-bold">⚠️ Musisz wybrać model, aby potwierdzić.</span>}
                    </div>
                </div>

                <div className="p-6 overflow-auto flex-1 flex gap-6">
                    {/* Left: Original Text */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <label className="text-xs font-bold text-slate-500 uppercase">1. Skopiowany Tekst</label>
                        <div className="bg-slate-100 p-3 rounded border border-slate-200 font-mono text-xs whitespace-pre-wrap overflow-auto flex-1 text-slate-600 max-h-[400px]">
                            {originalText}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center text-slate-300 text-2xl">
                        ➔
                    </div>

                    {/* Right: Parsed Data with Mapping */}
                    <div className="flex-[2] flex flex-col gap-2 min-h-0">
                        <label className="text-xs font-bold text-blue-600 uppercase flex justify-between">
                            <span>2. Dopasowanie do Tabeli (Wymiary)</span>
                            <span className="text-[10px] font-normal text-slate-400">Możesz edytować wartości w tabeli</span>
                        </label>
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center border border-dashed border-blue-200 bg-blue-50 rounded text-blue-500 font-medium animate-pulse">
                                ✨ Analizowanie i Dopasowywanie...
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded overflow-auto flex-1 max-h-[400px] shadow-inner relative">
                                <table className="w-full text-center text-sm border-collapse">
                                    <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-2 border-b border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-mono">Wys \ Szer</th>
                                            {editableRows.length > 0 && editableRows[0].map((_, cIdx) => {
                                                const targetW = targetWidths[startColIndex + cIdx];
                                                return (
                                                    <th key={cIdx} className={`p-2 border-b border-r border-slate-200 font-bold ${targetW ? 'text-slate-700' : 'text-red-400 bg-red-50'}`}>
                                                        {targetW ? `${targetW}mm` : 'POZA ZAKRESEM'}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {editableRows.map((row, rIdx) => {
                                            const targetP = targetProjections[startRowIndex + rIdx];
                                            return (
                                                <tr key={rIdx} className="hover:bg-blue-50">
                                                    <td className={`p-2 border-r border-slate-200 font-bold ${targetP ? 'text-slate-700 bg-slate-50' : 'text-red-400 bg-red-50'}`}>
                                                        {targetP ? `${targetP}mm` : '---'}
                                                    </td>
                                                    {row.map((cell, cIdx) => (
                                                        <td key={cIdx} className="p-0 border-r border-slate-100 last:border-0 font-medium text-blue-700 relative">
                                                            <input
                                                                type="text" // Text to allow empty/typing
                                                                defaultValue={cell}
                                                                onBlur={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                                className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none hover:bg-white/50 transition-all font-mono text-sm"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {editableRows.length === 0 && (
                                    <div className="p-4 text-center text-red-500 text-sm">Nie udało się rozpoznać liczb.</div>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400">
                            Nagłówki kolumn i wierszy pokazują, gdzie trafią dane w Twoim cenniku. <br />
                            <span className="text-red-400 font-bold">Czerwone nagłówki</span> oznaczają dane, które nie zmieszczą się w obecnej tabeli.
                        </p>
                    </div>
                </div>


                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3 left-0 right-0 z-20">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium"
                    >
                        Anuluj
                    </button>
                    <div className="relative group">
                        <button
                            onClick={() => onConfirm(editableRows)}
                            // Disable if Loading OR No Rows OR No Product Selected
                            disabled={isLoading || editableRows.length === 0 || !selectedProductId}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                        >
                            {isLoading ? 'Przetwarzanie...' : '✅ Zatwierdź i Wklej'}
                        </button>
                        {/* Tooltip for disabled button */}
                        {!selectedProductId && !isLoading && (
                            <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Wybierz model zadaszenia żeby kontynuować
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
