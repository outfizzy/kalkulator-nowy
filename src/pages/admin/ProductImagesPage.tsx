/**
 * Product Images Admin Page - Simplified Version
 * Just shows instructions and current image configuration
 */

import React from 'react';
import { MODEL_IMAGES, getModelImage, getModelDisplayName } from '../../config/modelImages';

const ROOF_MODELS = [
    'Trendline', 'Trendline+', 'Topline', 'Topline XL',
    'Designline', 'Skyline', 'Orangeline', 'Orangeline+', 'Carport'
];

const ACCESSORY_MODELS = [
    'Panorama', 'WPC', 'LED', 'Awning', 'ZIP Screen'
];

export function ProductImagesPage() {
    const [activeTab, setActiveTab] = React.useState<'roofs' | 'accessories'>('roofs');
    const models = activeTab === 'roofs' ? ROOF_MODELS : ACCESSORY_MODELS;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">📷 Zdjęcia Produktów</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Zarządzaj zdjęciami dla modeli produktów
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📝 Jak dodać zdjęcie:</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Przygotuj zdjęcie w formacie JPG lub PNG</li>
                    <li>Nazwij plik według modelu (np. <code className="bg-blue-100 px-1 rounded">trendline.jpg</code>)</li>
                    <li>Wgraj plik do folderu <code className="bg-blue-100 px-1 rounded">public/images/models/</code></li>
                    <li>Zdjęcie pojawi się automatycznie w ofertach</li>
                </ol>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-4">
                <button
                    onClick={() => setActiveTab('roofs')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'roofs'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    🏠 Modele Dachów
                </button>
                <button
                    onClick={() => setActiveTab('accessories')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'accessories'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    🛠️ Akcesoria
                </button>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {models.map(model => {
                    const imageUrl = getModelImage(model);
                    const hasImage = !!imageUrl;

                    return (
                        <div
                            key={model}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                            {/* Image Area */}
                            <div className="relative aspect-[4/3] bg-slate-100">
                                {hasImage ? (
                                    <img
                                        src={imageUrl}
                                        alt={model}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '';
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs">Brak zdjęcia</span>
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${hasImage ? 'bg-green-500' : 'bg-amber-500'}`}
                                    title={hasImage ? 'Zdjęcie ustawione' : 'Brak zdjęcia'}>
                                </div>
                            </div>

                            {/* Model Name */}
                            <div className="p-3 text-center border-t">
                                <h3 className="text-base font-bold text-slate-800">{getModelDisplayName(model)}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {MODEL_IMAGES[model]?.split('/').pop() || 'nie ustawiono'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* File names reference */}
            <div className="bg-slate-50 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-slate-700 mb-2">📁 Nazwy plików:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                    {Object.entries(MODEL_IMAGES).map(([model, path]) => (
                        <div key={model} className="flex justify-between bg-white px-3 py-1.5 rounded border">
                            <span className="font-medium">{model}:</span>
                            <code className="text-blue-600">{path.split('/').pop()}</code>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
