import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ExportOptionsProps {
    messages: any[];
    sessionTitle?: string;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ messages, sessionTitle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            // Create formatted content
            const content = messages
                .map(m => `${m.role === 'user' ? '👤 Ty' : '🤖 AI'}: ${m.content}`)
                .join('\n\n');

            // For now, copy to clipboard (PDF generation would require library)
            await navigator.clipboard.writeText(content);
            toast.success('Skopiowano do schowka! Możesz wkleić do dokumentu.');
        } catch (error) {
            toast.error('Błąd eksportu');
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    const exportToEmail = () => {
        const content = messages
            .map(m => `${m.role === 'user' ? 'Pytanie' : 'Odpowiedź'}: ${m.content}`)
            .join('\n\n');

        const subject = encodeURIComponent(sessionTitle || 'Rozmowa z AI Assistant');
        const body = encodeURIComponent(content);

        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        setIsOpen(false);
    };

    const copyLastResponse = async () => {
        const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistant) {
            try {
                await navigator.clipboard.writeText(lastAssistant.content);
                toast.success('Skopiowano ostatnią odpowiedź!');
            } catch (error) {
                toast.error('Błąd kopiowania');
            }
        }
        setIsOpen(false);
    };

    const shareViaWhatsApp = () => {
        const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistant) {
            const text = encodeURIComponent(lastAssistant.content);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
        setIsOpen(false);
    };

    if (messages.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Eksportuj rozmowę"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-sm text-slate-700">Eksportuj & Udostępnij</h3>
                        </div>

                        <div className="p-2 space-y-1">
                            <button
                                onClick={copyLastResponse}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 text-left transition-colors group"
                            >
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-700">Kopiuj Odpowiedź</div>
                                    <div className="text-xs text-slate-500">Ostatnia odpowiedź AI</div>
                                </div>
                            </button>

                            <button
                                onClick={exportToPDF}
                                disabled={isExporting}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 text-left transition-colors group"
                            >
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-700">Kopiuj Całość</div>
                                    <div className="text-xs text-slate-500">Cała rozmowa</div>
                                </div>
                            </button>

                            <button
                                onClick={exportToEmail}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 text-left transition-colors group"
                            >
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-700">Wyślij Email</div>
                                    <div className="text-xs text-slate-500">Otwórz w kliencie email</div>
                                </div>
                            </button>

                            <button
                                onClick={shareViaWhatsApp}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 text-left transition-colors group"
                            >
                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-700">WhatsApp</div>
                                    <div className="text-xs text-slate-500">Udostępnij przez WhatsApp</div>
                                </div>
                            </button>
                        </div>

                        <div className="p-2 border-t border-slate-100 bg-slate-50">
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Szybko udostępnij odpowiedzi AI
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
