import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ServiceService } from '../../services/database/service.service';
import type { ServiceTicketType } from '../../types';

const ServiceRequestPage = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Verification
    const [contractNumber, setContractNumber] = useState('');
    const [email, setEmail] = useState('');
    const [verifiedData, setVerifiedData] = useState<{
        contractId?: string;
        clientId?: string;
        installationId?: string;
    } | null>(null);

    // Step 2: Details
    const [type, setType] = useState<ServiceTicketType>('other');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    // Step 3: Success
    const [ticketNumber, setTicketNumber] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await ServiceService.verifyContract(contractNumber, email);
            if (result.verified) {
                setVerifiedData({
                    contractId: result.contractId,
                    clientId: result.clientId,
                    installationId: result.installationId
                });
                setStep(2);
                toast.success('Vertrag gefunden!');
            } else {
                toast.error('Vertrag oder E-Mail nicht gefunden. Bitte prüfen Sie Ihre Eingaben.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setPhotos(prev => [...prev, ...newFiles]);

            // Generate previews
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifiedData) return;

        setLoading(true);
        try {
            const { data, error } = await ServiceService.createTicket({
                clientId: verifiedData.clientId,
                contractId: verifiedData.contractId,
                installationId: verifiedData.installationId,
                type,
                description,
                status: 'new',
                priority: 'medium'
            }, photos);

            if (error) throw error;

            if (data) {
                setTicketNumber(data.ticketNumber);
                // Send confirmation email (handled by backend logic conceptually, 
                // but here we call EmailService manually via separate endpoint if not automated in triggers)
                // For now, let's assume ServiceService handles it or we call it here:

                const { EmailService } = await import('../../services/email.service');
                await EmailService.sendServiceAcknowledgment(email, data.ticketNumber, description);

                setStep(3);
                toast.success('Anfrage erfolgreich gesendet!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Fehler beim Senden der Anfrage.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Service & Reklamation</h1>
                    <p className="text-blue-100 mt-2">Polendach24 Kundencenter</p>
                </div>

                <div className="p-8">
                    {/* Step 1: Verifikation */}
                    {step === 1 && (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">Identifikation</h2>
                                <p className="text-gray-500 text-sm mt-1">Bitte geben Sie Ihre Vertragsdaten ein.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vertragsnummer</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="z.B. PL/001/12/2024"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={contractNumber}
                                    onChange={e => setContractNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Adresse</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="ihre.email@beispiel.de"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Überprüfung...' : 'Weiter'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Problembeschreibung */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-800">Problembeschreibung</h2>
                                <p className="text-gray-500 text-sm mt-1">Vertrag verifiziert: {contractNumber}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={type}
                                    onChange={e => setType(e.target.value as ServiceTicketType)}
                                >
                                    <option value="leak">Undichtigkeit (Leck)</option>
                                    <option value="electrical">Elektrik / LED / Motor</option>
                                    <option value="mechanical">Mechanisch / Klemmt</option>
                                    <option value="visual">Optischer Mangel / Kratzer</option>
                                    <option value="other">Sonstiges</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Bitte beschreiben Sie das Problem so genau wie möglich..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fotos (Optional)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors cursor-pointer relative"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <span className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>Foto hochladen</span>
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, max 10MB</p>
                                    </div>
                                    <input id="file-upload" type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                                </div>
                                {/* Previews */}
                                {previews.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-4">
                                        {previews.map((src, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                <img src={src} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-1/3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Zurück
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-2/3 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Senden...' : 'Absenden'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <div className="text-center py-8">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h2>
                            <p className="text-gray-600 mb-6">
                                Ihre Serviceanfrage wurde erfolgreich übermittelt.
                                <br />
                                Ticket-Nummer: <span className="font-mono font-bold text-gray-900">{ticketNumber}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                                Sie erhalten in Kürze eine Bestätigung per E-Mail.
                                <br />
                                Unser Team wird sich schnellstmöglich mit Ihnen in Verbindung setzen.
                            </p>

                            <button
                                onClick={() => window.location.reload()}
                                className="mt-8 px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                            >
                                Zur Startseite
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Polendach24. All rights reserved.
            </div>
        </div>
    );
};

export default ServiceRequestPage;
