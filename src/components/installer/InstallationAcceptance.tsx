import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';
import { DatabaseService } from '../../services/database';
import { InstallationService } from '../../services/database/installation.service';
import { StorageService } from '../../services/database/storage.service';
import { supabase } from '../../lib/supabase';
import type { Installation } from '../../types';

type InstallerChoice = 'complete' | 'service' | 'followup';

type ChecklistKey = 'structureIntegrity' | 'materialQuality' | 'functionalityTest' | 'cleaningCompleted' | 'clientInstructed' | 'warrantyProvided';

const CHECKLIST_ITEMS: { key: ChecklistKey; label: string; icon: string }[] = [
    { key: 'structureIntegrity', label: 'Konstrukcja zamontowana poprawnie', icon: '🏗️' },
    { key: 'materialQuality', label: 'Jakość materiałów bez zastrzeżeń', icon: '✨' },
    { key: 'functionalityTest', label: 'Test funkcjonalności przeprowadzony', icon: '⚙️' },
    { key: 'cleaningCompleted', label: 'Stanowisko posprzątane', icon: '🧹' },
    { key: 'clientInstructed', label: 'Klient poinstruowany o użytkowaniu', icon: '📋' },
    { key: 'warrantyProvided', label: 'Dokumentacja gwarancyjna przekazana', icon: '📄' },
];

export const InstallationAcceptance: React.FC = () => {
    const { installationId } = useParams<{ installationId: string }>();
    const navigate = useNavigate();
    const signatureRef = useRef<SignatureCanvas>(null);

    const [installation, setInstallation] = useState<Installation | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [hasContract, setHasContract] = useState(false);

    // Form State
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
        structureIntegrity: false,
        materialQuality: false,
        functionalityTest: false,
        cleaningCompleted: false,
        clientInstructed: false,
        warrantyProvided: false,
    });
    const [installerChoice, setInstallerChoice] = useState<InstallerChoice>('complete');
    const [serviceDescription, setServiceDescription] = useState('');

    useEffect(() => {
        loadInstallation();
    }, [installationId]);

    const loadInstallation = async () => {
        if (!installationId) return;
        try {
            const installations = await DatabaseService.getInstallations();
            const inst = installations.find(i => i.id === installationId);
            if (!inst) {
                toast.error('Instalacja nie znaleziona');
                navigate('/installer');
                return;
            }

            setInstallation(inst);
            setHasContract(!!(inst.offerId || inst.contractNumber));

            // If acceptance already exists, enter edit mode
            if (inst.acceptance) {
                setIsEditMode(true);
                setClientName(inst.acceptance.clientName || '');
                setNotes(inst.acceptance.notes || '');
                if (inst.acceptance.photos && Array.isArray(inst.acceptance.photos)) {
                    setPhotos(inst.acceptance.photos);
                }
                // Restore checklist from completionReport if available
                if ((inst as any).completionReport?.checklist) {
                    setChecklist((inst as any).completionReport.checklist);
                } else {
                    // Already accepted = assume all checked
                    setChecklist({
                        structureIntegrity: true,
                        materialQuality: true,
                        functionalityTest: true,
                        cleaningCompleted: true,
                        clientInstructed: true,
                        warrantyProvided: true,
                    });
                }
            } else {
                setClientName(`${inst.client.firstName} ${inst.client.lastName}`);

                // Merge dashboard photos from Supabase storage into acceptance gallery
                try {
                    const { data: files } = await supabase.storage
                        .from('fuel-logs')
                        .list(`installation-photos/${inst.id}`, { limit: 30 });
                    if (files && files.length > 0) {
                        const dashboardPhotos = files.map(f =>
                            supabase.storage.from('fuel-logs').getPublicUrl(`installation-photos/${inst.id}/${f.name}`).data.publicUrl
                        );
                        setPhotos(prev => {
                            const merged = [...prev];
                            dashboardPhotos.forEach(url => {
                                if (!merged.includes(url)) merged.push(url);
                            });
                            return merged;
                        });
                    }
                } catch { /* non-blocking */ }
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !installationId) return;

        const files = Array.from(e.target.files);
        setUploading(true);
        setUploadProgress(0);

        try {
            const results: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const url = await StorageService.uploadFile(
                    files[i],
                    'attachments',
                    `installations/${installationId}/acceptance`
                );
                results.push(url);
                setUploadProgress(Math.round(((i + 1) / files.length) * 100));
            }

            setPhotos(prev => [...prev, ...results]);
            toast.success(`${results.length} zdjęć dodanych`);

            // Auto-save photos if in edit mode
            if (isEditMode && installation) {
                await savePhotosOnly([...photos, ...results]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Błąd wgrywania zdjęć');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const removePhoto = async (index: number) => {
        const updated = photos.filter((_, i) => i !== index);
        setPhotos(updated);

        // Auto-save if in edit mode
        if (isEditMode && installation) {
            await savePhotosOnly(updated);
        }
    };

    const savePhotosOnly = async (photoUrls: string[]) => {
        if (!installationId || !installation?.acceptance) return;
        try {
            await InstallationService.updateInstallation(installationId, {
                acceptance: {
                    ...installation.acceptance,
                    photos: photoUrls,
                },
            } as any);
        } catch (e) {
            console.error('Auto-save photos failed:', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!installation || !installationId) return;

        if (!hasContract) {
            toast.error('Ta instalacja nie ma przypisanej umowy. Protokół odbioru wymaga umowy.');
            return;
        }

        // New protocol: validate all fields
        if (!isEditMode) {
            const allChecked = Object.values(checklist).every(v => v);
            if (!allChecked) {
                toast.error('Uzupełnij wszystkie punkty checklisty');
                return;
            }

            if (signatureRef.current?.isEmpty()) {
                toast.error('Podpis klienta jest wymagany');
                return;
            }

            if (!clientName.trim()) {
                toast.error('Podaj imię i nazwisko klienta');
                return;
            }
        }

        setSaving(true);
        try {
            const signatureData = isEditMode
                ? installation.acceptance?.signature
                : signatureRef.current?.toDataURL();

            // Build notes with installer choice
            const choiceLabels: Record<InstallerChoice, string> = {
                complete: '✅ Montaż zakończony',
                service: '🔧 Zgłoszenie serwisowe',
                followup: '🔄 Wymaga dokończenia'
            };
            const choiceNote = !isEditMode ? `\n[OCENA MONTAŻYSTY: ${choiceLabels[installerChoice]}]${serviceDescription ? `\nOpis: ${serviceDescription}` : ''}` : '';

            // Save acceptance — status goes to 'verification' (NOT 'completed')
            // Admin/manager will make the final decision
            const acceptanceData = {
                acceptedAt: isEditMode ? (installation.acceptance?.acceptedAt || new Date().toISOString()) : new Date().toISOString(),
                clientName: clientName.trim(),
                signature: signatureData,
                notes: (notes.trim() + choiceNote).trim() || undefined,
                photos: photos,
            };

            // Use direct update instead of updateInstallationAcceptance to avoid auto-completing
            await supabase
                .from('installations')
                .update({
                    acceptance: acceptanceData,
                    status: isEditMode ? installation.status : 'verification'
                })
                .eq('id', installationId);

            // Save checklist + installer choice in completionReport
            await InstallationService.updateInstallation(installationId, {
                completionReport: {
                    checklist,
                    completedAt: new Date().toISOString(),
                    installerChoice,
                    serviceDescription: serviceDescription || undefined
                },
            } as any);

            toast.success(isEditMode ? 'Protokół zaktualizowany' : 'Protokół odbioru zapisany — oczekuje na decyzję biura');
            navigate('/installer');
        } catch (error) {
            console.error(error);
            toast.error('Błąd zapisu protokołu');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
            </div>
        );
    }

    if (!installation) {
        return (
            <div className="p-6 text-center">
                <p className="text-slate-500">Instalacja nie znaleziona</p>
                <Link to="/installer" className="text-indigo-600 underline mt-2 inline-block">Wróć</Link>
            </div>
        );
    }

    // If no contract - block
    if (!hasContract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Brak Umowy</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Protokół odbioru montażu wymaga przypisanej umowy. Skontaktuj się z biurem aby przypisać umowę do tej instalacji.
                    </p>
                    <Link
                        to="/installer"
                        className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Wróć do panelu
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/installer" className="text-slate-400 hover:text-slate-600 p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-800">
                        {isEditMode ? 'Edycja Protokołu' : 'Protokół Odbioru'}
                    </h1>
                    <div className="w-6" />
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Installation Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-3">
                            <h2 className="text-white font-bold">Dane montażu</h2>
                        </div>
                        <div className="p-5 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Klient</span>
                                <span className="font-medium text-slate-800">{installation.client.firstName} {installation.client.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Adres</span>
                                <span className="font-medium text-slate-800 text-right">{installation.client.address}, {installation.client.city}</span>
                            </div>
                            {installation.contractNumber && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Umowa</span>
                                    <span className="font-medium text-indigo-600">{installation.contractNumber}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Produkt</span>
                                <span className="font-medium text-slate-600 text-right text-xs">{installation.productSummary}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Data odbioru</span>
                                <span className="font-medium text-slate-800">
                                    {isEditMode && installation.acceptance?.acceptedAt
                                        ? new Date(installation.acceptance.acceptedAt).toLocaleDateString('pl-PL')
                                        : new Date().toLocaleDateString('pl-PL')
                                    }
                                </span>
                            </div>

                            {isEditMode && (
                                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                                    <span className="text-emerald-600 text-lg">✅</span>
                                    <div>
                                        <p className="text-sm font-medium text-emerald-700">Protokół odebrany</p>
                                        <p className="text-xs text-emerald-500">Możesz edytować notatki i dodawać zdjęcia</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Checklist odbioru
                        </h3>
                        <div className="space-y-2">
                            {CHECKLIST_ITEMS.map(item => (
                                <label
                                    key={item.key}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                        checklist[item.key]
                                            ? 'bg-emerald-50 border-emerald-200'
                                            : 'bg-white border-slate-100 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checklist[item.key]}
                                        onChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        disabled={isEditMode}
                                    />
                                    <span className="text-lg">{item.icon}</span>
                                    <span className={`text-sm font-medium ${checklist[item.key] ? 'text-emerald-700' : 'text-slate-700'}`}>
                                        {item.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-3 text-right text-xs text-slate-400">
                            {Object.values(checklist).filter(Boolean).length} / {CHECKLIST_ITEMS.length} ✓
                        </div>
                    </div>

                    {/* Client Name */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <label className="block">
                            <span className="font-bold text-slate-800 mb-2 block">Imię i nazwisko klienta</span>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                placeholder="Jan Kowalski"
                                readOnly={isEditMode}
                            />
                        </label>
                    </div>

                    {/* Signature */}
                    {!isEditMode ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Podpis klienta
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => signatureRef.current?.clear()}
                                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                                >
                                    Wyczyść
                                </button>
                            </div>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white">
                                <SignatureCanvas
                                    ref={signatureRef}
                                    canvasProps={{
                                        className: 'w-full h-48 cursor-crosshair',
                                        style: { touchAction: 'none' }
                                    }}
                                    backgroundColor="white"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">Rysuj palcem lub myszką</p>
                        </div>
                    ) : (
                        // Show saved signature
                        installation.acceptance?.signature && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Podpis klienta (zapisany)
                                </h3>
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <img src={installation.acceptance.signature} alt="Podpis" className="w-full h-32 object-contain" />
                                </div>
                            </div>
                        )
                    )}

                    {/* Notes */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <label className="block">
                            <span className="font-bold text-slate-800 mb-2 block flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Uwagi / Notatki
                            </span>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none"
                                rows={3}
                                placeholder="Dodatkowe uwagi, zastrzeżenia klienta, informacje..."
                            />
                        </label>
                    </div>

                    {/* Photos Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Dokumentacja zdjęciowa
                            <span className="text-xs text-slate-400 font-normal ml-auto">{photos.length} zdjęć</span>
                        </h3>

                        {/* Photo Grid */}
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                            {photos.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                    <img
                                        src={url}
                                        alt={`Zdjęcie ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        className="absolute top-1 right-1 bg-red-500/80 backdrop-blur text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                    >
                                        ×
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] text-center py-0.5">
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upload area */}
                        <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all group">
                            {uploading ? (
                                <>
                                    <div className="w-12 h-12 rounded-full border-3 border-indigo-200 border-t-indigo-500 animate-spin mb-2" />
                                    <p className="text-sm text-indigo-600 font-medium">Wgrywanie... {uploadProgress}%</p>
                                    <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mt-2">
                                        <div
                                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors mb-2">
                                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">Dodaj zdjęcia</p>
                                    <p className="text-xs text-slate-400">Możesz wybrać wiele zdjęć naraz</p>
                                </>
                            )}
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {/* Installer Choice — 3 options */}
                    {!isEditMode && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Co dalej z montażem?
                            </h3>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => { setInstallerChoice('complete'); setServiceDescription(''); }}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                        installerChoice === 'complete'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <p className={`font-bold text-sm ${installerChoice === 'complete' ? 'text-emerald-700' : 'text-slate-700'}`}>Montaż zakończony</p>
                                        <p className="text-xs text-slate-400">Wszystko zamontowane, gotowe do zamknięcia</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInstallerChoice('service')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                        installerChoice === 'service'
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-2xl">🔧</span>
                                    <div>
                                        <p className={`font-bold text-sm ${installerChoice === 'service' ? 'text-amber-700' : 'text-slate-700'}`}>Wymaga serwisu</p>
                                        <p className="text-xs text-slate-400">Usterka, poprawka, lub problem do naprawienia</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInstallerChoice('followup')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                        installerChoice === 'followup'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-2xl">🔄</span>
                                    <div>
                                        <p className={`font-bold text-sm ${installerChoice === 'followup' ? 'text-blue-700' : 'text-slate-700'}`}>Wymaga dokończenia</p>
                                        <p className="text-xs text-slate-400">Nie wszystko zamontowane, brakuje materiałów / domierzenie</p>
                                    </div>
                                </button>
                            </div>

                            {/* Description for service/followup */}
                            {(installerChoice === 'service' || installerChoice === 'followup') && (
                                <div className="mt-3">
                                    <textarea
                                        value={serviceDescription}
                                        onChange={(e) => setServiceDescription(e.target.value)}
                                        placeholder={installerChoice === 'service' ? 'Opisz problem / usterkę...' : 'Co zostało do zrobienia? Jakie materiały brakują?'}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-none text-sm"
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving || uploading || ((installerChoice !== 'complete') && !serviceDescription.trim() && !isEditMode)}
                        className={`w-full font-bold py-4 px-6 rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isEditMode ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white' :
                            installerChoice === 'complete' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white' :
                            installerChoice === 'service' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white' :
                            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                        }`}
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Zapisywanie...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isEditMode ? 'Zapisz zmiany' : 
                                 installerChoice === 'complete' ? 'Zatwierdź — Montaż zakończony' :
                                 installerChoice === 'service' ? 'Zatwierdź — Do serwisu' :
                                 'Zatwierdź — Do dokończenia'}
                            </>
                        )}
                    </button>

                    {!isEditMode && (
                        <p className="text-center text-xs text-slate-400">
                            Decyzję końcową podejmie biuro na podstawie Twojej oceny
                        </p>
                    )}

                    {isEditMode && (
                        <p className="text-center text-xs text-slate-400">
                            Możesz dodawać zdjęcia i edytować notatki w dowolnym momencie
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};
