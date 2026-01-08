import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { FairService, type Prize } from '../../services/database/fair.service';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { WheelOfFortune } from './WheelOfFortune'; // Import existing component

interface FairLeadFormProps {
    fairId: string;
    onSaved: (leadId: string, leadName: string) => void;
}

type ProductType = 'roof' | 'pergola' | 'carport' | 'other';
type RoofFill = 'polycarbonate' | 'glass';
type WallType = 'framed' | 'frameless' | 'fixed' | 'aluminum' | 'none';
type LedType = 'spot' | 'strip' | 'none';
type RoofAwning = 'under' | 'over' | 'none';

interface ProductConfig {
    id: string; // Temporary ID for list management
    type: ProductType;
    width: string;
    projection: string;

    // Roof / Pergola Logic
    roofFill?: RoofFill;
    wallTypes: WallType[]; // Multiple selection
    wallSidesCount?: number; // How many sides covered by walls? (1-4)

    ledType?: LedType;
    roofAwning?: RoofAwning;

    // ZIP Logic
    zipEnabled?: boolean;
    zipWidth?: string;
    zipHeight?: string;
    zipSidesCount?: number; // How many ZIP screens? (1-4)

    notes?: string;
}

type ViewState = 'hub' | 'wheel' | 'finalize';

export const FairLeadForm: React.FC<FairLeadFormProps> = ({ fairId, onSaved }) => {
    const { currentUser } = useAuth();

    // --- STATE ---
    const [view, setView] = useState<ViewState>('hub');
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [wonPrize, setWonPrize] = useState<Prize | null>(null);

    // Main Lead Data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [mainNotes, setMainNotes] = useState('');

    // Products
    const [products, setProducts] = useState<ProductConfig[]>([]);

    // Config Wizard State
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [currentConfig, setCurrentConfig] = useState<Partial<ProductConfig>>({});
    const [activeStep, setActiveStep] = useState(0);

    // Uploads
    const [photos, setPhotos] = useState<{ url: string, name: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch Prizes on mount
    useEffect(() => {
        const loadPrizes = async () => {
            const list = await FairService.getPrizes(fairId);
            setPrizes(list);
        };
        loadPrizes();
    }, [fairId]);

    // --- ACTIONS ---

    const startNewConfig = () => {
        setCurrentConfig({
            id: Date.now().toString(),
            type: 'roof',
            width: '4000',
            projection: '3000',
            wallTypes: [],
            ledType: 'none',
            roofAwning: 'none',
            zipEnabled: false,
            // Defaults
            wallSidesCount: 1,
            zipSidesCount: 1
        });
        setActiveStep(0);
        setIsConfiguring(true);
    };

    const saveConfig = () => {
        if (currentConfig.type && currentConfig.width && currentConfig.projection) {
            setProducts(prev => [...prev, currentConfig as ProductConfig]);
            setIsConfiguring(false);
            toast.success('Produkt dodany do listy');
        }
    };

    const removeProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const url = await FairService.uploadPhoto(file);
            setPhotos(prev => [...prev, { url, name: file.name }]);
            toast.success('Zdjęcie dodane');
        } catch (error) {
            console.error(error);
            toast.error('Błąd uploadu');
        } finally {
            setUploading(false);
        }
    };

    const handleWheelSpinEnd = (prize: Prize) => {
        setWonPrize(prize);
        setTimeout(() => {
            setView('finalize'); // Auto-advance after win
        }, 2000);
    };

    const generateNotes = () => {
        const parts = [];

        // 1. Prize
        if (wonPrize) {
            parts.push(`🎉 **NAGRODA (Koło Fortuny)**: ${wonPrize.label.toUpperCase()}`);
            parts.push('---');
        }

        // 2. Products
        parts.push(`## Produkty (${products.length})`);

        products.forEach((p, index) => {
            parts.push(`\n### ${index + 1}. ${getProductLabel(p.type)}`);
            parts.push(`- **Wymiary**: ${p.width} x ${p.projection} mm`);

            if (p.type === 'roof' || p.type === 'pergola') {
                if (p.type === 'roof') parts.push(`- **Wypełnienie**: ${p.roofFill === 'glass' ? 'Szkło' : 'Poliwęglan'}`);
                if (p.roofAwning && p.roofAwning !== 'none') parts.push(`- **Markiza Dachowa**: ${p.roofAwning === 'over' ? 'Naddachowa' : 'Poddachowa'}`);
            }

            if (p.wallTypes?.length > 0) {
                const walls = p.wallTypes.map(w => w === 'framed' ? 'Ramowe' : w === 'frameless' ? 'Bezramowe' : w === 'fixed' ? 'Stałe' : w === 'aluminum' ? 'Aluminium' : 'Brak').join(', ');
                parts.push(`- **Ściany**: ${walls} (Ilość stron: ${p.wallSidesCount || 1})`);
            }

            if (p.ledType && p.ledType !== 'none') {
                parts.push(`- **LED**: ${p.ledType === 'spot' ? 'Punkty (Spot)' : 'Taśmy (Strip)'}`);
            }

            if (p.zipEnabled) {
                parts.push(`- **ZIP Screen**: TAK${p.zipWidth ? ` (${p.zipWidth}x${p.zipHeight || '-'})` : ''} - Ilość sztuk: ${p.zipSidesCount || 1}`);
            }

            if (p.notes) parts.push(`- *Uwagi*: ${p.notes}`);
        });

        if (photos.length) parts.push(`\n## Załączniki\n- Ilość zdjęć: ${photos.length}`);
        if (mainNotes) parts.push(`\n## Notatka Główna\n${mainNotes}`);

        return parts.join('\n');
    };

    const handleSubmit = async () => {
        if (!firstName || !lastName || !phone) {
            toast.error('Uzupełnij imię, nazwisko i telefon');
            return;
        }

        setLoading(true);
        try {
            const notes = generateNotes();
            const lead = await DatabaseService.createLead({
                customerData: { firstName, lastName, phone, email, companyName: '' },
                source: 'targi',
                status: 'contacted',
                assignedTo: currentUser?.id,
                notes: notes,
                fairId: fairId,
                fairPhotos: photos,
                fairPrize: wonPrize || undefined
            });

            if (lead) {
                onSaved(lead.id, `${firstName} ${lastName}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd zapisu!');
        } finally {
            setLoading(false);
        }
    };

    const getProductLabel = (type: ProductType) => {
        switch (type) {
            case 'roof': return 'Zadaszenie Aluminiowe';
            case 'pergola': return 'Pergola / Deluxe';
            case 'carport': return 'Carport';
            case 'other': return 'Inne';
        }
    };

    // --- RENDERERS ---

    // CONFIG MODAL (Step 2 Implementation from Plan)
    if (isConfiguring) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800">Konfigurator Produktu</h3>
                        <button onClick={() => setIsConfiguring(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                        {activeStep === 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {(['roof', 'pergola', 'carport', 'other'] as ProductType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setCurrentConfig(c => ({ ...c, type })); setActiveStep(1); }}
                                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all hover:scale-[1.02] ${currentConfig.type === type ? 'border-accent bg-accent/5 text-accent' : 'border-slate-100 hover:border-accent/30'}`}
                                    >
                                        <span className="text-4xl">{type === 'roof' ? '🏠' : type === 'carport' ? '🚗' : type === 'pergola' ? '☀️' : '🔧'}</span>
                                        <span className="font-bold text-xl">{getProductLabel(type)}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeStep === 1 && (
                            <div className="space-y-6">
                                <h4 className="text-xl font-bold text-slate-800">Wymiary (mm)</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Szerokość</label>
                                        <input type="number" value={currentConfig.width} onChange={e => setCurrentConfig(c => ({ ...c, width: e.target.value }))} className="w-full p-4 border rounded-xl text-center text-2xl font-bold font-mono" />
                                        <div className="flex gap-1 justify-center">{[3000, 4000, 5000, 6000].map(v => <button key={v} onClick={() => setCurrentConfig(c => ({ ...c, width: v.toString() }))} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200">{v}</button>)}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Wysięg</label>
                                        <input type="number" value={currentConfig.projection} onChange={e => setCurrentConfig(c => ({ ...c, projection: e.target.value }))} className="w-full p-4 border rounded-xl text-center text-2xl font-bold font-mono" />
                                        <div className="flex gap-1 justify-center">{[2500, 3000, 3500, 4000].map(v => <button key={v} onClick={() => setCurrentConfig(c => ({ ...c, projection: v.toString() }))} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200">{v}</button>)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeStep === 2 && (
                            <div className="space-y-8">
                                {/* Details Logic */}
                                {(currentConfig.type === 'roof') && (
                                    <div className="space-y-3">
                                        <label className="section-label">Wypełnienie Dachu</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <OptionCard active={currentConfig.roofFill === 'polycarbonate'} onClick={() => setCurrentConfig(c => ({ ...c, roofFill: 'polycarbonate' }))} label="Poliwęglan" />
                                            <OptionCard active={currentConfig.roofFill === 'glass'} onClick={() => setCurrentConfig(c => ({ ...c, roofFill: 'glass' }))} label="Szkło" />
                                        </div>
                                    </div>
                                )}

                                {currentConfig.type !== 'other' && (
                                    <div className="space-y-3">
                                        <label className="section-label">Systemy Przesuwne (Ściany)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {['none', 'framed', 'frameless', 'fixed', 'aluminum'].map((wType) => {
                                                if (currentConfig.type === 'carport' && (wType === 'framed' || wType === 'frameless')) return null;
                                                const isActive = currentConfig.wallTypes?.includes(wType as WallType);
                                                return (
                                                    <button key={wType} onClick={() => {
                                                        const current = currentConfig.wallTypes || [];
                                                        const newTypes = isActive ? current.filter(t => t !== wType) : [...current, wType as WallType];
                                                        setCurrentConfig(c => ({ ...c, wallTypes: newTypes }));
                                                    }} className={`p-3 rounded-lg border text-sm font-bold transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                        {wType === 'none' ? 'Brak' : wType === 'framed' ? 'Ramowe' : wType === 'frameless' ? 'Bezramowe' : wType === 'fixed' ? 'Stałe' : 'Aluminium'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* SIDES COUNT - Logic Update */}
                                        {currentConfig.wallTypes && currentConfig.wallTypes.length > 0 && !currentConfig.wallTypes.includes('none') && (
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between animate-in slide-in-from-top-2">
                                                <span className="font-bold text-slate-700 text-sm">Ile stron zabudowy?</span>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4].map(num => (
                                                        <button
                                                            key={num}
                                                            onClick={() => setCurrentConfig(c => ({ ...c, wallSidesCount: num }))}
                                                            className={`w-10 h-10 rounded-lg font-bold border ${currentConfig.wallSidesCount === num ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                                                        >
                                                            {num}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {['roof', 'pergola'].includes(currentConfig.type!) && (
                                    <div className="space-y-3">
                                        <label className="section-label">Oświetlenie LED</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <OptionCard active={currentConfig.ledType === 'none'} onClick={() => setCurrentConfig(c => ({ ...c, ledType: 'none' }))} label="Brak" small />
                                            <OptionCard active={currentConfig.ledType === 'spot'} onClick={() => setCurrentConfig(c => ({ ...c, ledType: 'spot' }))} label="Punkty (Spot)" small />
                                            <OptionCard active={currentConfig.ledType === 'strip'} onClick={() => setCurrentConfig(c => ({ ...c, ledType: 'strip' }))} label="Taśmy (Strip)" small />
                                        </div>
                                    </div>
                                )}

                                {currentConfig.type === 'roof' && (
                                    <div className="space-y-3">
                                        <label className="section-label">Markiza Dachowa</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <OptionCard active={currentConfig.roofAwning === 'none'} onClick={() => setCurrentConfig(c => ({ ...c, roofAwning: 'none' }))} label="Brak" small />
                                            <OptionCard active={currentConfig.roofAwning === 'under'} onClick={() => setCurrentConfig(c => ({ ...c, roofAwning: 'under' }))} label="Poddachowa" small />
                                            <OptionCard active={currentConfig.roofAwning === 'over'} onClick={() => setCurrentConfig(c => ({ ...c, roofAwning: 'over' }))} label="Naddachowa" small />
                                        </div>
                                    </div>
                                )}

                                {currentConfig.type !== 'other' && (
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-700">Rolety ZIP Screen</span>
                                            <button onClick={() => setCurrentConfig(c => ({ ...c, zipEnabled: !c.zipEnabled }))} className={`w-14 h-8 rounded-full transition-colors relative ${currentConfig.zipEnabled ? 'bg-accent' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${currentConfig.zipEnabled ? 'translate-x-6' : ''}`} />
                                            </button>
                                        </div>

                                        {currentConfig.zipEnabled && (
                                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Szerokość</label>
                                                        <input value={currentConfig.zipWidth || currentConfig.width} onChange={e => setCurrentConfig(c => ({ ...c, zipWidth: e.target.value }))} className="w-full p-2 border rounded-lg text-center font-mono" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Wysokość</label>
                                                        <input value={currentConfig.zipHeight || '2500'} onChange={e => setCurrentConfig(c => ({ ...c, zipHeight: e.target.value }))} className="w-full p-2 border rounded-lg text-center font-mono" />
                                                    </div>
                                                </div>
                                                {/* ZIP SIDES COUNT */}
                                                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                                    <span className="font-bold text-slate-700 text-sm">Ilość sztuk (stron)?</span>
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4].map(num => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setCurrentConfig(c => ({ ...c, zipSidesCount: num }))}
                                                                className={`w-10 h-10 rounded-lg font-bold border ${currentConfig.zipSidesCount === num ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="section-label">Uwagi do produktu</label>
                                    <textarea value={currentConfig.notes || ''} onChange={e => setCurrentConfig(c => ({ ...c, notes: e.target.value }))} placeholder="Specyficzne wymagania..." className="w-full p-3 border rounded-xl min-h-[80px]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                        <button onClick={() => activeStep === 0 ? setIsConfiguring(false) : setActiveStep(prev => prev - 1)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">
                            {activeStep === 0 ? 'Anuluj' : 'Wstecz'}
                        </button>
                        <button onClick={() => activeStep < 2 ? setActiveStep(prev => prev + 1) : saveConfig()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black shadow-lg">
                            {activeStep < 2 ? 'Dalej' : 'Gotowe - Dodaj'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // VIEW LOADER
    switch (view) {
        case 'hub':
            return (
                <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
                    {/* HUB HEADER */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                            Konfigurator Ofertowy
                        </h2>
                        <p className="text-slate-400">Dodaj produkty, zakręć kołem i zgarnij rabat!</p>
                    </div>

                    {/* PRODUCTS LIST */}
                    <div className="space-y-4">
                        {products.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 group hover:border-accent/50 transition-colors cursor-pointer" onClick={startNewConfig}>
                                <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center text-4xl shadow-sm mb-4 group-hover:scale-110 transition-transform">➕</div>
                                <h3 className="text-xl font-bold text-slate-700">Koszyk jest pusty</h3>
                                <p className="text-slate-400 mb-6">Dodaj pierwszy produkt, aby rozpocząć</p>
                                <button className="px-8 py-3 bg-accent text-white rounded-full font-bold shadow-lg hover:bg-accent-dark">+ DODAJ PRODUKT</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {products.map((p) => (
                                    <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-accent transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl">
                                                {p.type === 'roof' ? '🏠' : p.type === 'carport' ? '🚗' : '☀️'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800">{getProductLabel(p.type)}</h4>
                                                <p className="text-sm text-slate-500 font-mono">{p.width} x {p.projection} mm</p>
                                                {/* Mini Badges */}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {p.wallTypes?.length > 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">Ściany: {p.wallSidesCount} str.</span>}
                                                    {p.zipEnabled && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">ZIP: {p.zipSidesCount} szt.</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeProduct(p.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors self-end md:self-center">Usuń</button>
                                    </div>
                                ))}
                                <button onClick={startNewConfig} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-accent hover:text-accent hover:bg-accent/5 transition-all text-lg flex items-center justify-center gap-2">
                                    <span>➕</span> Dodaj kolejny produkt
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ACTION BAR */}
                    <div className="pt-4">
                        <button
                            onClick={() => {
                                if (products.length === 0) return toast.error('Dodaj najpierw produkt!');
                                setView('wheel'); // GO TO WHEEL
                            }}
                            disabled={products.length === 0}
                            className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-2xl font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            <span>DALEJ: LOSOWANIE RABATU</span>
                            <span className="text-3xl">🎡</span>
                        </button>
                    </div>
                </div>
            );

        case 'wheel':
            return (
                <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-white mb-2">Zakręć Kołem!</h2>
                        <p className="text-slate-400">Wylosuj nagrodę dla klienta przed zapisaniem oferty.</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm p-8 rounded-full shadow-2xl ring-4 ring-white/10">
                        {/* Assuming WheelOfFortune handles its own spinning animation and calls onSpinEnd */}
                        <WheelOfFortune prizes={prizes} onSpinEnd={handleWheelSpinEnd} />
                    </div>

                    {wonPrize && (
                        <div className="mt-8 bg-green-500 text-white px-8 py-4 rounded-2xl text-2xl font-bold animate-in bounce-in">
                            WYGRANA: {wonPrize.label}!
                        </div>
                    )}

                    {!wonPrize && (
                        <div className="mt-8 text-slate-500 animate-pulse">
                            Trwa losowanie...
                        </div>
                    )}
                </div>
            );

        case 'finalize':
            return (
                <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
                    {/* SUCCESS HEADER */}
                    <div className="bg-green-50 border border-green-200 p-8 rounded-3xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-green-500/20" />
                        <span className="text-6xl mb-4 block">🎉</span>
                        <h2 className="text-2xl font-bold text-green-800">Gratulacje!</h2>
                        <p className="text-green-600 mt-2 text-lg">
                            Wylosowana nagroda: <span className="font-bold underline">{wonPrize?.label}</span>
                        </p>
                        <p className="text-sm text-green-600/70 mt-4">Uzupełnij dane, aby zapisać leada i nagrodę.</p>
                    </div>

                    {/* CONTACT FORM - Polished UI */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            Wizytówka Klienta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Imię</label>
                                <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none font-medium" placeholder="Jan" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nazwisko</label>
                                <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none font-medium" placeholder="Kowalski" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Telefon</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none font-medium font-mono text-lg" placeholder="500 600 700" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">E-mail (opcjonalnie)</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none font-medium" placeholder="jan@example.com" />
                            </div>
                        </div>

                        {/* Extra Notes */}
                        <div className="mt-6 space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Notatka Główna</label>
                            <textarea value={mainNotes} onChange={e => setMainNotes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px] focus:border-accent focus:bg-white transition-all outline-none" placeholder="Dodatkowe uwagi do zamówienia..." />
                        </div>

                        {/* Photos */}
                        <div className="mt-6">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Zdjęcia / Szkice</label>
                            <div className="flex flex-wrap gap-3">
                                <label className={`w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all ${uploading ? 'opacity-50' : ''}`}>
                                    <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                                    <span className="text-2xl text-slate-400">📷</span>
                                </label>
                                {photos.map((photo, i) => (
                                    <div key={i} className="w-24 h-24 rounded-xl bg-slate-100 relative overflow-hidden group border border-slate-200">
                                        <img src={photo.url} alt="preview" className="w-full h-full object-cover" />
                                        <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 shadow-sm">✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-6 bg-green-600 text-white text-2xl font-bold rounded-2xl shadow-xl hover:bg-green-700 transform transition-transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {loading ? 'Zapisywanie...' : '✅ ZAPISZ KOMPLETNEGO LEADA'}
                    </button>

                    <button onClick={() => setView('hub')} className="w-full text-slate-400 font-medium hover:text-slate-600 py-2">
                        Wróć do edycji produktów (Zachowaj nagrodę)
                    </button>
                </div>
            );
    }

    // Fallback
    return null;
};

// --- UI Helpers ---
const OptionCard = ({ active, onClick, label, small }: { active: boolean, onClick: () => void, label: string, small?: boolean }) => (
    <button onClick={onClick} className={`rounded-xl border transition-all ${small ? 'p-3 text-sm' : 'p-4'} ${active ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-600 border-slate-200'}`}>
        <div className="font-bold">{label}</div>
    </button>
);
