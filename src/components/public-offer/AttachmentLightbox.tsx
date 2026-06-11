import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Attachment {
    id?: string;
    url: string;
    name: string;
    type?: string; // 'visualization' | 'technical'
}

interface AttachmentLightboxProps {
    attachment: Attachment;
    allAttachments?: Attachment[];
    onClose: () => void;
    onNavigate?: (att: Attachment) => void;
}

export const AttachmentLightbox: React.FC<AttachmentLightboxProps> = ({
    attachment,
    allAttachments = [],
    onClose,
    onNavigate,
}) => {
    const isImage = /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(attachment.name || attachment.url || '');
    const isPdf = /\.pdf$/i.test(attachment.name || attachment.url || '');
    const label = attachment.type === 'visualization' ? '3D-Visualisierung' : 'Technische Zeichnung';

    // Zoom + Pan state (for images)
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastPinchDist, setLastPinchDist] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // PDF loading state
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);

    // Navigation
    const currentIndex = allAttachments.findIndex(a => (a.id || a.url) === (attachment.id || attachment.url));
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allAttachments.length - 1;

    // Reset zoom when attachment changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setPdfLoading(true);
        setPdfError(false);
    }, [attachment.url]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && hasPrev && onNavigate) onNavigate(allAttachments[currentIndex - 1]);
            if (e.key === 'ArrowRight' && hasNext && onNavigate) onNavigate(allAttachments[currentIndex + 1]);
            if (e.key === '+' || e.key === '=') handleZoomIn();
            if (e.key === '-') handleZoomOut();
            if (e.key === '0') handleResetZoom();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, hasPrev, hasNext]);

    // Zoom controls
    const handleZoomIn = useCallback(() => setScale(s => Math.min(s * 1.3, 5)), []);
    const handleZoomOut = useCallback(() => {
        setScale(s => {
            const next = Math.max(s / 1.3, 0.5);
            if (next <= 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    }, []);
    const handleResetZoom = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    }, [handleZoomIn, handleZoomOut]);

    // Mouse drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }, [scale, position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    // Touch pinch-to-zoom + drag
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            setLastPinchDist(Math.hypot(dx, dy));
        } else if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
        }
    }, [scale, position]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (lastPinchDist > 0) {
                const ratio = dist / lastPinchDist;
                setScale(s => Math.min(Math.max(s * ratio, 0.5), 5));
            }
            setLastPinchDist(dist);
        } else if (e.touches.length === 1 && isDragging) {
            setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
        }
    }, [isDragging, dragStart, lastPinchDist]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        setLastPinchDist(0);
    }, []);

    // Double-tap to zoom
    const lastTap = useRef(0);
    const handleDoubleTap = useCallback((e: React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            e.preventDefault();
            if (scale > 1) handleResetZoom();
            else setScale(2.5);
        }
        lastTap.current = now;
    }, [scale, handleResetZoom]);

    // Google Docs Viewer for PDFs (better mobile experience)
    const getGoogleViewerUrl = (url: string) =>
        `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ touchAction: 'none' }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-3 sm:px-5 py-3 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-3 text-white min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${attachment.type === 'visualization' ? 'bg-purple-500/30' : 'bg-blue-500/30'}`}>
                        {isPdf ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-red-400">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-purple-400">
                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{label}</p>
                        <p className="text-[11px] text-white/50 truncate">{attachment.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Zoom controls (images only) */}
                    {isImage && (
                        <>
                            <button onClick={handleZoomOut} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Verkleinern (-)">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><circle cx="11" cy="11" r="8" /><path d="M8 11h6" /><path d="m21 21-4.35-4.35" /></svg>
                            </button>
                            <span className="text-white/50 text-[11px] font-mono min-w-[38px] text-center tabular-nums">{Math.round(scale * 100)}%</span>
                            <button onClick={handleZoomIn} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Vergrößern (+)">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><circle cx="11" cy="11" r="8" /><path d="M8 11h6M11 8v6" /><path d="m21 21-4.35-4.35" /></svg>
                            </button>
                            {scale !== 1 && (
                                <button onClick={handleResetZoom} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zurücksetzen (0)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                </button>
                            )}
                            <div className="w-px h-5 bg-white/10 mx-1" />
                        </>
                    )}
                    {/* Open in new tab */}
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                       className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="In neuem Tab öffnen"
                       onClick={e => e.stopPropagation()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </a>
                    {/* Download */}
                    <a href={attachment.url} download className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Herunterladen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                    {/* Close */}
                    <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1" title="Schließen (Esc)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Navigation arrows */}
            {allAttachments.length > 1 && (
                <>
                    {hasPrev && onNavigate && (
                        <button
                            onClick={() => onNavigate(allAttachments[currentIndex - 1])}
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    {hasNext && onNavigate && (
                        <button
                            onClick={() => onNavigate(allAttachments[currentIndex + 1])}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </>
            )}

            {/* Content */}
            <div
                ref={containerRef}
                className="relative z-10 flex-1 flex items-center justify-center overflow-hidden"
                onClick={e => { if (e.target === containerRef.current) onClose(); }}
            >
                {isImage ? (
                    <div
                        className="relative select-none"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                        }}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <img
                            ref={imgRef}
                            src={attachment.url}
                            alt={label}
                            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
                            draggable={false}
                            onDoubleClick={() => scale > 1 ? handleResetZoom() : setScale(2.5)}
                        />
                    </div>
                ) : isPdf ? (
                    <div className="w-full max-w-5xl mx-4 flex flex-col" style={{ height: '85vh' }}>
                        {/* PDF loading state */}
                        {pdfLoading && !pdfError && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="bg-black/60 rounded-2xl p-8 flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                    <p className="text-white/80 text-sm font-medium">Dokument wird geladen…</p>
                                </div>
                            </div>
                        )}

                        {pdfError ? (
                            /* Fallback UI when iframe fails */
                            <div className="flex-1 flex items-center justify-center">
                                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center max-w-md mx-4 shadow-2xl">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-red-400">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M10 12h4M10 16h2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">{label}</h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Die Vorschau konnte nicht geladen werden. Sie können das Dokument direkt öffnen oder herunterladen.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1E6FD9] text-white rounded-full font-semibold text-sm hover:bg-[#195FC0] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-cta">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                            PDF öffnen
                                        </a>
                                        <a href={attachment.url} download
                                           className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Herunterladen
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* PDF iframe — try native first, Google Viewer as fallback */
                            <iframe
                                src={attachment.url}
                                title={attachment.name}
                                className="flex-1 w-full bg-white rounded-xl shadow-2xl border border-white/10"
                                onLoad={() => setPdfLoading(false)}
                                onError={() => { setPdfLoading(false); setPdfError(true); }}
                            />
                        )}

                        {/* PDF toolbar at bottom */}
                        {!pdfError && (
                            <div className="flex items-center justify-center gap-2 mt-3 pb-2">
                                <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-medium transition-colors border border-white/5">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                    Vollbild öffnen
                                </a>
                                <a href={attachment.url} download
                                   className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-medium transition-colors border border-white/5">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    PDF speichern
                                </a>
                                {/* Fallback to Google Viewer */}
                                <a href={getGoogleViewerUrl(attachment.url)} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg text-xs font-medium transition-colors border border-white/5">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                    Google Viewer
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Unknown file type */
                    <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-slate-400">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">{attachment.name}</h3>
                        <a href={attachment.url} download className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E6FD9] text-white rounded-full font-semibold text-sm hover:bg-[#195FC0] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-cta">
                            Herunterladen
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom indicator dots */}
            {allAttachments.length > 1 && (
                <div className="relative z-10 flex items-center justify-center gap-2 pb-4">
                    {allAttachments.map((att, i) => (
                        <button
                            key={att.id || att.url}
                            onClick={() => onNavigate?.(att)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                i === currentIndex
                                    ? 'bg-white scale-125'
                                    : 'bg-white/30 hover:bg-white/50'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
