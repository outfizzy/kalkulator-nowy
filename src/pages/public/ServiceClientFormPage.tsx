import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TicketInfo {
    id: string;
    ticketNumber: string;
    title: string;
    companyName: string;
    clientName: string;
    contractNumber: string;
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
    const [contactAddress, setContactAddress] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [urgency, setUrgency] = useState('normal');
    const [issueType, setIssueType] = useState('');
    const [issueLocation, setIssueLocation] = useState('');
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
                    .select(`
                        id, ticket_number, status, description, contract_number,
                        client:client_id(first_name, last_name, email, phone, street, house_number, postal_code, city)
                    `)
                    .eq('id', ticketId)
                    .single();

                if (fetchError || !data) {
                    setError('Service-Ticket nicht gefunden. Bitte überprüfen Sie den Link.');
                    setLoading(false);
                    return;
                }

                if (data.status === 'resolved' || data.status === 'closed') {
                    setError('Dieses Service-Ticket wurde bereits geschlossen.');
                    setLoading(false);
                    return;
                }

                const client = data.client as any;
                const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : '';

                setTicketInfo({
                    id: data.id,
                    ticketNumber: data.ticket_number,
                    title: data.description || 'Service-Anfrage',
                    companyName: 'Polendach24',
                    clientName,
                    contractNumber: data.contract_number || ''
                });

                if (client) {
                    setContactName(`${client.first_name || ''} ${client.last_name || ''}`.trim());
                    setContactEmail(client.email || '');
                    setContactPhone(client.phone || '');
                    const addr = [client.street, client.house_number].filter(Boolean).join(' ');
                    const fullAddr = [addr, [client.postal_code, client.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
                    setContactAddress(fullAddr);
                }
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
            const allowed = newFiles.slice(0, 15 - photos.length);
            setPhotos(prev => [...prev, ...allowed]);
            allowed.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
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
            const photoUrls: string[] = [];
            for (const file of photos) {
                const fileExt = file.name.split('.').pop();
                const fileName = `client_${ticketId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('service-tickets').upload(fileName, file);
                if (uploadError) { console.error('Photo upload error:', uploadError); continue; }
                const { data: urlData } = supabase.storage.from('service-tickets').getPublicUrl(fileName);
                photoUrls.push(urlData.publicUrl);
            }

            const { data: current } = await supabase
                .from('service_tickets')
                .select('photos, description, client_notes')
                .eq('id', ticketId)
                .single();

            const existingPhotos = current?.photos || [];
            const allPhotos = [...existingPhotos, ...photoUrls];

            const urgencyLabels: Record<string, string> = {
                'low': 'Gering', 'normal': 'Normal', 'high': 'Dringend', 'critical': 'Sehr dringend'
            };
            const issueTypeLabels: Record<string, string> = {
                'leak': 'Undichtigkeit', 'electrical': 'Elektrik', 'visual': 'Optischer Mangel',
                'mechanical': 'Mechanischer Defekt', 'noise': 'Geräusche', 'other': 'Sonstiges'
            };

            const clientNotes = [
                `═══════════════════════════════════════`,
                `KUNDENINFORMATIONEN (${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})`,
                `═══════════════════════════════════════`,
                '',
                `PROBLEMBESCHREIBUNG:`,
                description.trim(),
                '',
                issueType && `Art der Störung: ${issueTypeLabels[issueType] || issueType}`,
                issueLocation && `Ort der Störung: ${issueLocation}`,
                urgency && `Dringlichkeit: ${urgencyLabels[urgency] || urgency}`,
                '',
                `KONTAKTDATEN:`,
                contactName && `  Name: ${contactName}`,
                contactPhone && `  Telefon: ${contactPhone}`,
                contactEmail && `  E-Mail: ${contactEmail}`,
                contactAddress && `  Adresse: ${contactAddress}`,
                '',
                preferredDate && `Wunschtermin: ${new Date(preferredDate).toLocaleDateString('de-DE')}${preferredTime ? ` um ${preferredTime} Uhr` : ''}`,
                '',
                `Fotos: ${photoUrls.length} Stück hochgeladen`,
                `═══════════════════════════════════════`,
            ].filter(Boolean).join('\n');

            const { error: updateError } = await supabase
                .from('service_tickets')
                .update({
                    photos: allPhotos,
                    client_notes: clientNotes,
                    description: current?.description ? `${current.description}\n\n${clientNotes}` : clientNotes
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

    // ========== LOADING ==========
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Wird geladen...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            </div>
        );
    }

    // ========== ERROR ==========
    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 40, textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Fehler</h2>
                    <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
                </div>
            </div>
        );
    }

    // ========== SUCCESS ==========
    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 40, textAlign: 'center' }}>
                    <img src="/PolenDach24-Logo.png" alt="Polendach24" style={{ height: 40, margin: '0 auto 24px', display: 'block' }} />
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #bbf7d0' }}>
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Vielen Dank!</h2>
                    <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                        Ihre Informationen wurden erfolgreich übermittelt.
                    </p>
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Ticket-Nummer</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{ticketInfo?.ticketNumber}</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>
                        Unser Service-Team wird sich in Kürze mit Ihnen in Verbindung setzen.
                    </p>
                </div>
                <p style={{ position: 'fixed', bottom: 24, width: '100%', textAlign: 'center', fontSize: 11, color: '#cbd5e1' }}>
                    &copy; {new Date().getFullYear()} Polendach24 GmbH
                </p>
            </div>
        );
    }

    // ========== MAIN FORM ==========
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
        fontSize: 14, color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6
    };
    const sectionTitleStyle: React.CSSProperties = {
        fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid #f1f5f9', letterSpacing: 0.3
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>

                {/* === HEADER === */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src="/PolenDach24-Logo.png" alt="Polendach24" style={{ height: 44, margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontSize: 12, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Kundenservice</p>
                </div>

                {/* === MAIN CARD === */}
                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

                    {/* Card Header */}
                    <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '20px 24px', color: 'white' }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Service-Formular</h2>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 12px' }}>Bitte beschreiben Sie das Problem möglichst genau</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', fontSize: 13, backdropFilter: 'blur(4px)' }}>
                                Ticket: <strong style={{ fontFamily: 'monospace' }}>{ticketInfo?.ticketNumber}</strong>
                            </span>
                            {ticketInfo?.clientName && (
                                <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', fontSize: 13, backdropFilter: 'blur(4px)' }}>
                                    Kunde: <strong>{ticketInfo.clientName}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* === FORM === */}
                    <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* Info Banner */}
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', margin: '0 0 4px' }}>Bitte füllen Sie das Formular vollständig aus</p>
                                <p style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.6, margin: 0 }}>
                                    Je mehr Informationen und Fotos Sie bereitstellen, desto schneller und effizienter können wir Ihnen helfen.
                                </p>
                            </div>
                        </div>

                        {/* Section 1: Issue Type */}
                        <div>
                            <div style={sectionTitleStyle}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', color: '#3b82f6', fontSize: 11, fontWeight: 700, marginRight: 8 }}>1</span>
                                Art der Störung
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Störungsart</label>
                                    <select value={issueType} onChange={e => setIssueType(e.target.value)} style={inputStyle}>
                                        <option value="">— Bitte wählen —</option>
                                        <option value="leak">Undichtigkeit</option>
                                        <option value="electrical">Elektrik</option>
                                        <option value="visual">Optischer Mangel</option>
                                        <option value="mechanical">Mechanischer Defekt</option>
                                        <option value="noise">Geräusche</option>
                                        <option value="other">Sonstiges</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Dringlichkeit</label>
                                    <select value={urgency} onChange={e => setUrgency(e.target.value)} style={inputStyle}>
                                        <option value="low">Gering — kann warten</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">Dringend</option>
                                        <option value="critical">Sehr dringend</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Description */}
                        <div>
                            <div style={sectionTitleStyle}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', color: '#3b82f6', fontSize: 11, fontWeight: 700, marginRight: 8 }}>2</span>
                                Problembeschreibung
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Beschreibung des Problems *</label>
                                    <textarea
                                        required rows={4} value={description} onChange={e => setDescription(e.target.value)}
                                        placeholder="Was ist das Problem? Wo genau tritt es auf? Seit wann besteht es?"
                                        style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Wo genau?</label>
                                    <input
                                        type="text" value={issueLocation} onChange={e => setIssueLocation(e.target.value)}
                                        placeholder="z.B. linke Seite der Überdachung, Regenrinne, Motor..."
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Photos */}
                        <div>
                            <div style={sectionTitleStyle}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', color: '#3b82f6', fontSize: 11, fontWeight: 700, marginRight: 8 }}>3</span>
                                Fotos hinzufügen
                            </div>
                            <div
                                onClick={() => document.getElementById('client-photos')?.click()}
                                style={{
                                    border: '2px dashed #e2e8f0', borderRadius: 12, padding: 32, textAlign: 'center',
                                    cursor: 'pointer', transition: 'border-color 0.2s', background: '#fafbfc'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#93c5fd')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            >
                                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>Klicken, um Fotos hochzuladen</p>
                                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Max. 15 Fotos · JPG, PNG, HEIC</p>
                                <p style={{ fontSize: 11, color: '#3b82f6', margin: '8px 0 0' }}>Mehr Fotos helfen uns, das Problem schneller zu lösen</p>
                                <input id="client-photos" type="file" style={{ display: 'none' }} multiple accept="image/*" onChange={handleFileChange} />
                            </div>
                            {previews.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 }}>
                                    {previews.map((src, idx) => (
                                        <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            <button
                                                type="button" onClick={() => removePhoto(idx)}
                                                style={{
                                                    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                                                    background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', fontSize: 11,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 4: Contact */}
                        <div>
                            <div style={sectionTitleStyle}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', color: '#3b82f6', fontSize: 11, fontWeight: 700, marginRight: 8 }}>4</span>
                                Kontaktdaten
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Name *</label>
                                    <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ihr vollständiger Name" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Telefon *</label>
                                    <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+49 123 456 789" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>E-Mail</label>
                                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="ihre@email.de" style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Adresse (Montageort)</label>
                                    <input type="text" value={contactAddress} onChange={e => setContactAddress(e.target.value)} placeholder="Straße, PLZ Ort" style={inputStyle} />
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Preferred Date */}
                        <div>
                            <div style={sectionTitleStyle}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', color: '#3b82f6', fontSize: 11, fontWeight: 700, marginRight: 8 }}>5</span>
                                Wunschtermin (optional)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Datum</label>
                                    <input
                                        type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]} style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Uhrzeit (ca.)</label>
                                    <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={inputStyle}>
                                        <option value="">— egal —</option>
                                        <option value="08:00-10:00">08:00 – 10:00</option>
                                        <option value="10:00-12:00">10:00 – 12:00</option>
                                        <option value="12:00-14:00">12:00 – 14:00</option>
                                        <option value="14:00-16:00">14:00 – 16:00</option>
                                        <option value="16:00-18:00">16:00 – 18:00</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !description.trim() || !contactName.trim() || !contactPhone.trim()}
                            style={{
                                width: '100%', padding: 16, background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                                color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15,
                                cursor: submitting ? 'wait' : 'pointer',
                                opacity: submitting || !description.trim() || !contactName.trim() || !contactPhone.trim() ? 0.5 : 1,
                                transition: 'opacity 0.2s, transform 0.1s',
                                boxShadow: '0 4px 14px rgba(30,64,175,0.3)'
                            }}
                        >
                            {submitting ? 'Wird gesendet...' : 'Absenden'}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', margin: 0 }}>
                            Mit dem Absenden bestätigen Sie, dass Ihre Angaben korrekt sind.
                        </p>
                    </form>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 16 }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>&copy; {new Date().getFullYear()} Polendach24 GmbH &mdash; Terrassenüberdachungen &amp; mehr</p>
                    <p style={{ fontSize: 11, color: '#cbd5e1', margin: 0 }}>info@polendach24.de</p>
                </div>
            </div>
        </div>
    );
};

export default ServiceClientFormPage;
