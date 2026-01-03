import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Visualizer3D } from '../components/visualizer/Visualizer3D';
import { VisualizerSidebar } from '../components/visualizer/ui/VisualizerSidebar';
import { VisualizerAIChat } from '../components/visualizer/ui/VisualizerAIChat';
import { useVisualizerPrice } from '../hooks/useVisualizerPrice';
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
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Real-time price calculation
    const { price, loading, structureConfig } = useVisualizerPrice(config);

    const handleConfigChange = (updates: Partial<ProductConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const handleUploadBackground = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setBackgroundImage(e.target.result);
                setAiResult(null); // Reset AI result on new background
            }
        };
        reader.readAsDataURL(file);
    };

    const handleClearBackground = () => {
        setBackgroundImage(null);
        setAiResult(null);
    };

    const handleAnalyzeAI = async () => {
        if (!backgroundImage || !canvasRef.current) {
            toast.error('Brak tła lub modelu 3D');
            return;
        }

        setAiLoading(true);
        const toastId = toast.loading('Wysyłanie do AI Architekta...');

        try {
            // 1. Setup Constants
            const size = 1024;
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = size;
            bgCanvas.height = size;
            const bgCtx = bgCanvas.getContext('2d')!;

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = size;
            maskCanvas.height = size;
            const maskCtx = maskCanvas.getContext('2d')!;

            // 2. Load Background Image
            const bgImg = new Image();
            bgImg.src = backgroundImage;
            await new Promise((resolve, reject) => {
                bgImg.onload = resolve;
                bgImg.onerror = reject;
            });

            // 3. Calculate Center Crop (Cover Strategy) to match visualizer "object-cover"
            // We want to capture exactly what is visible in the center of the screen if displayed as cover
            // But here we are mapping Source Image -> 1024x1024.
            // Screen is likely landscape. Image might be portrait or landscape.
            // To minimize distortion, we should crop the source image to a square.

            // Calculate aspect ratios
            const imgAspect = bgImg.width / bgImg.height;
            let sx, sy, sWidth, sHeight;

            if (imgAspect > 1) {
                // Landscape: Crop Left/Right
                sHeight = bgImg.height;
                sWidth = bgImg.height;
                sx = (bgImg.width - bgImg.height) / 2;
                sy = 0;
            } else {
                // Portrait: Crop Top/Bottom
                sWidth = bgImg.width;
                sHeight = bgImg.width;
                sx = 0;
                sy = (bgImg.height - bgImg.width) / 2;
            }

            // Draw Background (Center Cropped to Square)
            bgCtx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, size, size);
            const bgBase64 = bgCanvas.toDataURL('image/png');

            // 4. Process Mask (From 3D Canvas)
            const glCanvas = canvasRef.current;

            // We must crop the GL Canvas the SAME way relative to the view?
            // VISUALIZATION ISSUE:
            // The 3D canvas is full width/height of the window.
            // The Background Image is "cover" (cropped) behind it.
            // We need to capture the 3D content that overlaps the *cropped* background area.

            // This is complex to perfect without know window dimensions.
            // HEURISTIC: Assuming the user centers the model in the view.
            // We will center-crop the 3D canvas to a square.

            const glAspect = glCanvas.width / glCanvas.height;
            let glSx, glSy, glSWidth, glSHeight;

            if (glAspect > 1) {
                glSHeight = glCanvas.height;
                glSWidth = glCanvas.height;
                glSx = (glCanvas.width - glCanvas.height) / 2;
                glSy = 0;
            } else {
                glSWidth = glCanvas.width;
                glSHeight = glCanvas.width;
                glSx = 0;
                glSy = (glCanvas.height - glCanvas.width) / 2;
            }

            maskCtx.drawImage(glCanvas, glSx, glSy, glSWidth, glSHeight, 0, 0, size, size);

            // Invert Alpha for DALL-E Mask:
            // We want to KEEP the Model (so AI treats it as context or redraws guided by it).
            // Actually, for "Inpainting", Transparent = EDIT.
            // Strategy: We want AI to redraw the MODEL to look photorealistic, keeping the BG.
            // So Model Area should be TRANSPARENT (Edit). Background Area should be OPAQUE (Keep).

            const imageData = maskCtx.getImageData(0, 0, size, size);
            const pixelData = imageData.data;
            for (let i = 0; i < pixelData.length; i += 4) {
                const alpha = pixelData[i + 3];
                // Conservative threshold
                if (alpha > 10) {
                    // Model Pixel -> EDIT (Transparent)
                    pixelData[i + 3] = 0;
                } else {
                    // Empty Pixel -> KEEP (Opaque White, DALL-E ignores color of mask usually, just alpha)
                    // But good practice to set to white
                    pixelData[i] = 255;
                    pixelData[i + 1] = 255;
                    pixelData[i + 2] = 255;
                    pixelData[i + 3] = 255;
                }
            }
            maskCtx.putImageData(imageData, 0, 0);
            const maskBase64 = maskCanvas.toDataURL('image/png');

            // 5. Construct Prompt
            const prompt = `Modern photorealistic patio cover, ${config.roofType} roof, ${config.color} structure, high detail, architectural photography, sharp focus, ${config.installationType === 'wall-mounted' ? 'attached to house' : 'freestanding'}.`;

            // 6. Call Edge Function
            const { supabase } = await import('../lib/supabase');
            const { data: responseData, error } = await supabase.functions.invoke('customize-visualization', {
                body: {
                    image: bgBase64,
                    mask: maskBase64,
                    prompt: prompt
                }
            });

            if (error) throw error;
            if (responseData?.data?.[0]?.url) {
                setAiResult(responseData.data[0].url);
                toast.success('Wizualizacja gotowa!', { id: toastId });
            } else {
                throw new Error('No image returned');
            }

        } catch (error) {
            console.error('AI Gen Error:', error);
            toast.error('Błąd generowania. Spróbuj innego zdjęcia lub odśwież.', { id: toastId });
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="w-full h-screen relative overflow-hidden bg-slate-50">
            {/* Background Layer: 3D Canvas matches screen size, shifted by sidebar width on desktop */}
            <div className={`absolute top-0 right-0 transition-all duration-300 z-0 ${!isSidebarCollapsed ? 'left-0 bottom-[50vh] lg:bottom-0 lg:left-96' : 'left-0 bottom-0'}`}>
                {/* AI Loading Overlay */}
                {aiLoading && (
                    <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fadeIn">
                        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                        <h3 className="text-xl font-bold">AI Architekt pracuje...</h3>
                        <p className="text-sm opacity-80 mt-2">To może potrwać kilkanaście sekund</p>
                    </div>
                )}

                {/* AI Result Overlay */}
                {aiResult ? (
                    <div className="absolute inset-0 z-20 bg-slate-900 flex items-center justify-center">
                        <img src={aiResult} alt="AI Visualization" className="max-w-full max-h-full object-contain" />
                        <button
                            onClick={() => setAiResult(null)}
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 backdrop-blur-md"
                        >
                            ✕ Zamknij
                        </button>
                    </div>
                ) : (
                    backgroundImage && (
                        <img
                            src={backgroundImage}
                            alt="Background"
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                    ))}

                <Visualizer3D
                    config={config}
                    transparent={!!backgroundImage}
                    sunPosition={sunPosition}
                    structureConfig={structureConfig}
                    onCanvasCreated={(canvas) => { canvasRef.current = canvas; }}
                />
            </div>

            {/* Foreground Layer: Floating Sidebar */}
            {/* Z-Index 50 ensures it stays above canvas controls */}
            <VisualizerSidebar
                config={config}
                onChange={handleConfigChange}
                price={price}
                priceLoading={loading}
                onUploadBackground={handleUploadBackground}
                onClearBackground={backgroundImage ? handleClearBackground : undefined}
                sunPosition={sunPosition}
                onSunChange={setSunPosition}
                onAnalyzeAI={handleAnalyzeAI}
                isCollapsed={isSidebarCollapsed}
                onToggle={setIsSidebarCollapsed}
            />

            {/* AI Architect Chat */}
            {currentUser && (
                <VisualizerAIChat
                    config={config}
                    onChange={handleConfigChange}
                    user={currentUser}
                />
            )}

            {/* Optional: Overlay Header for Branding (Top Right) */}
            <div className="absolute top-6 right-8 z-10 pointer-events-none">
                <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-800/80 backdrop-blur-sm">POLENDACH<span className="text-accent">24</span></h1>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Visualizer Pro</div>
                </div>
            </div>
        </div>
    );
};
