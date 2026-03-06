import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { InstallationService } from '../../services/database/installation.service';
import type { Installation } from '../../types';

interface CompletionReportModalProps {
    installation: Installation;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

interface FollowUpItem {
    name: string;
    description: string;
}

export const CompletionReportModal: React.FC<CompletionReportModalProps> = ({
    installation,
    isOpen,
    onClose,
    onSaved
}) => {
    const [notes, setNotes] = useState('');
    const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const addFollowUpItem = () => {
        if (!newItemName.trim()) {
            toast.error('Wpisz nazwę pozycji');
            return;
        }
        setFollowUpItems(prev => [...prev, { name: newItemName.trim(), description: newItemDescription.trim() }]);
        setNewItemName('');
        setNewItemDescription('');
    };

    const removeFollowUpItem = (index: number) => {
        setFollowUpItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!notes.trim() && followUpItems.length === 0) {
            toast.error('Uzupełnij notatki z montażu');
            return;
        }

        setSaving(true);
        try {
            const result = await InstallationService.saveCompletionReport(installation.id, {
                notes: notes.trim(),
                followUpItems
            });

            if (result.followUpsCreated > 0) {
                toast.success(`✅ Raport zapisany! Utworzono ${result.followUpsCreated} dokończeń`);
            } else {
                toast.success('✅ Raport z montażu zapisany');
            }

            onSaved();
            onClose();
        } catch (error) {
            console.error('Error saving completion report:', error);
            toast.error('Błąd zapisu raportu');
        } finally {
            setSaving(false);
        }
    };

    const clientName = `${installation.client?.firstName || ''} ${installation.client?.lastName || ''}`.trim();

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                📋 Raport z montażu
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {clientName} {installation.contractNumber && `• ${installation.contractNumber}`}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Notatki z montażu
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 outline-none min-h-[100px] resize-none text-sm"
                            placeholder="Co zostało zamontowane, uwagi, obserwacje..."
                        />
                    </div>

                    {/* Follow-up Items */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Pozycje do dokończenia
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                            Dodaj pozycje, które wymagają powrotu na montaż. Dla każdej pozycji zostanie automatycznie utworzone dokończenie w kalendarzu.
                        </p>

                        {/* Existing items */}
                        {followUpItems.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {followUpItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg"
                                    >
                                        <span className="text-amber-500 mt-0.5">🔄</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-amber-900">{item.name}</div>
                                            {item.description && (
                                                <div className="text-xs text-amber-700 mt-0.5">{item.description}</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeFollowUpItem(index)}
                                            className="text-amber-400 hover:text-red-500 p-0.5 flex-shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add new item */}
                        <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-amber-400 outline-none mb-2 bg-white"
                                placeholder="Nazwa pozycji (np. ZIP screen, szyby przesuwne...)"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFollowUpItem(); } }}
                            />
                            <input
                                type="text"
                                value={newItemDescription}
                                onChange={e => setNewItemDescription(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-amber-400 outline-none mb-2 bg-white"
                                placeholder="Opis / uwagi (opcjonalne)"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFollowUpItem(); } }}
                            />
                            <button
                                onClick={addFollowUpItem}
                                className="w-full text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg py-1.5 transition-colors"
                            >
                                + Dodaj pozycję do dokończenia
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-xl">
                    <div className="text-xs text-slate-500">
                        {followUpItems.length > 0 && (
                            <span className="text-amber-600 font-medium">
                                🔄 {followUpItems.length} dokończeń do utworzenia
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                        >
                            {saving ? 'Zapisywanie...' : '✅ Zapisz raport'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
