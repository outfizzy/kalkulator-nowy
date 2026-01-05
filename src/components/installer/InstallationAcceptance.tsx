import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';
import { DatabaseService } from '../../services/database';
import { StorageService } from '../../services/database/storage.service';
import type { Installation } from '../../types';
import { useTranslation } from '../../contexts/TranslationContext';

export const InstallationAcceptance: React.FC = () => {
    const { installationId } = useParams<{ installationId: string }>();
    const navigate = useNavigate();
    const signatureRef = useRef<SignatureCanvas>(null);
    const { t } = useTranslation();

    const [installation, setInstallation] = useState<Installation | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !installationId) return;

        const files = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = files.map(file =>
                StorageService.uploadFile(file, 'attachments', `installations/${installationId}`)
            );
            const urls = await Promise.all(uploadPromises);
            setPhotos(prev => [...prev, ...urls]);
            toast.success('Zdjęcia dodane');
        } catch (error) {
            console.error('Error uploading photos:', error);
            toast.error('Błąd wgrywania zdjęć');
        } finally {
            setUploading(false);
        }
    };

    const [checklist, setChecklist] = useState({
        structureIntegrity: false,
        materialQuality: false,
        functionalityTest: false,
        cleaningCompleted: false,
        clientInstructed: false,
        warrantyProvided: false
    });

    useEffect(() => {
        const loadInstallation = async () => {
            if (!installationId) return;
            try {
                const installations = await DatabaseService.getInstallations();
                const inst = installations.find(i => i.id === installationId);
                if (inst) {
                    setInstallation(inst);
                    setClientName(inst.acceptance?.clientName || `${inst.client.firstName} ${inst.client.lastName}`);
                    if (inst.acceptance?.photos && Array.isArray(inst.acceptance.photos)) {
                        setPhotos(inst.acceptance.photos);
                    }
                }
            } catch (error) {
                console.error('Error loading installation:', error);
                toast.error(t('acceptance.loadError'));
            } finally {
                setLoading(false);
            }
        };
        loadInstallation();
    }, [installationId, t]);

    const handleCheckboxChange = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const clearSignature = () => {
        signatureRef.current?.clear();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!installation || !installationId) return;

        // Validate checklist
        const allChecked = Object.values(checklist).every(v => v);
        if (!allChecked) {
            toast.error(t('acceptance.fillChecklist'));
            return;
        }

        // Validate signature
        if (signatureRef.current?.isEmpty()) {
            toast.error(t('acceptance.signatureRequired'));
            return;
        }

        if (!clientName.trim()) {
            toast.error(t('acceptance.nameRequired'));
            return;
        }

        setSaving(true);
        try {
            const signatureData = signatureRef.current?.toDataURL();

            await DatabaseService.updateInstallationAcceptance(installationId, {
                acceptedAt: new Date().toISOString(),
                clientName: clientName.trim(),
                signature: signatureData,
                notes: notes.trim() || undefined,
                photos: photos
            });

            toast.success(t('acceptance.successMessage'));
            navigate('/installer');
        } catch (error) {
            console.error('Error saving acceptance:', error);
            toast.error(t('acceptance.errorMessage'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            </div>
        );
    }

    if (!installation) {
        return (
            <div className="p-6 text-center">
                <p className="text-slate-500">{t('acceptance.notFound')}</p>
            </div>
        );
    }

    const checklistItems = [
        { key: 'structureIntegrity' as const, label: t('acceptance.checkStructure') },
        { key: 'materialQuality' as const, label: t('acceptance.checkMaterial') },
        { key: 'functionalityTest' as const, label: t('acceptance.checkFunctionality') },
        { key: 'cleaningCompleted' as const, label: t('acceptance.checkCleaning') },
        { key: 'clientInstructed' as const, label: t('acceptance.checkInstruction') },
        { key: 'warrantyProvided' as const, label: t('acceptance.checkWarranty') }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/installer')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('common.back')}
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">{t('acceptance.title')}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {installation.client.firstName} {installation.client.lastName}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Installation Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-3">{t('acceptance.installationInfo')}</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('acceptance.product')}</span>
                                <span className="font-medium">{installation.productSummary}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('acceptance.address')}</span>
                                <span className="font-medium">{installation.client.address}, {installation.client.city}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{t('acceptance.date')}</span>
                                <span className="font-medium">
                                    {new Date().toLocaleDateString('pl-PL')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">{t('acceptance.checklist')}</h2>
                        <div className="space-y-3">
                            {checklistItems.map((item) => (
                                <label
                                    key={item.key}
                                    className="flex items-center gap-3 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checklist[item.key]}
                                        onChange={() => handleCheckboxChange(item.key)}
                                        className="w-5 h-5 rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                                    />
                                    <span className={`text-sm ${checklist[item.key] ? 'text-slate-700 line-through' : 'text-slate-800'}`}>
                                        {item.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Client Name */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <label className="block">
                            <span className="font-bold text-slate-800 mb-2 block">{t('acceptance.clientName')}</span>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                                placeholder={t('acceptance.clientNamePlaceholder')}
                            />
                        </label>
                    </div>

                    {/* Signature */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-bold text-slate-800">{t('acceptance.clientSignature')}</h2>
                            <button
                                type="button"
                                onClick={clearSignature}
                                className="text-sm text-slate-500 hover:text-slate-700 underline"
                            >
                                {t('common.clear')}
                            </button>
                        </div>
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    className: 'w-full h-48 cursor-crosshair',
                                    style: { touchAction: 'none' }
                                }}
                                backgroundColor="white"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <label className="block">
                            <span className="font-bold text-slate-800 mb-2 block">{t('acceptance.notes')}</span>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-lg border-slate-300 focus:ring-accent focus:border-accent"
                                rows={3}
                                placeholder={t('acceptance.notesPlaceholder')}
                            />
                        </label>
                    </div>

                    {/* Photos Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">{t('acceptance.photos')}</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {photos.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img src={url} alt={`Realization ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-accent flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-white text-slate-400 hover:text-accent">
                                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-xs font-medium">{t('acceptance.addPhoto')}</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                            {uploading && (
                                <div className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                    <div className="animate-spin w-4 h-4 border-2 border-accent border-b-transparent rounded-full" />
                                    Wgrywanie zdjęć...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {t('acceptance.submit')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
