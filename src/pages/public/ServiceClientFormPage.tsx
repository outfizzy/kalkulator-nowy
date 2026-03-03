import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TicketInfo {
    id: string;
    ticketNumber: string;
    title: string;
    companyName: string;
}

const ServiceClientFormPage = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [description, setDescription] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const loadTicket = async () => {
            if (!ticketId) {
                setError('Ungültiger Link');
                setLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('service_tickets')
                    .select('id, ticket_number, status, description')
                    .eq('id', ticketId)
                    .single();

                if (fetchError || !data) {
                    console.error('Ticket fetch error:', fetchError);
                    setError('Service-Ticket nicht gefunden. Bitte überprüfen Sie den Link.');
                    setLoading(false);
                    return;
                }

                if (data.status === 'resolved' || data.status === 'closed') {
                    setError('Dieses Service-Ticket wurde bereits geschlossen.');
                    setLoading(false);
                    return;
                }

                setTicketInfo({
                    id: data.id,
                    ticketNumber: data.ticket_number,
                    title: data.description || 'Service-Anfrage',
                    companyName: 'Polendach24'
                });
            } catch (e) {
                setError('Ein Fehler ist aufgetreten.');
            } finally {
                setLoading(false);
            }
        };

        loadTicket();
    }, [ticketId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Limit to 10 photos total
            const allowed = newFiles.slice(0, 10 - photos.length);
            setPhotos(prev => [...prev, ...allowed]);

            allowed.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId || !description.trim()) return;

        setSubmitting(true);
        try {
            // 1. Upload photos
            const photoUrls: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `client_${ticketId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('service-tickets')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Photo upload error:', uploadError);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from('service-tickets')
                    .getPublicUrl(fileName);

                photoUrls.push(urlData.publicUrl);
            }

            // 2. Get current ticket to merge photos
            const { data: current } = await supabase
                .from('service_tickets')
                .select('photos, description, client_notes')
                .eq('id', ticketId)
                .single();

            const existingPhotos = current?.photos || [];
            const allPhotos = [...existingPhotos, ...photoUrls];

            // 3. Build client notes
            const clientNotes = [
                `--- Informacje od klienta (${new Date().toLocaleDateString('de-DE')}) ---`,
                description.trim(),
                contactName && `Kontakt: ${contactName}`,
                contactPhone && `Telefon: ${contactPhone}`,
                contactEmail && `E-Mail: ${contactEmail}`,
                preferredDate && `Wunschtermin: ${preferredDate}`,
                `Fotos: ${photoUrls.length} Stück`,
                '---'
            ].filter(Boolean).join('\n');

            // 4. Update ticket
            const { error: updateError } = await supabase
                .from('service_tickets')
                .update({
                    photos: allPhotos,
                    client_notes: clientNotes,
                    description: current?.description
                        ? `${current.description}\n\n${clientNotes}`
                        : clientNotes
                })
                .eq('id', ticketId);

            if (updateError) throw updateError;

            setSubmitted(true);
        } catch (err) {
            console.error('Submit error:', err);
            setError('Fehler beim Senden. Bitte versuchen Sie es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Fehler</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h2>
                    <p className="text-gray-600 mb-4">
                        Ihre Informationen wurden erfolgreich übermittelt.
                        <br />
                        Ticket: <span className="font-mono font-bold">{ticketInfo?.ticketNumber}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Unser Team wird sich in Kürze mit Ihnen in Verbindung setzen.
                    </p>
                </div>
                <div className="absolute bottom-6 text-center text-xs text-gray-400 w-full">
                    &copy; {new Date().getFullYear()} Polendach24
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                🔧
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Service-Formular</h1>
                                <p className="text-blue-100 text-sm">Polendach24 Kundenservice</p>
                            </div>
                        </div>
                        <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 text-sm">
                            <span className="text-blue-200">Ticket:</span>{' '}
                            <span className="font-mono font-bold">{ticketInfo?.ticketNumber}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                            Bitte beschreiben Sie das Problem und laden Sie Fotos hoch.
                            Ihre Angaben helfen uns, den Service schneller durchzuführen.
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Problembeschreibung *
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Was ist das Problem? Wo genau tritt es auf? Seit wann besteht es?"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none transition-all"
                            />
                        </div>

                        {/* Photos */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Fotos hinzufügen
                            </label>
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 cursor-pointer transition-colors"
                                onClick={() => document.getElementById('client-photos')?.click()}
                            >
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-600 font-medium">Fotos hochladen</p>
                                <p className="text-xs text-gray-400 mt-1">Max. 10 Fotos (JPG, PNG)</p>
                                <input
                                    id="client-photos"
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {previews.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {previews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={src} className="w-full h-full object-cover" alt="" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(idx)}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Contact Details */}
                        <div className="border-t border-gray-200 pt-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Kontaktdaten (optional)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={e => setContactName(e.target.value)}
                                        placeholder="Ihr Name"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        placeholder="Telefon"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        placeholder="E-Mail"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preferred Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Gewünschter Termin (optional)
                            </label>
                            <input
                                type="date"
                                value={preferredDate}
                                onChange={e => setPreferredDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !description.trim()}
                            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    Wird gesendet...
                                </span>
                            ) : 'Absenden'}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Polendach24. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default ServiceClientFormPage;
