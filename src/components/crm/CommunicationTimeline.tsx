import React, { useState } from 'react';
import type { Communication } from '../../types';
import { DatabaseService } from '../../services/database';
import { toast } from 'react-hot-toast';

interface CommunicationTimelineProps {
    communications: Communication[];
    customerId: string;
    leadId?: string;
    onAdd: () => void;
}

export const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({ communications, customerId, leadId, onAdd }) => {
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteType, setNoteType] = useState<'note' | 'call'>('note');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSaveNote = async () => {
        if (!noteContent.trim() && selectedFiles.length === 0) return;
        setUploading(true);

        try {
            // Upload files first
            const attachments: string[] = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    try {
                        const url = await DatabaseService.uploadFile(file, 'attachments');
                        attachments.push(url);
                    } catch (e) {
                        console.error('File upload failed', e);
                        toast.error(`Błąd przesyłania pliku: ${file.name}`);
                    }
                }
            }

            await DatabaseService.addCommunication({
                customerId: customerId,
                leadId: leadId || undefined,
                type: noteType,
                direction: 'outbound',
                content: noteContent,
                subject: noteType === 'call' ? 'Notatka z rozmowy' : 'Notatka',
                date: new Date().toISOString(),
                metadata: {
                    attachments: attachments
                }
            });

            toast.success('Dodano notatkę');
            setNoteContent('');
            setSelectedFiles([]);
            setIsAddingNote(false);
            onAdd();
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Błąd dodawania notatki');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getIcon = (type: Communication['type'], direction: Communication['direction'], metadata?: any) => {
        // Special icon for AI Reports
        if (metadata?.isSystemNote) {
            return <span className="text-xl">🤖</span>; // Or a specific SVG if preferred
        }

        switch (type) {
            case 'email':
                // Check if it's a client activity (view/message)
                if (direction === 'inbound' && type === 'email') {
                    return (
                        <div className="bg-blue-100 p-1 rounded-full">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                    );
                }
                return direction === 'inbound' ? (
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                ) : (
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                );
            case 'call':
                return <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
            case 'sms':
                return <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
            case 'note':
            default:
                return <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header Actions */}
            <div className="flex gap-2 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <button
                    onClick={() => { setIsAddingNote(true); setNoteType('note'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Notatka
                </button>
                <button
                    onClick={() => { setIsAddingNote(true); setNoteType('call'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Telefon
                </button>
            </div>

            {/* Note Input */}
            {isAddingNote && (
                <div className="mb-6 bg-white p-4 rounded-xl shadow-md border border-accent animate-in fade-in slide-in-from-top-4">
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder={noteType === 'call' ? "Opisz przebieg rozmowy..." : "Treść notatki..."}
                        className="w-full p-3 border rounded-lg mb-3 h-24 focus:ring-2 focus:ring-accent focus:border-accent"
                        autoFocus
                    />
                    <div className="mb-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-700">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Dodaj pliki
                        </button>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsAddingNote(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            disabled={uploading}
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleSaveNote}
                            disabled={uploading}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium flex items-center gap-2"
                        >
                            {uploading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".3" /><path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10Z" /></svg>}
                            Zapisz
                        </button>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="space-y-6 pl-4 border-l-2 border-slate-200 ml-4 pb-8">
                {communications.length === 0 ? (
                    <div className="text-slate-400 text-sm italic pl-4">Brak historii komunikacji</div>
                ) : (
                    communications.map((comm) => (
                        <div key={comm.id} className="relative pl-6 group">
                            {/* Dot */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-accent transition-colors"></div>

                            {/* Content */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {getIcon(comm.type, comm.direction, comm.metadata)}
                                        <span className="font-bold text-slate-700">
                                            {comm.subject || (comm.type === 'call' ? 'Rozmowa telefoniczna' : 'Notatka')}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${comm.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {comm.direction === 'inbound' ? 'Przychodzące' : 'Wychodzące'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(comm.date).toLocaleString()}
                                    </span>
                                </div>

                                <div className="text-slate-600 text-sm whitespace-pre-wrap">
                                    {comm.content}
                                </div>

                                {comm.metadata?.recordingUrl && (
                                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="text-xs font-semibold text-slate-500 mb-1 uppercase flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            </svg>
                                            Nagranie rozmowy
                                        </div>
                                        <audio controls src={comm.metadata.recordingUrl} className="w-full h-8" />
                                    </div>
                                )}

                                {/* User / Sender Name */}
                                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                    {(comm.user || comm.userId === 'client' || comm.userId === 'system') ? (
                                        <>
                                            {comm.userId === 'client' ? (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                    </svg>
                                                    <span className="font-semibold text-slate-600">Klient (przez stronę oferty)</span>
                                                </>
                                            ) : comm.userId === 'system' ? (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-semibold text-slate-600">System (Automatyczne)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {comm.user?.firstName} {comm.user?.lastName}
                                                </>
                                            )}
                                        </>
                                    ) : null}
                                </div>

                                {comm.metadata?.attachments && Array.isArray(comm.metadata.attachments) && comm.metadata.attachments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Załączniki:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {comm.metadata.attachments.map((url: string, index: number) => {
                                                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
                                                const fileName = url.split('/').pop()?.split('?')[0] || 'Plik';

                                                return (
                                                    <a
                                                        key={index}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 hover:bg-slate-100 transition-colors max-w-full"
                                                    >
                                                        {isImage ? (
                                                            <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden flex-shrink-0">
                                                                <img src={url} alt="attachment" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                            </div>
                                                        )}
                                                        <div className="overflow-hidden">
                                                            <div className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{fileName}</div>
                                                            <div className="text-xs text-slate-400">Kliknij aby otworzyć</div>
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    ))
                )}
            </div>
        </div >
    );
};
