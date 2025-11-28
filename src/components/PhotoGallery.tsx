import React, { useState } from 'react';

interface PhotoGalleryProps {
    photos: string[];
    onDelete?: (index: number) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, onDelete }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handlePrevious = () => {
        if (selectedIndex !== null && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    const handleNext = () => {
        if (selectedIndex !== null && selectedIndex < photos.length - 1) {
            setSelectedIndex(selectedIndex + 1);
        }
    };

    const handleClose = () => {
        setSelectedIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (selectedIndex === null) return;

        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') handleClose();
    };

    React.useEffect(() => {
        if (selectedIndex !== null) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [selectedIndex]);

    if (photos.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Brak zdjęć</p>
            </div>
        );
    }

    return (
        <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                        <div
                            className="aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedIndex(index)}
                        >
                            <img
                                src={photo}
                                alt={`Zdjęcie ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(index);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Usuń zdjęcie"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {selectedIndex !== null && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Counter */}
                    <div className="absolute top-4 left-4 text-white text-lg font-medium">
                        {selectedIndex + 1} / {photos.length}
                    </div>

                    {/* Previous Button */}
                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            className="absolute left-4 text-white hover:text-slate-300 transition-colors"
                        >
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={photos[selectedIndex]}
                        alt={`Zdjęcie ${selectedIndex + 1}`}
                        className="max-h-full max-w-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next Button */}
                    {selectedIndex < photos.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            className="absolute right-4 text-white hover:text-slate-300 transition-colors"
                        >
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </>
    );
};
