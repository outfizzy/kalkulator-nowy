import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { EmailFooterService, EmailFooter, CreateFooterDTO } from '../../services/database/email-footer.service';
import { supabase } from '../../lib/supabase';

interface FooterEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    footer?: EmailFooter;
    onSuccess: () => void;
}

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

export const FooterEditorModal: React.FC<FooterEditorModalProps> = ({ isOpen, onClose, footer, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    // User Assignment
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            if (footer) {
                setName(footer.name);
                setContent(footer.content);
                setIsActive(footer.is_active);
                loadAssignments(footer.id);
            } else {
                setName('');
                setContent('');
                setIsActive(true);
                setSelectedUserIds(new Set());
            }
        }
    }, [isOpen, footer]);

    const loadUsers = async () => {
        const { data } = await supabase.from('profiles').select('*').order('firstName');
        if (data) setUsers(data as any);
    };

    const loadAssignments = async (footerId: string) => {
        try {
            const ids = await EmailFooterService.getAssignmentsForFooter(footerId);
            setSelectedUserIds(new Set(ids));
        } catch (e) {
            console.error('Error loading assignments', e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !content) {
            toast.error('Wypełnij nazwę i treść.');
            return;
        }

        setLoading(true);
        try {
            const footerData: CreateFooterDTO = {
                name,
                content,
                is_active: isActive
            };

            let savedFooterId = footer?.id;

            if (footer) {
                await EmailFooterService.updateFooter(footer.id, footerData);
                toast.success('Stopka zaktualizowana');
            } else {
                const newFooter = await EmailFooterService.createFooter(footerData);
                savedFooterId = newFooter.id;
                toast.success('Stopka utworzona');
            }

            if (savedFooterId) {
                await EmailFooterService.updateAssignments(savedFooterId, Array.from(selectedUserIds));
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Błąd zapisu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-lg text-slate-800">
                        {footer ? 'Edytuj Stopkę' : 'Nowa Stopka'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Form */}
                    <form className="flex-1 p-6 overflow-y-auto space-y-4" onSubmit={handleSave}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Stopki</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                                placeholder="np. Stopka Sprzedażowa 2026"
                            />
                        </div>

                        {/* Editor / Preview Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab('edit')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Edytor (Kod HTML)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Podgląd
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col h-[400px]">
                            {activeTab === 'edit' ? (
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="flex-1 w-full border border-slate-200 rounded-lg p-4 outline-none focus:border-accent resize-none font-mono text-sm leading-relaxed"
                                    placeholder="<div>Pozdrawiamy,<br>Zespół Polendach</div>"
                                />
                            ) : (
                                <div className="flex-1 border border-slate-200 rounded-lg p-6 overflow-y-auto prose max-w-none bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: content }} />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActiveFooter"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="w-4 h-4 text-accent rounded border-slate-300 focus:ring-accent"
                            />
                            <label htmlFor="isActiveFooter" className="text-sm text-slate-700">Stopka aktywna</label>
                        </div>
                    </form>

                    {/* User Assignment Sidebar */}
                    <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto">
                        <h4 className="font-bold text-sm text-slate-700 mb-2">Przypisz do użytkowników</h4>
                        <p className="text-xs text-slate-500 mb-4">Użytkownicy, którzy będą mieli tę stopkę ustawioną jako domyślną (lub dostępną).</p>

                        <div className="space-y-2">
                            {users.map(user => (
                                <label key={user.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-accent/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.has(user.id)}
                                        onChange={() => toggleUser(user.id)}
                                        className="w-4 h-4 text-accent rounded border-slate-300 focus:ring-accent"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">{user.firstName} {user.lastName}</div>
                                        <div className="text-[10px] text-slate-500">{user.role}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors font-medium shadow-sm"
                    >
                        {loading ? 'Zapisywanie...' : 'Zapisz Stopkę'}
                    </button>
                </div>
            </div>
        </div>
    );
};
