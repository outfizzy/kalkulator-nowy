import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { EmailTemplateService, type CreateTemplateInput, type EmailTemplate } from '../../services/database/email-template.service';

interface TemplateEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: EmailTemplate; // If present, Edit Mode
    onSuccess: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ isOpen, onClose, template, onSuccess }) => {
    console.log('TemplateEditorModal rendering. isOpen:', isOpen);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState('general');
    const [isActive, setIsActive] = useState(true);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Reset or Load
    useEffect(() => {
        if (isOpen) {
            if (template) {
                setName(template.name);
                setSubject(template.subject);
                setBody(template.body);
                setCategory(template.category);
                setIsActive(template.is_active);
            } else {
                setName('');
                setSubject('');
                setBody('');
                setCategory('general');
                setIsActive(true);
            }
        }
    }, [isOpen, template]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !subject || !body) {
            toast.error('Wypełnij nazwę, temat i treść.');
            return;
        }

        setLoading(true);
        try {
            const templateData: CreateTemplateInput = {
                name,
                subject,
                body,
                category,
                is_active: isActive,
                variables: [], // TODO: Auto-detect variables?
            };

            if (template) {
                await EmailTemplateService.updateTemplate(template.id, templateData);
                toast.success('Szablon zaktualizowany');
            } else {
                await EmailTemplateService.createTemplate(templateData);
                toast.success('Szablon utworzony');
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

    const insertVariable = (variable: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const text = body;
            const newText = text.substring(0, start) + '{{' + variable + '}}' + text.substring(end);

            setBody(newText);

            // Restore focus and cursor
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variable.length + 4; // 4 for {{}}
                    textareaRef.current.focus();
                }
            }, 0);
        } else {
            setBody(prev => prev + '{{' + variable + '}}');
        }
    };

    const AVAILABLE_VARIABLES = [
        { key: 'client_name', label: 'Imię Klienta' },
        { key: 'client_lastname', label: 'Nazwisko Klienta' },
        { key: 'company_name', label: 'Nazwa Firmy' },
        { key: 'offer_link', label: 'Link do Oferty' },
        { key: 'offer_number', label: 'Numer Oferty' },
        { key: 'user_name', label: 'Twój Podpis (Imię Nazwisko)' },
        { key: 'catalog_link', label: 'Link do Katalogu' },
    ];

    if (!isOpen) return null;



    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-lg text-slate-800">
                        {template ? 'Edytuj Szablon' : 'Nowy Szablon Wiadomości'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Form */}
                    <form className="flex-1 p-6 overflow-y-auto space-y-4" onSubmit={handleSave}>
                        {/* Wrapper for Inputs to keep them always visible */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa (wewnętrzna)</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                                        placeholder="np. Oferta Wstępna"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent bg-white"
                                    >
                                        <option value="general">Ogólne</option>
                                        <option value="offer">Oferty</option>
                                        <option value="followup">Follow-up</option>
                                        <option value="technical">Techniczne</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Temat Wiadomości</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-accent"
                                    placeholder="Temat który zobaczy klient..."
                                />
                            </div>
                        </div>

                        {/* Editor / Preview Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit mt-4">
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
                                <>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Treść Wiadomości (HTML)</label>
                                    <textarea
                                        ref={textareaRef}
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        className="flex-1 w-full border border-slate-200 rounded-lg p-4 outline-none focus:border-accent resize-none font-mono text-sm leading-relaxed"
                                        placeholder="<div>Wpisz treść wiadomości...</div>"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        Możesz używać tagów HTML oraz zmiennych z panelu po prawej stronie.
                                    </p>
                                </>
                            ) : (
                                <div className="flex-1 border border-slate-200 rounded-lg p-6 overflow-y-auto prose max-w-none bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: body }} />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="w-4 h-4 text-accent rounded border-slate-300 focus:ring-accent"
                            />
                            <label htmlFor="isActive" className="text-sm text-slate-700">Szablon aktywny</label>
                        </div>
                    </form>


                    {/* Sidebar Variables */}
                    <div className="w-64 bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto">
                        <h4 className="font-bold text-sm text-slate-700 mb-4">Zmienne</h4>
                        <div className="space-y-2">
                            {AVAILABLE_VARIABLES.map(v => (
                                <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVariable(v.key)}
                                    className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-accent hover:text-accent transition-colors flex items-center justify-between group"
                                >
                                    <span>{v.label}</span>
                                    <span className="opacity-0 group-hover:opacity-100 text-accent font-bold">+</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <h5 className="text-xs font-bold text-blue-800 mb-1">Wskazówka</h5>
                            <p className="text-[10px] text-blue-600 leading-tight">
                                Kliknij na zmienną, aby wstawić ją w miejscu kursora. Jeśli dane nie będą dostępne (np. brak linku do oferty), pole pozostanie puste.
                            </p>
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
                        {loading ? 'Zapisywanie...' : 'Zapisz Szablon'}
                    </button>
                </div>
            </div>
        </div>
    );
};
