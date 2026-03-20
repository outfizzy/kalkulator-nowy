import React, { useEffect } from 'react';
import { LEGAL_DOCS, type LegalDocType } from './LegalDocuments';

interface LegalDocumentModalProps {
  docKey: LegalDocType;
  onClose: () => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ docKey, onClose }) => {
  const doc = LEGAL_DOCS[docKey];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-white">{doc.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Wersja: {doc.version}</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500">Data: {doc.date}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose prose-invert prose-sm max-w-none">
            {doc.content.split('\n\n').map((paragraph, i) => {
              // Section headers (§ or numbered)
              if (paragraph.startsWith('§') || /^\d+\.\s/.test(paragraph)) {
                const lines = paragraph.split('\n');
                return (
                  <div key={i} className="mt-6 first:mt-0">
                    <h3 className="text-emerald-400 font-semibold text-sm mb-2">{lines[0]}</h3>
                    {lines.slice(1).map((line, j) => (
                      <p key={j} className="text-slate-300 text-sm leading-relaxed mb-1.5">{line}</p>
                    ))}
                  </div>
                );
              }
              // List items
              if (paragraph.includes('\na)') || paragraph.includes('\n•')) {
                const lines = paragraph.split('\n');
                return (
                  <div key={i} className="mb-3">
                    {lines[0] && <p className="text-slate-300 text-sm mb-1.5">{lines[0]}</p>}
                    <ul className="list-none space-y-1 ml-2">
                      {lines.slice(1).filter(Boolean).map((line, j) => (
                        <li key={j} className="text-slate-400 text-sm flex items-start gap-2">
                          <span className="text-emerald-500/60 mt-1">›</span>
                          <span>{line.replace(/^[a-z]\)\s*|^•\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              // Regular paragraph
              return (
                <p key={i} className="text-slate-300 text-sm leading-relaxed mb-2.5">
                  {paragraph.split('\n').map((line, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
