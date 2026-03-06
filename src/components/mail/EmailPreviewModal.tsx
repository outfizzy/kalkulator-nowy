import React from 'react';

interface EmailPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    html: string;
    title: string;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ isOpen, onClose, html, title }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                            <p className="text-xs text-slate-500">Podgląd szablonu wiadomości e-mail</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Email Preview via iframe */}
                <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
                        <iframe
                            srcDoc={html}
                            title="Email Preview"
                            className="w-full h-full border-0"
                            style={{ minHeight: '500px' }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
};
