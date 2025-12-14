import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../../services/database';
import type { Note } from '../../../types';

interface CustomerNotesWidgetProps {
    customerId: string;
}

export const CustomerNotesWidget: React.FC<CustomerNotesWidgetProps> = ({ customerId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newNote, setNewNote] = useState('');

    const loadNotes = React.useCallback(async () => {
        try {
            const data = await DatabaseService.getNotes('customer', customerId);
            setNotes(data);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            await DatabaseService.createNote({
                entityType: 'customer',
                entityId: customerId,
                content: newNote.trim()
            });
            setNewNote('');
            setIsAdding(false);
            loadNotes();
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    if (loading) return <div className="h-40 bg-slate-50 animate-pulse rounded-xl"></div>;

    return (
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-100 p-6 relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24 text-amber-900" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>

            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Ważne Notatki
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded font-medium transition-colors"
                >
                    {isAdding ? 'Anuluj' : '+ Dodaj'}
                </button>
            </div>

            <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {isAdding && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-amber-200 mb-3">
                        <textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            placeholder="Wpisz np. Kod do domofonu..."
                            className="w-full text-sm border-none focus:ring-0 resize-none bg-transparent placeholder-slate-400"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handleAddNote}
                                className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-md hover:bg-amber-600"
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                )}

                {notes.length === 0 && !isAdding ? (
                    <div className="text-center py-6 text-amber-800/50 text-sm italic">
                        Brak przypiętych notatek dla tego klienta.
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="bg-white/80 p-3 rounded-lg border border-amber-200/50 shadow-sm">
                            <div className="text-sm text-amber-900 whitespace-pre-wrap">{note.content}</div>
                            <div className="mt-2 flex justify-between items-center text-[10px] text-amber-700/60">
                                <span>{note.user?.firstName} • {note.createdAt.toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
