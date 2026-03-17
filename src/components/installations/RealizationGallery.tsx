import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { RealizationPhoto } from '../../services/database/realization.service';

interface RealizationGalleryProps {
    photos: RealizationPhoto[];
    title?: string;
}

export const RealizationGallery: React.FC<RealizationGalleryProps> = ({ photos, title }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openLightbox = useCallback((index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    }, []);

    const closeLightbox = useCallback(() => setLightboxOpen(false), []);

    const goNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % photos.length);
    }, [photos.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
    }, [photos.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxOpen, closeLightbox, goNext, goPrev]);

    if (!photos || photos.length === 0) {
        return (
            <div className="text-center py-4 text-slate-400 text-xs">
                Brak zdjęć
            </div>
        );
    }

    const coverPhoto = photos.find(p => p.is_cover) || photos[0];

    return (
        <>
            {/* Thumbnail Grid */}
            <div className="space-y-2">
                {/* Cover photo */}
                <div
                    className="relative cursor-pointer group rounded-lg overflow-hidden"
                    onClick={() => openLightbox(photos.indexOf(coverPhoto))}
                >
                    <img
                        src={coverPhoto.url}
                        alt={coverPhoto.caption || title || 'Realizacja'}
                        className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    {photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                            📷 {photos.length}
                        </div>
                    )}
                </div>

                {/* Thumbnails row */}
                {photos.length > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                        {photos.slice(0, 5).map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo.url}
                                alt={photo.caption || `Zdjęcie ${idx + 1}`}
                                className={`w-12 h-12 rounded object-cover cursor-pointer flex-shrink-0 border-2 transition-colors ${
                                    idx === currentIndex ? 'border-blue-500' : 'border-transparent hover:border-blue-300'
                                }`}
                                onClick={() => openLightbox(idx)}
                            />
                        ))}
                        {photos.length > 5 && (
                            <div
                                className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600 cursor-pointer hover:bg-slate-300 flex-shrink-0"
                                onClick={() => openLightbox(5)}
                            >
                                +{photos.length - 5}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Title */}
                    {title && (
                        <div className="absolute top-4 left-4 text-white/90 font-semibold text-lg z-10">
                            {title}
                        </div>
                    )}

                    {/* Counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
                        {currentIndex + 1} / {photos.length}
                    </div>

                    {/* Previous button */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-3 z-10 transition-colors"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}

                    {/* Main Image */}
                    <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[80vh]">
                        <img
                            src={photos[currentIndex].url}
                            alt={photos[currentIndex].caption || `Zdjęcie ${currentIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                        {photos[currentIndex].caption && (
                            <div className="text-center text-white/70 mt-3 text-sm">
                                {photos[currentIndex].caption}
                            </div>
                        )}
                    </div>

                    {/* Next button */}
                    {photos.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-3 z-10 transition-colors"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}

                    {/* Bottom thumbnails strip */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-2 z-10">
                        {photos.map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo.url}
                                alt={photo.caption || `Miniaturka ${idx + 1}`}
                                className={`w-16 h-16 rounded-lg object-cover cursor-pointer flex-shrink-0 transition-all border-2 ${
                                    idx === currentIndex
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};
