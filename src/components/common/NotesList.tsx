import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { DatabaseService } from '../../services/database';
import { NotificationService } from '../../services/database/notification.service';
import type { Note } from '../../types';
import { MentionTextarea, parseMentions, renderMentionText } from './MentionTextarea';
import { useAuth } from '../../contexts/AuthContext';

export interface NoteItem {
    id: string;
    content: string;
    createdAt: Date;
    user?: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    };
    attachments?: { name: string; path: string }[];
    type: 'note' | 'client_message' | 'system';
}

interface NotesListProps {
    entityType: 'lead' | 'customer';
    entityId: string;
    extraItems?: NoteItem[];
}

export const NotesList: React.FC<NotesListProps> = ({ entityType, entityId, extraItems = [] }) => {
    const { currentUser } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadNotes();
    }, [entityId, entityType]);

    const loadNotes = async () => {
        try {
            const data = await DatabaseService.getNotes(entityType, entityId);
            setNotes(data);
        } catch (error) {
            console.error('Error loading notes:', error);
            toast.error('Błąd ładowania notatek');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddNote = async () => {
        if (!newNoteContent.trim() && attachments.length === 0) return;

        setIsSubmitting(true);
        try {
            // Upload attachments first
            const uploadedAttachments = [];
            for (const file of attachments) {
                const path = await DatabaseService.uploadFile(file, 'attachments', `${entityType}s/${entityId}`);
                uploadedAttachments.push({
                    name: file.name,
                    path: path,
                    type: file.type,
                    size: file.size
                });
            }

            await DatabaseService.createNote({
                entityType,
                entityId,
                content: newNoteContent,
                attachments: uploadedAttachments
            });

            // Parse @mentions and send notifications
            const mentions = parseMentions(newNoteContent);
            if (mentions.length > 0 && currentUser) {
                const senderName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Kolega';
                const link = entityType === 'lead' ? `/leads/${entityId}` : `/customers/${entityId}`;
                for (const mention of mentions) {
                    if (mention.userId !== currentUser.id) {
                        NotificationService.createNotification(
                            mention.userId,
                            'info',
                            `📌 ${senderName} hat Sie erwähnt`,
                            `${senderName} hat Sie in einer Notiz erwähnt.\n➜ Klicken Sie hier, um die Details zu sehen!`,
                            link,
                            { mentionedBy: currentUser.id, entityType, entityId }
                        ).catch(err => console.error('Failed to notify mention:', err));
                    }
                }
            }

            setNewNoteContent('');
            setAttachments([]);
            toast.success('Notatka dodana');
            loadNotes();
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Błąd dodawania notatki');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć tę notatkę?')) return;
        try {
            await DatabaseService.deleteNote(noteId);
            toast.success('Notatka usunięta');
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Błąd usuwania notatki');
        }
    };

    // Merge and sort items
    const allItems: NoteItem[] = [
        ...notes.map(n => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt,
            user: n.user,
            attachments: n.attachments,
            type: 'note' as const,
            userId: n.userId // Keep for delete check
        })),
        ...extraItems
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (loading) return <div className="p-4 text-center text-slate-400">Ładowanie notatek...</div>;

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <MentionTextarea
                    value={newNoteContent}
                    onChange={setNewNoteContent}
                    placeholder="Wpisz treść notatki... Użyj @ aby oznaczyć kolegę"
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:border-accent outline-none min-h-[80px]"
                />

                {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1 rounded-md text-xs">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-slate-500 hover:text-accent p-2 rounded-lg hover:bg-slate-200 transition-colors"
                            title="Dodaj załącznik"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            className="hidden"
                        />
                    </div>
                    <button
                        onClick={handleAddNote}
                        disabled={isSubmitting || (!newNoteContent.trim() && attachments.length === 0)}
                        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                        {isSubmitting ? 'Dodawanie...' : 'Dodaj notatkę'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {allItems.map(item => (
                    <div
                        key={`${item.type}-${item.id}`}
                        className={`p-4 rounded-xl border shadow-sm transition-shadow ${item.type === 'client_message'
                                ? 'bg-purple-50 border-purple-100'
                                : 'bg-white border-slate-100 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {item.user?.avatarUrl ? (
                                    <img src={item.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.type === 'client_message' ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        {item.type === 'client_message' ? 'K' : (item.user?.firstName?.[0] || 'U')}
                                    </div>
                                )}
                                <span className={`text-sm font-medium ${item.type === 'client_message' ? 'text-purple-900' : 'text-slate-700'
                                    }`}>
                                    {item.type === 'client_message' ? 'Wiadomość od Klienta' : (item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Użytkownik')}
                                </span>
                                <span className={`text-xs ${item.type === 'client_message' ? 'text-purple-400' : 'text-slate-400'
                                    }`}>
                                    {item.createdAt.toLocaleString()}
                                </span>
                            </div>
                            {item.type === 'note' && currentUser?.id === (item as any).userId && (
                                <button
                                    onClick={() => handleDeleteNote(item.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className={`text-sm whitespace-pre-wrap ml-8 ${item.type === 'client_message' ? 'text-purple-800' : 'text-slate-600'
                            }`}>
                            {renderMentionText(item.content)}
                        </div>

                        {item.attachments && item.attachments.length > 0 && (
                            <div className="mt-3 ml-8 flex flex-wrap gap-2">
                                {item.attachments.map((att, idx) => (
                                    <a
                                        key={idx}
                                        href={att.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <span className="truncate max-w-[200px]">{att.name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {allItems.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Brak notatek. Dodaj pierwszą!
                    </div>
                )}
            </div>
        </div>
    );
};
