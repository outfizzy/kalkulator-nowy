import React, { useState, useEffect } from 'react';
import { EmailTemplateService } from '../../services/database/email-template.service';
import type { EmailTemplate } from '../../services/database/email-template.service';
import { EmailFooterService } from '../../services/database/email-footer.service';
import type { EmailFooter } from '../../services/database/email-footer.service';
import { TemplateEditorModal } from '../../components/mail/TemplateEditorModal';
import { FooterEditorModal } from '../../components/mail/FooterEditorModal';
import { toast } from 'react-hot-toast';

export const EmailTemplatesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'templates' | 'footers'>('templates');
    console.log('EmailTemplatesPage rendered, activeTab:', activeTab);

    // Templates State
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>(undefined);

    // Footers State
    const [footers, setFooters] = useState<EmailFooter[]>([]);
    const [loadingFooters, setLoadingFooters] = useState(true);
    const [isFooterEditorOpen, setIsFooterEditorOpen] = useState(false);
    const [editingFooter, setEditingFooter] = useState<EmailFooter | undefined>(undefined);

    useEffect(() => {
        if (activeTab === 'templates') loadTemplates();
        else loadFooters();
    }, [activeTab]);

    // --- Templates Handlers ---
    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await EmailTemplateService.getTemplates(false);
            setTemplates(data);
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania szablonów');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;
        try {
            await EmailTemplateService.deleteTemplate(id);
            toast.success('Usunięto szablon');
            loadTemplates();
        } catch (error) {
            console.error(error);
            toast.error('Błąd usuwania');
        }
    };

    const handleEditTemplate = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setIsTemplateEditorOpen(true);
    };

    const handleCreateTemplate = () => {
        setEditingTemplate(undefined);
        setIsTemplateEditorOpen(true);
    };

    // --- Footers Handlers ---
    const loadFooters = async () => {
        setLoadingFooters(true);
        try {
            const data = await EmailFooterService.getFooters(false);
            setFooters(data);
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania stopek');
        } finally {
            setLoadingFooters(false);
        }
    };

    const handleDeleteFooter = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę stopkę?')) return;
        try {
            await EmailFooterService.deleteFooter(id);
            toast.success('Usunięto stopkę');
            loadFooters();
        } catch (error) {
            console.error(error);
            toast.error('Błąd usuwania');
        }
    };

    const handleEditFooter = (footer: EmailFooter) => {
        setEditingFooter(footer);
        setIsFooterEditorOpen(true);
    };

    const handleCreateFooter = () => {
        setEditingFooter(undefined);
        setIsFooterEditorOpen(true);
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Komunikacja E-mail</h1>
                    <p className="text-slate-500">Zarządzaj szablonami wiadomości oraz stopkami firmowymi.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'templates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Szablony
                    </button>
                    <button
                        onClick={() => setActiveTab('footers')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'footers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Stopki
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                {activeTab === 'templates' ? (
                    <button
                        onClick={handleCreateTemplate}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy Szablon
                    </button>
                ) : (
                    <button
                        onClick={handleCreateFooter}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowa Stopka
                    </button>
                )}
            </div>

            {/* CONTENT AREA */}
            {activeTab === 'templates' ? (
                // TEMPLATES LIST
                loadingTemplates ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nazwa</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Temat</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Kategoria</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            Brak szablonów. Utwórz pierwszy szablon klikając przycisk powyżej.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map(template => (
                                        <tr key={template.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{template.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{template.subject}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase tracking-wide">
                                                    {template.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {template.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Aktywny</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Nieaktywny</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditTemplate(template)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                // FOOTERS LIST
                loadingFooters ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nazwa Stopki</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Podgląd (Fragment)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {footers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                            Brak stopek. Utwórz pierwszą stopkę klikając przycisk powyżej.
                                        </td>
                                    </tr>
                                ) : (
                                    footers.map(footer => (
                                        <tr key={footer.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{footer.name}</td>
                                            <td className="px-6 py-4 text-slate-600 truncate max-w-xs text-xs font-mono">
                                                {footer.content.substring(0, 50)}...
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {footer.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Aktywna</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Nieaktywna</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditFooter(footer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteFooter(footer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            <TemplateEditorModal
                isOpen={isTemplateEditorOpen}
                onClose={() => setIsTemplateEditorOpen(false)}
                template={editingTemplate}
                onSuccess={loadTemplates}
            />

            <FooterEditorModal
                isOpen={isFooterEditorOpen}
                onClose={() => setIsFooterEditorOpen(false)}
                footer={editingFooter}
                onSuccess={loadFooters}
            />
        </div>
    );
};
