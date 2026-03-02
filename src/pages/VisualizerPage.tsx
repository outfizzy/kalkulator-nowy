import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Visualizer3D } from '../components/visualizer/Visualizer3D';
import { AROverlayCanvas } from '../components/visualizer/AROverlayCanvas';
import { VisualizerSidebar } from '../components/visualizer/ui/VisualizerSidebar';
import { VisualizerAIChat } from '../components/visualizer/ui/VisualizerAIChat';
import { useVisualizerPrice } from '../hooks/useVisualizerPrice';
import { useHomography } from '../hooks/useHomography';
import type { HouseAnalysis } from '../hooks/useHomography';
import { useAuth } from '../contexts/AuthContext';
import type { ProductConfig } from '../types';

const INITIAL_CONFIG: ProductConfig = {
    modelId: 'trendstyle',
    width: 5000,
    projection: 3000,
    postsHeight: 2500,
    color: 'RAL 7016',
    customColor: false,
    roofType: 'polycarbonate',
    polycarbonateType: 'standard',
    installationType: 'wall-mounted',
    sideWedges: false,
    addons: [],
    selectedAccessories: [],
    customItems: []
};

export const VisualizerPage = () => {
    const { currentUser } = useAuth();
    const [config, setConfig] = useState<ProductConfig>(INITIAL_CONFIG);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [sunPosition, setSunPosition] = useState(0.5); // 0 to 1

    const [aiLoading, setAiLoading] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // ── AR Mode State ──
    const [arMode, setArMode] = useState(false);
    const [houseAnalysis, setHouseAnalysis] = useState<HouseAnalysis | null>(null);
    const [arImageDimensions, setArImageDimensions] = useState({ width: 1024, height: 1024 });
    const [modelOffset, setModelOffset] = useState({ x: 0, y: 0, scale: 1 });

    // Real-time price calculation
    const { price, loading, structureConfig } = useVisualizerPrice(config);

    // Camera params from homography
    const cameraParams = useHomography(
        houseAnalysis,
        arImageDimensions.width,
        arImageDimensions.height,
        { width: config.width, projection: config.projection, postsHeight: config.postsHeight }
    );

    const handleConfigChange = (updates: Partial<ProductConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const handleUploadBackground = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setBackgroundImage(e.target.result);
                // Get natural image dimensions
                const img = new Image();
                img.onload = () => {
                    setArImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.src = e.target.result;

                // Reset AR state on new photo
                setArMode(false);
                setHouseAnalysis(null);
                setModelOffset({ x: 0, y: 0, scale: 1 });
            }
        };
        reader.readAsDataURL(file);
    }, []);

    const handleClearBackground = useCallback(() => {
        setBackgroundImage(null);
        setArMode(false);
        setHouseAnalysis(null);
        setModelOffset({ x: 0, y: 0, scale: 1 });
    }, []);

    const handleAnalyzeAI = useCallback(async () => {
        if (!backgroundImage) {
            toast.error('Najpierw wgraj zdjęcie domu');
            return;
        }

        setAiLoading(true);
        const toastId = toast.loading('🏠 AI analizuje zdjęcie domu...', {
            duration: 60000
        });

        try {
            const { supabase } = await import('../lib/supabase');
            const { data: responseData, error } = await supabase.functions.invoke('analyze-house-photo', {
                body: {
                    image: backgroundImage,
                    imageWidth: arImageDimensions.width,
                    imageHeight: arImageDimensions.height
                }
            });

            if (error) throw error;

            if (responseData?.analysis) {
                const analysis = responseData.analysis as HouseAnalysis;
                setHouseAnalysis(analysis);
                setArMode(true);

                // Log confidence
                const confidencePercent = Math.round((analysis.confidence || 0) * 100);
                toast.success(
                    `✅ Analiza gotowa! Pewność: ${confidencePercent}%\n${analysis.notes || ''}`,
                    { id: toastId, duration: 5000 }
                );
            } else {
                throw new Error('Brak danych analizy');
            }
        } catch (error) {
            console.error('[AR] Analysis Error:', error);
            toast.error('Błąd analizy zdjęcia. Spróbuj z innym zdjęciem.', { id: toastId });
        } finally {
            setAiLoading(false);
        }
    }, [backgroundImage, arImageDimensions]);

    const handleModelOffsetChange = useCallback((key: 'x' | 'y' | 'scale', value: number) => {
        setModelOffset(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleExportAR = useCallback(async () => {
        // Find the AR canvas and export to image
        const canvasElements = document.querySelectorAll('canvas');
        if (canvasElements.length === 0) {
            toast.error('Brak canvas do eksportu');
            return;
        }

        const toastId = toast.loading('Generuję obraz...');

        try {
            // Create a composite canvas
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = arImageDimensions.width;
            exportCanvas.height = arImageDimensions.height;
            const ctx = exportCanvas.getContext('2d')!;

            // Draw background image
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.src = backgroundImage!;
            await new Promise<void>((resolve, reject) => {
                bgImg.onload = () => resolve();
                bgImg.onerror = () => reject(new Error('Failed to load background'));
            });
            ctx.drawImage(bgImg, 0, 0, exportCanvas.width, exportCanvas.height);

            // Find the Three.js canvas and draw it on top
            const glCanvas = canvasElements[canvasElements.length - 1];
            ctx.drawImage(glCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

            // Download
            const dataURL = exportCanvas.toDataURL('image/jpeg', 0.92);
            const link = document.createElement('a');
            link.download = `wizualizacja-AR-${Date.now()}.jpg`;
            link.href = dataURL;
            link.click();

            toast.success('Wizualizacja zapisana! 📸', { id: toastId });
        } catch (err) {
            console.error('[AR Export]', err);
            toast.error('Błąd eksportu', { id: toastId });
        }
    }, [backgroundImage, arImageDimensions]);

    const handleExitAR = useCallback(() => {
        setArMode(false);
        setHouseAnalysis(null);
        setModelOffset({ x: 0, y: 0, scale: 1 });
    }, []);

    return (
        <div className="w-full h-screen relative overflow-hidden bg-slate-50">
            {/* Background Layer */}
            <div className={`absolute top-0 right-0 transition-all duration-300 z-0 ${!isSidebarCollapsed ? 'left-0 bottom-[50vh] lg:bottom-0 lg:left-96' : 'left-0 bottom-0'}`}>
                {/* AI Loading Overlay */}
                {aiLoading && (
                    <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fadeIn">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl">🏠</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                            AI Architect analizuje zdjęcie...
                        </h3>
                        <p className="text-sm opacity-70 mt-2 max-w-xs text-center">
                            Wykrywam ścianę, perspektywę i oświetlenie — to zajmie kilka sekund
                        </p>
                    </div>
                )}

                {/* AR Mode: Use AROverlayCanvas */}
                {arMode && cameraParams && backgroundImage ? (
                    <AROverlayCanvas
                        config={config}
                        backgroundImage={backgroundImage}
                        cameraParams={cameraParams}
                        structureConfig={structureConfig}
                        modelOffset={modelOffset}
                    />
                ) : (
                    <>
                        {/* Standard mode: show BG + 3D */}
                        {backgroundImage && !arMode && (
                            <img
                                src={backgroundImage}
                                alt="Background"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            />
                        )}
                        <Visualizer3D
                            config={config}
                            transparent={!!backgroundImage}
                            sunPosition={sunPosition}
                            structureConfig={structureConfig}
                            onCanvasCreated={(canvas) => { canvasRef.current = canvas; }}
                        />
                    </>
                )}
            </div>

            {/* AR Mode Controls Overlay */}
            {arMode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                    <button
                        onClick={handleExportAR}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2 transition-all hover:scale-105"
                    >
                        📸 Zapisz wizualizację
                    </button>
                    <button
                        onClick={handleExitAR}
                        className="bg-white/90 hover:bg-white text-slate-700 px-5 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all"
                    >
                        ✕ Wyjdź z AR
                    </button>
                </div>
            )}

            {/* Foreground Layer: Floating Sidebar */}
            <VisualizerSidebar
                config={config}
                onChange={handleConfigChange}
                price={price}
                priceLoading={loading}
                onUploadBackground={handleUploadBackground}
                onClearBackground={backgroundImage ? handleClearBackground : undefined}
                sunPosition={sunPosition}
                onSunChange={setSunPosition}
                onAnalyzeAI={backgroundImage ? handleAnalyzeAI : undefined}
                isCollapsed={isSidebarCollapsed}
                onToggle={setIsSidebarCollapsed}
                arMode={arMode}
                modelOffset={modelOffset}
                onModelOffsetChange={handleModelOffsetChange}
                houseAnalysis={houseAnalysis}
                onExportAR={arMode ? handleExportAR : undefined}
            />

            {/* AI Architect Chat */}
            {currentUser && (
                <VisualizerAIChat
                    config={config}
                    onChange={handleConfigChange}
                    user={currentUser}
                />
            )}

            {/* Branding */}
            <div className="absolute top-6 right-8 z-10 pointer-events-none">
                <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-800/80 backdrop-blur-sm">POLENDACH<span className="text-accent">24</span></h1>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                        {arMode ? 'AR Preview' : 'Visualizer Pro'}
                    </div>
                </div>
            </div>
        </div>
    );
};
