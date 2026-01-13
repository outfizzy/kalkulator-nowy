import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database';
import { FairService, type Prize } from '../../services/database/fair.service';
import { UserService } from '../../services/database/user.service';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { generateFairPDF } from '../../utils/fairPdfGenerator';
import { WheelOfFortune } from './WheelOfFortune';
import {
    Home, Sun, Car, Wrench, Blinds, PanelLeft, Plug,
    MessageSquare, User as UserIcon, MapPin,
    Tent, CheckCircle2, ChevronRight, X, Phone, Mail, Image as ImageIcon,
    ClipboardList, HelpCircle, PlusCircle
} from 'lucide-react';
import type { FairProductConfig, User } from '../../types';

interface FairLeadFormProps {
    fairId: string;
    fairName: string;
    onSaved: (leadId: string, leadName: string, prizeLabel?: string) => void;
}

export const FairLeadForm: React.FC<FairLeadFormProps> = ({ fairId, fairName, onSaved }) => {
    const { currentUser } = useAuth();

    // --- STATE ---
    // Steps: 1. Hub (Products) -> 2. Interview -> 3. Finalize (Data) -> 4. Wheel (Prize & Save)
    const [viewMode, setViewMode] = useState<'hub' | 'config' | 'interview' | 'finalize' | 'wheel'>('hub');

    const [prizes, setPrizes] = useState<Prize[]>([]);

    // Main Lead Data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    // Optional Address (User Request)
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [address, setAddress] = useState('');
    const [mainNotes, setMainNotes] = useState('');
    const [conversationSummary, setConversationSummary] = useState(''); // New: Conversation summary

    // Products
    const [products, setProducts] = useState<FairProductConfig[]>([]);

    // Additional Info (Questions & Next Steps) - Now Step 2
    const [clientQuestions, setClientQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [nextActions, setNextActions] = useState<string[]>([]);

    // Config Wizard State
    const [currentConfig, setCurrentConfig] = useState<Partial<FairProductConfig>>({});

    // Uploads
    const [photos, setPhotos] = useState<{ url: string, name: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    // Rep Assignment State
    const [assignees, setAssignees] = useState<User[]>([]);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');

    // Fetch Prizes & Assignees on mount
    useEffect(() => {
        const loadData = async () => {
            // Prizes
            const list = await FairService.getPrizes(fairId);
            setPrizes(list);

            // Assignees (Only if Admin/Manager)
            if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
                try {
                    const reps = await UserService.getSalesReps();
                    // Or get all active users if needed, but reps specifically for assignments
                    setAssignees(reps.filter(u => u.status === 'active'));
                } catch (e) {
                    console.error('Failed to load reps', e);
                }
            }
        };
        loadData();
    }, [fairId, currentUser?.role]);

    // Init selectedAssignee to current user
    useEffect(() => {
        if (currentUser) setSelectedAssigneeId(currentUser.id);
    }, [currentUser]);

    // --- ACTIONS ---

    const saveConfig = () => {
        // Validation for different types
        if (currentConfig.type) {
            // For accessories/other, we might not need dims
            if (['accessory', 'other'].includes(currentConfig.type!) || (currentConfig.width && currentConfig.projection)) {
                setProducts(prev => [...prev, currentConfig as FairProductConfig]);
                setViewMode('hub');
                setCurrentConfig({});
                toast.success('Produkt dodany do listy');
            } else {
                toast.error('Uzupełnij wymiary');
            }
        }
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

    const handleWheelSpin = async (prize: Prize) => {
        // ATOMIC SAVE: Wheel stores the prize, then triggers save immediately
        await handleSubmit(prize);
    };

    const generateNotes = (winningPrize?: Prize) => {
        const parts = [];

        // 0. Header
        parts.push(`# 🏛️ Targi: ${fairName}`);

        // 1. Prize
        if (winningPrize) {
            parts.push(`🎉 **NAGRODA (Koło Fortuny)**: ${winningPrize.label.toUpperCase()}`);
            parts.push('---');
        }

        // 2. Products
        parts.push(`## Produkty (${products.length})`);

        products.forEach((p, index) => {
            parts.push(`\n### ${index + 1}. ${getProductLabel(p.type)}`);

            if (p.width && p.projection) {
                parts.push(`- **Wymiary**: ${p.width} x ${p.projection} mm`);
            }

            if (p.type === 'roof' || p.type === 'pergola') {
                if (p.type === 'roof') parts.push(`- **Wypełnienie**: ${p.roofFill === 'glass' ? 'Szkło' : 'Poliwęglan'}`);
                if (p.roofAwning && p.roofAwning !== 'none') parts.push(`- **Markiza Dachowa**: ${p.roofAwning === 'over' ? 'Naddachowa' : 'Poddachowa'}`);
            }

            if (p.wallTypes && p.wallTypes.length > 0) {
                const walls = p.wallTypes.map(w => w === 'framed' ? 'Ramowe' : w === 'frameless' ? 'Bezramowe' : w === 'fixed' ? 'Stałe' : w === 'aluminum' ? 'Aluminium' : 'Brak').join(', ');
                parts.push(`- **Ściany**: ${walls} (Ilość stron: ${p.wallSidesCount || 1})`);
            }

            // Standalone Glass
            if (p.type === 'sliding_glass') {
                parts.push(`- **System**: ${p.wallTypes?.join(', ') || 'Standard'}`);
                parts.push(`- **Ilość stron**: ${p.wallSidesCount || 1}`);
            }

            if (p.ledType && p.ledType !== 'none') {
                parts.push(`- **LED**: ${p.ledType === 'spot' ? 'Punkty (Spot)' : 'Taśmy (Strip)'}`);
            }

            // Standalone ZIP or Addon
            if (p.zipEnabled || p.type === 'zip_screen') {
                parts.push(`- **ZIP Screen**: TAK${p.zipWidth ? ` (${p.zipWidth}x${p.zipHeight || '-'})` : ''} - Ilość sztuk: ${p.zipSidesCount || 1}`);
            }

            if (p.notes) parts.push(`- *Uwagi*: ${p.notes}`);
        });

        if (clientQuestions.length > 0) {
            parts.push('\n## ❓ Pytania od Klienta / Do Sprawdzenia');
            clientQuestions.forEach(q => parts.push(`- [ ] ${q}`));
        }

        if (nextActions.length > 0) {
            parts.push('\n## 👉 Rekomendowane Działania');
            nextActions.forEach(a => parts.push(`- [ ] ${a}`));
        }

        if (photos.length) parts.push(`\n## Załączniki\n- Ilość zdjęć: ${photos.length}`);
        if (conversationSummary) parts.push(`\n## 💬 Podsumowanie Rozmowy\n${conversationSummary}`);
        if (mainNotes) parts.push(`\n## Notatka Główna\n${mainNotes}`);

        return parts.join('\n');
    };

    const validateFinalize = () => {
        if (!firstName || !lastName || !phone) {
            if (!firstName) toast.error('❌ Podaj imię klienta');
            else if (!lastName) toast.error('❌ Podaj nazwisko klienta');
            else if (!phone) toast.error('❌ Podaj numer telefonu klienta');
            return false;
        }
        if (phone.length < 9) {
            toast.error('❌ Numer telefonu jest za krótki (minimum 9 cyfr)');
            return false;
        }
        return true;
    }

    const handleSubmit = async (prize: Prize) => {
        // Final Validation handled by caller or pre-check
        // But we check again just in case
        if (!firstName || !lastName || !phone) {
            toast.error('⚠️ Wypełnij imię, nazwisko i telefon klienta');
            return;
        }

        setLoading(true);
        try {
            const notes = generateNotes(prize);

            // Generate Lead - Pattern 130: Full Fair Integration
            const lead = await DatabaseService.createLead({
                // [CRITICAL] Do NOT override city with Fair Name. Use user input.
                customerData: {
                    firstName,
                    lastName,
                    phone,
                    email,
                    city: city || '',      // Use input or empty
                    postalCode: zip || '', // Use input or empty
                    address: address || '', // Street / House Number
                    companyName: ''
                },
                source: 'targi',
                status: 'fair',
                assignedTo: selectedAssigneeId || currentUser?.id, // Logic: Use selected (if admin) or self
                notes: notes,
                fairId: fairId,
                fairMessage: `Targi: ${fairName}`, // Store source info here if needed by backend, or relies on fairId
                fairPhotos: photos,
                fairPrize: prize,
                fairProducts: products
            });

            if (lead) {
                // Generate PDF Backup
                try {
                    generateFairPDF({
                        firstName,
                        lastName,
                        phone,
                        email,
                        notes: mainNotes,
                        wonPrize: prize,
                        photos
                    }, products, currentUser?.username || 'Handlowiec');
                    toast.success('✅ Pobrano PDF z potwierdzeniem');
                } catch (pdfErr) {
                    console.error('PDF Gen Error', pdfErr);
                    toast.error('⚠️ Nie udało się wygenerować PDF (lead zapisany!)');
                }

                // Small delay to show the prize win effect before closing
                setTimeout(() => {
                    onSaved(lead.id, `${firstName} ${lastName}`, prize?.label);
                }, 1500);
            }
        } catch (error) {
            console.error('Fair Lead Save Error:', error);

            // User-friendly error messages
            const message = error instanceof Error ? error.message : 'Nieznany błąd';

            if (message.includes('constraint') || message.includes('violates')) {
                toast.error('❌ Błąd walidacji danych. Sprawdź czy wszystkie pola są poprawnie wypełnione.');
            } else if (message.includes('fair_id') || message.includes('fairs')) {
                toast.error('❌ Błąd konfiguracji targów - skontaktuj się z administratorem.');
            } else if (message.includes('auth') || message.includes('authenticated')) {
                toast.error('❌ Błąd autoryzacji. Spróbuj się wylogować i zalogować ponownie.');
            } else if (message.includes('RLS') || message.includes('policy')) {
                toast.error('❌ Brak uprawnień do zapisania leada. Skontaktuj się z managerem.');
            } else {
                toast.error(`❌ Nie udało się zapisać leada!\n${message.substring(0, 100)}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const getProductLabel = (type: string) => {
        switch (type) {
            case 'roof': return 'Zadaszenie Aluminiowe';
            case 'pergola': return 'Pergola / Deluxe';
            case 'carport': return 'Carport';
            case 'zip_screen': return 'ZIP Screen (Solo)';
            case 'sliding_glass': return 'Szyby Przesuwne (Solo)';
            case 'accessory': return 'Akcesoria';
            case 'other': return 'Inne';
            default: return type;
        }
    };

    // --- UI HELPERS ---
    const ProgressBar = () => {
        const steps = [
            { id: 'hub', label: '1. Produkty' },
            { id: 'interview', label: '2. Wywiad' },
            { id: 'finalize', label: '3. Dane' },
            { id: 'wheel', label: '4. Finał' }
        ];

        // Find current step index (config is sub-step of hub)
        const currentId = viewMode === 'config' ? 'hub' : viewMode;
        const currentIndex = steps.findIndex(s => s.id === currentId);

        return (
            <div className="flex justify-between items-center mb-6 px-4">
                {steps.map((step, idx) => {
                    const isActive = idx === currentIndex;
                    const isPast = idx < currentIndex;
                    return (
                        <div key={step.id} className={`flex items-center gap-2 ${isActive ? 'text-slate-900 font-bold' : isPast ? 'text-green-600' : 'text-slate-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${isActive ? 'border-slate-900 bg-white' : isPast ? 'border-green-600 bg-green-50' : 'border-slate-200'}`}>
                                {isPast ? '✓' : idx + 1}
                            </div>
                            <span className="hidden md:block">{step.label}</span>
                            {idx < steps.length - 1 && <div className={`w-12 h-0.5 mx-2 ${isPast ? 'bg-green-600' : 'bg-slate-200'}`} />}
                        </div>
                    )
                })}
            </div>
        )
    }

    // --- RENDERERS ---

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* CLEAN STICKY HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    {/* Top Row: Fair Info + Close */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-700">
                                <Tent className="w-6 h-6" />
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                                <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 leading-tight">{fairName}</h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">Formularz Leada</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Indicator - Desktop */}
                    {viewMode !== 'wheel' && (
                        <div className="hidden md:flex items-center justify-center gap-2">
                            {['Produkty', 'Wywiad', 'Dane', 'Nagroda'].map((label, i) => {
                                const step = i + 1;
                                const currentStep = viewMode === 'hub' || viewMode === 'config' ? 1 :
                                    viewMode === 'interview' ? 2 :
                                        viewMode === 'finalize' ? 3 : 4;
                                const completed = step < currentStep;
                                const active = step === currentStep;

                                return (
                                    <React.Fragment key={i}>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${completed ? 'bg-emerald-500 text-white shadow-sm' :
                                                active ? 'bg-slate-800 text-white shadow-md ring-4 ring-slate-100' :
                                                    'bg-white text-slate-300 border border-slate-200'
                                                }`}>
                                                {completed ? '✓' : step}
                                            </div>
                                            <span className={`text-xs font-semibold transition-colors ${active ? 'text-blue-600' : completed ? 'text-emerald-600' : 'text-slate-400'
                                                }`}>
                                                {label}
                                            </span>
                                        </div>
                                        {i < 3 && (
                                            <div className={`w-16 h-0.5 rounded-full mb-5 transition-all duration-500 ${step < currentStep ? 'bg-emerald-500' : 'bg-slate-100'
                                                }`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* Progress Bar - Mobile */}
                    {viewMode !== 'wheel' && (
                        <div className="md:hidden">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                                <span>Krok {viewMode === 'hub' || viewMode === 'config' ? 1 : viewMode === 'interview' ? 2 : viewMode === 'finalize' ? 3 : 4} z 4</span>
                                <span className="text-blue-600">{Math.round(((viewMode === 'hub' || viewMode === 'config' ? 1 : viewMode === 'interview' ? 2 : viewMode === 'finalize' ? 3 : 4) / 4) * 100)}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-slate-800 transition-all duration-500 ease-out"
                                    style={{ width: `${((viewMode === 'hub' || viewMode === 'config' ? 1 : viewMode === 'interview' ? 2 : viewMode === 'finalize' ? 3 : 4) / 4) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT - COMPACT PROFESSIONAL WIDTH */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

                {/* VIEW: HUB (Product Selection) */}
                {viewMode === 'hub' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-semibold text-slate-900">Biblioteka Produktów</h3>
                            <p className="text-slate-500 mt-1">Wybierz kategorię aby skonfigurować produkt.</p>
                        </div>

                        {/* UNIFIED PRO GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* ROOF */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'roof' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Home className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Zadaszenie</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Systemy aluminiowe z wypełnieniem szklanym lub poliwęglanowym.</p>
                            </button>

                            {/* PERGOLA */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'pergola' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Sun className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Pergola</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Bioklimatyczne pergole lamelowe oraz systemy materiałowe.</p>
                            </button>

                            {/* CARPORT */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'carport' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Car className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Carport</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Wiaty garażowe wolnostojące oraz przyścienne.</p>
                            </button>

                            {/* GLASS (SOLO) */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'sliding_glass' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <PanelLeft className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Zabudowa</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Systemy przesuwne (ramowe/bezramowe) do gotowych konstrukcji.</p>
                            </button>

                            {/* ZIP (SOLO) */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'zip_screen' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Blinds className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Rolety ZIP</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Osłony przeciwsłoneczne typu screen do okien i tarasów.</p>
                            </button>

                            {/* ACCESSORIES */}
                            <button onClick={() => { setCurrentConfig(c => ({ ...c, type: 'accessory' })); setViewMode('config'); }}
                                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left flex flex-col items-start">
                                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Plug className="w-6 h-6" />
                                </div>
                                <h4 className="font-semibold text-slate-900 text-lg mb-1">Akcesoria</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Promienniki ciepła, oświetlenie LED, czujniki pogodowe.</p>
                            </button>
                        </div>


                        {/* ACTION BAR */}
                        <div className="pt-6 border-t border-slate-200 sticky bottom-0 bg-slate-50 pb-4">
                            <div className="flex justify-between items-center shadow-lg bg-white p-4 rounded-xl border border-slate-200">
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">Lista wyboru ({products.length})</h4>
                                    <div className="text-xs text-slate-500">{products.length === 0 ? 'Dodaj produkt' : 'Gotowe do wyceny'}</div>
                                </div>
                                <button
                                    onClick={() => setViewMode('interview')}
                                    disabled={products.length === 0}
                                    className="px-6 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm shadow-sm transition-all flex items-center gap-2"
                                >
                                    Dalej
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* MINI PREVIEW */}
                            {products.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {products.map((p, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
                                            <span className="text-xs font-mono text-slate-400">#{i + 1}</span>
                                            <span className="text-xs font-medium text-slate-700">{getProductLabel(p.type)}</span>
                                            {p.width && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 ml-1">{p.width}mm</span>}
                                            <button onClick={() => setProducts(curr => curr.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600 ml-1">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW: CONFIG (Product Details) */}
                {viewMode === 'config' && (
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={() => { setViewMode('hub'); setCurrentConfig({}); }}
                            className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 px-3 py-2 hover:bg-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Wróć do wyboru
                        </button>

                        <div className="bg-white w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">
                                    Konfiguracja: {getProductLabel(currentConfig.type || 'Produkt')}
                                </h3>
                                <button onClick={() => setViewMode('hub')} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                                {/* DYNAMIC SECTIONS BASED ON TYPE */}

                                {/* 1. Dimensions (For Roof, Pergola, Carport, Zip, Glass) */}
                                {['roof', 'pergola', 'carport', 'zip_screen', 'sliding_glass'].includes(currentConfig.type!) && (
                                    <div className="space-y-6 mb-8">
                                        <h4 className="text-xl font-bold text-slate-800">Wymiary (mm)</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Szerokość</label>
                                                <input type="number"
                                                    value={currentConfig.width || ''}
                                                    onChange={e => setCurrentConfig(c => ({ ...c, width: e.target.value }))}
                                                    className="w-full p-4 border rounded-xl text-center text-2xl font-bold font-mono" />
                                                <div className="flex gap-2 justify-center">{[3000, 4000, 5000].map(v => <button key={v} onClick={() => setCurrentConfig(c => ({ ...c, width: v.toString() }))} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100">{v}</button>)}</div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    {currentConfig.type === 'zip_screen' || currentConfig.type === 'sliding_glass' ? 'Wysokość' : 'Wysięg'}
                                                </label>
                                                <input type="number"
                                                    value={currentConfig.projection || ''}
                                                    onChange={e => setCurrentConfig(c => ({ ...c, projection: e.target.value }))}
                                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                                                <div className="flex gap-2 justify-center">{[2500, 3000, 3500].map(v => <button key={v} onClick={() => setCurrentConfig(c => ({ ...c, projection: v.toString() }))} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100">{v}</button>)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Roof Fill (Roof Only) */}
                                {currentConfig.type === 'roof' && (
                                    <div className="space-y-3 mb-8">
                                        <label className="text-sm font-semibold text-slate-900 block border-b border-slate-100 pb-2">Wypełnienie Dachu</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <OptionCard active={currentConfig.roofFill === 'polycarbonate'} onClick={() => setCurrentConfig(c => ({ ...c, roofFill: 'polycarbonate' }))} label="Poliwęglan" />
                                            <OptionCard active={currentConfig.roofFill === 'glass'} onClick={() => setCurrentConfig(c => ({ ...c, roofFill: 'glass' }))} label="Szkło" />
                                        </div>
                                    </div>
                                )}

                                {/* 3. Walls (Roof, Pergola, Sliding Glass) */}
                                {['roof', 'pergola'].includes(currentConfig.type!) && (
                                    <div className="space-y-3 mb-8">
                                        <label className="text-sm font-semibold text-slate-900 block border-b border-slate-100 pb-2">Ściany / Zabudowa</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {['none', 'framed', 'frameless', 'fixed', 'aluminum'].map((wType) => {
                                                const isActive = currentConfig.wallTypes?.includes(wType);
                                                return (
                                                    <button key={wType} onClick={() => {
                                                        const current = currentConfig.wallTypes || [];
                                                        const newTypes = isActive ? current.filter(t => t !== wType) : [...current, wType];
                                                        setCurrentConfig(c => ({ ...c, wallTypes: newTypes }));
                                                    }} className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                                                        {wType === 'none' ? 'Brak' : wType === 'framed' ? 'Ramowe' : wType === 'frameless' ? 'Bezramowe' : wType === 'fixed' ? 'Stałe' : 'Aluminium'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 3b. Sliding Glass Specific */}
                                {currentConfig.type === 'sliding_glass' && (
                                    <div className="space-y-3 mb-8">
                                        <label className="text-sm font-semibold text-slate-900 block border-b border-slate-100 pb-2">Typ Systemu</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {['framed', 'frameless', 'fixed'].map((wType) => {
                                                const isActive = currentConfig.wallTypes?.includes(wType);
                                                return (
                                                    <button key={wType} onClick={() => {
                                                        const current = currentConfig.wallTypes || [];
                                                        const newTypes = isActive ? current.filter(t => t !== wType) : [...current, wType];
                                                        setCurrentConfig(c => ({ ...c, wallTypes: newTypes }));
                                                    }} className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                                                        {wType === 'framed' ? 'Ramowe' : wType === 'frameless' ? 'Bezramowe' : 'Stałe'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <label className="text-sm font-medium text-slate-600">Ilość stron / odcinków:</label>
                                            <input type="number" value={currentConfig.wallSidesCount || 1} onChange={e => setCurrentConfig(c => ({ ...c, wallSidesCount: parseInt(e.target.value) }))} className="w-20 p-2 border border-slate-300 rounded-md text-center font-semibold" />
                                        </div>
                                    </div>
                                )}


                                {/* 4. ZIP Screens (Roof, Pergola - toggle; Zip Standalone - implied) */}
                                {['roof', 'pergola'].includes(currentConfig.type!) && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-slate-900">Rolety ZIP Screen</span>
                                            <button onClick={() => setCurrentConfig(c => ({ ...c, zipEnabled: !c.zipEnabled }))} className={`w-12 h-6 rounded-full transition-colors relative ${currentConfig.zipEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${currentConfig.zipEnabled ? 'translate-x-6' : ''}`} />
                                            </button>
                                        </div>
                                        {currentConfig.zipEnabled && (
                                            <div className="flex items-center gap-3">
                                                <label className="text-sm text-slate-600">Ilość rolet:</label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4].map(n =>
                                                        <button key={n} onClick={() => setCurrentConfig(c => ({ ...c, zipSidesCount: n }))}
                                                            className={`w-8 h-8 flex items-center justify-center rounded border ${currentConfig.zipSidesCount === n ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}>{n}</button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 5. Common Notes */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-900">Uwagi do produktu</label>
                                    <textarea value={currentConfig.notes || ''} onChange={e => setCurrentConfig(c => ({ ...c, notes: e.target.value }))} placeholder="Dodatkowe informacje..." className="w-full p-3 border border-slate-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                                <button onClick={saveConfig} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black shadow-lg">
                                    Gotowe - Dodaj Produkt
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: INTERVIEW (Questions & Next Actions) */}
                {viewMode === 'interview' && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div>
                            <h3 className="text-2xl font-semibold text-slate-900">Wywiad</h3>
                            <p className="text-slate-500 mt-1">Szybka weryfikacja potrzeb i ustalenie kolejnych kroków.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Client Questions */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-slate-400" />
                                    Pytania Kluczowe
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            value={newQuestion}
                                            onChange={e => setNewQuestion(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newQuestion.trim()) {
                                                    setClientQuestions(prev => [...prev, newQuestion.trim()]);
                                                    setNewQuestion('');
                                                }
                                            }}
                                            placeholder="Dodaj pytanie/uwagę..."
                                            className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                if (newQuestion.trim()) {
                                                    setClientQuestions(prev => [...prev, newQuestion.trim()]);
                                                    setNewQuestion('');
                                                }
                                            }}
                                            className="bg-slate-100 text-slate-600 px-3.5 rounded-lg font-medium hover:bg-slate-200"
                                        >
                                            +
                                        </button>
                                    </div>
                                    {/* List */}
                                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                                        {clientQuestions.map((q, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 group">
                                                <span className="text-slate-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                                                <span className="flex-1 text-sm text-slate-700 leading-snug">{q}</span>
                                                <button onClick={() => setClientQuestions(curr => curr.filter((_, idx) => idx !== i))} className="text-slate-300 group-hover:text-red-500 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {clientQuestions.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                                Brak dodanych pytań
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Next Actions */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-slate-400" />
                                    Działania
                                </h4>
                                <div className="space-y-2">
                                    {[
                                        'Wysłać Katalog PDF',
                                        'Wycena Wstępna',
                                        'Umówić Pomiar',
                                        'Kontakt Telefoniczny',
                                        'Pilny Lead 🔥'
                                    ].map(action => {
                                        const active = nextActions.includes(action);
                                        return (
                                            <button
                                                key={action}
                                                onClick={() => {
                                                    setNextActions(prev =>
                                                        active ? prev.filter(a => a !== action) : [...prev, action]
                                                    );
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-3 ${active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center bg-white ${active ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-transparent'}`}>
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                                {action}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-slate-200">
                            <button onClick={() => setViewMode('hub')} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
                                ← Wróć
                            </button>
                            <button onClick={() => setViewMode('finalize')} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium shadow-sm hover:bg-black transition-all">
                                Dane Klienta →
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW: FINALIZE (Data & Photos) */}
                {viewMode === 'finalize' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* CONTACT FORM - Pro Clean */}
                        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-200 shadow-sm">
                            <div className="mb-6 border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-semibold text-slate-800">Dane Klienta</h3>
                                <p className="text-sm text-slate-500">Uzupełnij wymagane informacje kontaktowe.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Imię *</label>
                                    <input autoFocus value={firstName} onChange={e => setFirstName(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 shadow-sm placeholder:text-slate-400"
                                        placeholder="Jan" />
                                </div>

                                <div className="group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2.5 flex items-center gap-1.5"><UserIcon size={14} /> Nazwisko *</label>
                                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 text-base md:text-lg lg:text-xl bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-blue-50/20 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-semibold text-slate-800 shadow-sm placeholder:text-slate-300 group-hover:border-slate-300" placeholder="Kowalski" />
                                </div>
                                <div className="group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2.5 flex items-center gap-1.5"><Phone size={14} /> Telefon *</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 md:px-5 md:py-4 text-base md:text-lg lg:text-xl bg-white border-2 border-slate-200 rounded-2xl focus:border-green-500 focus:bg-green-50/20 focus:ring-4 focus:ring-green-100 transition-all outline-none font-mono font-bold text-slate-800 shadow-sm placeholder:text-slate-300 placeholder:font-sans group-hover:border-slate-300" placeholder="+48 500 600 700" />
                                    <div className="text-xs text-slate-400 mt-2 ml-1">Min. 9 cyfr</div>
                                </div>
                                <div className="group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2.5 flex items-center gap-1.5"><Mail size={14} /> E-mail <span className="text-slate-300">(opcjonalnie)</span></label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 text-base md:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:border-purple-500 focus:bg-purple-50/20 focus:ring-4 focus:ring-purple-100 transition-all outline-none font-medium text-slate-800 shadow-sm placeholder:text-slate-300 group-hover:border-slate-300" placeholder="jan@example.com" />
                                </div>
                            </div>

                            {/* Optional Address Section */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-slate-600 uppercase flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-slate-400" /> Adres Klienta
                                    </h4>
                                    <span className="text-xs bg-slate-200 px-2.5 py-1 rounded-full font-semibold text-slate-500">Opcjonalne</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div className="md:col-span-5">
                                        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ulica i numer (np. Hauptstraße 15)" className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-slate-50 transition-all outline-none text-slate-700" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input value={zip} onChange={e => setZip(e.target.value)} placeholder="PLZ (00-000)" className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-slate-50 transition-all outline-none text-slate-700 font-mono" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Stadt (Berlin, Hamburg...)" className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-slate-50 transition-all outline-none text-slate-700" />
                                    </div>
                                </div>
                            </div>

                            {/* GERMAN HELPER PHRASES - NEW SECTION */}
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-xl shadow-sm">
                                        🇩🇪
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-amber-900">Hilfreiche Fragen (Deutsch)</h4>
                                        <p className="text-xs text-amber-600">Pytania pomocnicze po niemiecku</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {[
                                        { de: 'Wie groß soll die Überdachung sein?', pl: 'Jak duże ma być zadaszenie?' },
                                        { de: 'Wünschen Sie Seitenwände?', pl: 'Czy chcą Państwo ściany boczne?' },
                                        { de: 'Mit oder ohne Beleuchtung?', pl: 'Z oświetleniem czy bez?' },
                                        { de: 'Haben Sie eine Baugenehmigung?', pl: 'Czy mają Państwo pozwolenie na budowę?' },
                                        { de: 'Wo soll es installiert werden?', pl: 'Gdzie ma być zainstalowane?' },
                                        { de: 'Bis wann brauchen Sie das?', pl: 'Do kiedy Państwo tego potrzebują?' }
                                    ].map((phrase, i) => (
                                        <div key={i} className="bg-white p-3 rounded-xl border border-amber-100 hover:border-amber-300 transition-all group cursor-default">
                                            <div className="font-semibold text-slate-700 mb-1">{phrase.de}</div>
                                            <div className="text-xs text-slate-400 italic">{phrase.pl}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CONVERSATION SUMMARY - NEW FIELD */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-md">
                                <label className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 block flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Podsumowanie Rozmowy
                                    <span className="text-xs text-blue-400 font-normal normal-case">(Co ustalono z klientem?)</span>
                                </label>
                                <textarea
                                    value={conversationSummary}
                                    onChange={e => setConversationSummary(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-blue-50/30 border border-blue-200 rounded-xl min-h-[120px] 
                                               focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 
                                               transition-all outline-none text-slate-700 resize-none
                                               placeholder:text-blue-300"
                                    placeholder="Klient zainteresowany dużym zadaszeniem z zabudową boczną. Preferuje montaż w kwietniu. Czeka na wycenę..."
                                />
                                <div className="text-xs text-blue-500 mt-2 ml-1">💡 To pole pojawi się w notatkach leada</div>
                            </div>

                            {/* Extra Notes */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2.5 block flex items-center gap-1.5">
                                    <ClipboardList className="w-4 h-4" />
                                    Notatki Dodatkowe
                                </label>
                                <textarea value={mainNotes} onChange={e => setMainNotes(e.target.value)} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl min-h-[90px] focus:border-slate-400 focus:bg-slate-50 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-700 resize-none placeholder:text-slate-400" placeholder="Specjalne wymagania, uwagi techniczne..." />
                            </div>

                            {/* Photos */}
                            <div className="mt-6">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Zdjęcia / Szkice</label>
                                <div className="flex flex-wrap gap-3">
                                    <label className={`w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all ${uploading ? 'opacity-50' : ''}`}>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                                        <ImageIcon className="w-8 h-8 text-slate-300" />
                                    </label>
                                    {photos.map((photo, i) => (
                                        <div key={i} className="w-24 h-24 rounded-xl bg-slate-100 relative overflow-hidden group border border-slate-200">
                                            <img src={photo.url} alt="preview" className="w-full h-full object-cover" />
                                            <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 shadow-sm">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            {/* ASSIGNMENT DROPDOWN (Admin/Manager Only) */}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && assignees.length > 0 && (
                                <div className="mt-8 bg-slate-100 p-4 rounded-xl border border-slate-200">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                        🛡️ Panel Managera: Przypisz Opiekuna
                                    </label>
                                    <select
                                        value={selectedAssigneeId}
                                        onChange={e => setSelectedAssigneeId(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-slate-300 bg-white font-medium"
                                    >
                                        <option value={currentUser?.id}>Ja ({currentUser?.firstName} {currentUser?.lastName})</option>
                                        {assignees.filter(a => a.id !== currentUser?.id).map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.firstName} {u.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">Lead trafi bezpośrednio do lejka wybranego handlowca.</p>
                                </div>
                            )}

                            {/* NAV BUTTONS */}
                            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
                                <button onClick={() => setViewMode('interview')} className="text-slate-500 hover:text-slate-800 px-4 py-2">
                                    ← Wróć
                                </button>
                                <button
                                    onClick={() => {
                                        if (validateFinalize()) {
                                            setViewMode('wheel');
                                        }
                                    }}
                                    className="flex-1 md:flex-none ml-4 px-6 md:px-8 py-4 bg-green-600 text-white text-lg md:text-xl font-bold rounded-2xl shadow-xl hover:bg-green-700 transform transition-transform active:scale-[0.99] flex items-center justify-center gap-3"
                                >
                                    Dalej: Koło Fortuny 🎁
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: WHEEL (Final) */}
                {viewMode === 'wheel' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        {loading ? (
                            <div className="text-center">
                                <div className="text-6xl mb-4 animate-bounce">💾</div>
                                <h2 className="text-2xl font-bold text-slate-800">Zapisywanie Leada...</h2>
                                <p className="text-slate-500">Chwilka, generuję PDF i wysyłam do bazy.</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Zakręć aby zapisać!</h2>
                                <p className="text-slate-500 mb-8">Wylosowana nagroda zostanie przypisana do klienta.</p>
                                <WheelOfFortune prizes={prizes} onSpinEnd={handleWheelSpin} />
                                <button onClick={() => handleWheelSpin({ id: 'none', label: 'Brak', type: 'none', value: 0 })} className="mt-8 text-slate-300 hover:text-slate-500 text-sm underline">
                                    Pomiń losowanie (Zapisz bez nagrody)
                                </button>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div >
    );
};

// --- UI Helpers ---
const OptionCard = ({ active, onClick, label, small }: { active: boolean, onClick: () => void, label: string, small?: boolean }) => (
    <button onClick={onClick} className={`rounded-xl border transition-all ${small ? 'p-3 text-sm' : 'p-4'} ${active ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-600 border-slate-200'}`}>
        <div className="font-bold">{label}</div>
    </button>
);
