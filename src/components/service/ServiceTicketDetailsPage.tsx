import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { ServiceService } from '../../services/database/service.service';
import { InstallationService } from '../../services/database/installation.service';
import type { ServiceTicket, InstallationTeam, ServiceTicketTask, ServiceTicketHistory, ServiceTicketStatus, ServiceTicketPriority, ServiceTicketType } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { generateServiceProtocol } from './ServiceProtocolPDF';

// ======= LABELS & STYLING =======
const STATUS_OPTIONS: { value: ServiceTicketStatus; label: string; color: string }[] = [
    { value: 'new', label: 'Nowe', color: 'bg-blue-100 text-blue-800' },
    { value: 'open', label: 'Przyjęte', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'scheduled', label: 'Zaplanowane', color: 'bg-purple-100 text-purple-800' },
    { value: 'in_progress', label: 'W Realizacji', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'resolved', label: 'Rozwiązane', color: 'bg-green-100 text-green-800' },
    { value: 'closed', label: 'Zamknięte', color: 'bg-gray-800 text-white' },
    { value: 'rejected', label: 'Odrzucone', color: 'bg-red-100 text-red-800' },
];

const PRIORITY_OPTIONS: { value: ServiceTicketPriority; label: string; icon: string; color: string }[] = [
    { value: 'low', label: 'Niski', icon: '🟢', color: 'text-green-700 bg-green-50 border-green-200' },
    { value: 'medium', label: 'Średni', icon: '🟡', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    { value: 'high', label: 'Wysoki', icon: '🟠', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    { value: 'critical', label: 'Krytyczny', icon: '🔴', color: 'text-red-700 bg-red-50 border-red-200' },
];

const TYPE_OPTIONS: { value: ServiceTicketType; label: string; icon: string }[] = [
    { value: 'leak', label: 'Nieszczelność', icon: '💧' },
    { value: 'electrical', label: 'Elektryka', icon: '⚡' },
    { value: 'visual', label: 'Usterka wizualna', icon: '👁️' },
    { value: 'mechanical', label: 'Usterka mechaniczna', icon: '⚙️' },
    { value: 'other', label: 'Inne', icon: '📋' },
];

export const ServiceTicketDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [ticket, setTicket] = useState<ServiceTicket | null>(null);
    const [history, setHistory] = useState<ServiceTicketHistory[]>([]);
    const [teams, setTeams] = useState<InstallationTeam[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [newTaskLabel, setNewTaskLabel] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Resolution photo upload
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Email send modal
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    const loadData = useCallback(async (ticketId: string) => {
        setLoading(true);
        try {
            const [ticketData, historyData, teamsData] = await Promise.all([
                ServiceService.getTicketById(ticketId),
                ServiceService.getTicketHistory(ticketId),
                InstallationService.getInstallationTeams()
            ]);

            if (!ticketData) {
                toast.error('Nie znaleziono zgłoszenia');
                navigate('/service');
                return;
            }

            setTicket(ticketData);
            setHistory(historyData);
            setTeams(teamsData);

            // Init form state
            setSelectedTeam(ticketData.assignedTeamId || '');
            setSelectedDate(ticketData.scheduledDate ? ticketData.scheduledDate.split('T')[0] : '');
        } catch (error) {
            console.error(error);
            toast.error('Błąd pobierania danych');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!id) return;
        loadData(id);
    }, [id, loadData]);

    // ======= INLINE EDIT HANDLERS =======

    const handleFieldUpdate = async (field: string, value: string, label?: string) => {
        if (!ticket) return;
        const updates: Partial<ServiceTicket> = { [field]: value };
        const oldValue = (ticket as any)[field];
        if (oldValue === value) return; // No change

        try {
            await ServiceService.updateTicketWithHistory(
                ticket.id,
                updates,
                label ? `Zmieniono ${label}` : undefined
            );
            setTicket({ ...ticket, ...updates } as ServiceTicket);
            toast.success('Zapisano', { duration: 1500 });
            // Refresh history in background
            ServiceService.getTicketHistory(ticket.id).then(setHistory).catch(console.error);
        } catch (e: unknown) {
            toast.error('Błąd zapisu');
            console.error(e);
        }
    };

    const handleUpdateStatus = async (newStatus: ServiceTicketStatus) => {
        if (!ticket) return;
        try {
            await ServiceService.updateTicketWithHistory(ticket.id, { status: newStatus });
            setTicket({ ...ticket, status: newStatus });
            toast.success('Status zaktualizowany');
            ServiceService.getTicketHistory(ticket.id).then(setHistory).catch(console.error);
        } catch (e: unknown) {
            toast.error('Błąd aktualizacji');
            console.error(e);
        }
    };

    const handleAssignTeam = async () => {
        if (!ticket) return;
        try {
            // 1. Update ticket with team and date
            await ServiceService.updateTicketWithHistory(ticket.id, {
                assignedTeamId: selectedTeam,
                scheduledDate: selectedDate || undefined,
                status: 'scheduled'
            });

            // 2. Create installation calendar entry so it appears in Kalendarz Montaży
            if (selectedTeam && selectedDate) {
                try {
                    await InstallationService.createInstallationFromServiceTicket(
                        ticket.id,
                        selectedDate,
                        selectedTeam
                    );
                } catch (calErr) {
                    console.error('Calendar entry creation failed (non-blocking):', calErr);
                    // Non-blocking — ticket is still scheduled even if calendar entry fails
                }
            }

            toast.success('Zaplanowano serwis — dodano do kalendarza');
            setIsAssignModalOpen(false);
            loadData(ticket.id);
        } catch (e: unknown) {
            toast.error('Błąd planowania');
            console.error(e);
        }
    };

    const handleAddTask = async () => {
        if (!ticket || !newTaskLabel.trim()) return;
        const newTask: ServiceTicketTask = {
            id: Math.random().toString(36).substr(2, 9),
            label: newTaskLabel,
            completed: false
        };
        const updatedTasks = [...(ticket.tasks || []), newTask];
        await ServiceService.updateTasks(ticket.id, updatedTasks);
        setNewTaskLabel('');
        setTicket({ ...ticket, tasks: updatedTasks });
    };

    const handleToggleTask = async (taskId: string, completed: boolean) => {
        if (!ticket) return;
        const updatedTasks = (ticket.tasks || []).map(t =>
            t.id === taskId ? { ...t, completed } : t
        );
        await ServiceService.updateTasks(ticket.id, updatedTasks);
        setTicket({ ...ticket, tasks: updatedTasks });
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!ticket) return;
        const updatedTasks = (ticket.tasks || []).filter(t => t.id !== taskId);
        await ServiceService.updateTasks(ticket.id, updatedTasks);
        setTicket({ ...ticket, tasks: updatedTasks });
        toast.success('Usunięto zadanie');
    };

    // Resolution photo upload
    const handleResolutionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!ticket || !e.target.files?.length) return;
        setUploadingPhoto(true);
        try {
            for (const file of Array.from(e.target.files)) {
                const { url, error } = await ServiceService.uploadResolutionPhoto(ticket.id, file);
                if (error) throw error;
                if (url) {
                    const updatedPhotos = [...ticket.photos, url];
                    setTicket({ ...ticket, photos: updatedPhotos });
                }
            }
            toast.success('Zdjęcia dodane');
        } catch (err) {
            toast.error('Błąd przesyłania zdjęcia');
            console.error(err);
        } finally {
            setUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    // ======= EMAIL SEND HANDLER =======
    const handleOpenEmailModal = () => {
        setEmailTo(ticket?.client?.email || '');
        setIsEmailModalOpen(true);
    };

    const handleSendFormEmail = async () => {
        if (!ticket || !emailTo.trim()) return;
        setSendingEmail(true);
        try {
            const formUrl = `${window.location.origin}/service-form/${ticket.id}`;
            const clientName = ticket.client ? `${ticket.client.firstName || ''} ${ticket.client.lastName || ''}`.trim() : 'Kunde';
            const ticketNr = ticket.ticketNumber;

            const htmlTemplate = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:#1a1a1a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <img src="https://polendach24.de/wp-content/uploads/2025/06/logo-1024x197.png" alt="PolenDach24" width="220" style="display:inline-block;border:0;max-width:220px;height:auto;" />
      <p style="color:rgba(255,255,255,0.6);margin:10px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Kundenservice</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
      <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Sehr geehrte/r <strong>${clientName}</strong>,</p>
      <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
        vielen Dank für Ihre Kontaktaufnahme. Für Ihre Service-Anfrage
        <strong style="color:#1e40af;">${ticketNr}</strong>
        haben wir ein Formular vorbereitet, das Sie bitte ausfüllen möchten.
      </p>

      <!-- Info Box -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="font-size:13px;color:#1e40af;font-weight:700;margin:0 0 8px;">Bitte helfen Sie uns mit folgenden Informationen:</p>
        <ul style="margin:0;padding:0 0 0 20px;font-size:13px;color:#3b82f6;line-height:2;">
          <li>Genaue Beschreibung des Problems</li>
          <li>Art und Ort der St\u00f6rung</li>
          <li>Ihre aktuellen Kontaktdaten</li>
          <li><strong>So viele Fotos wie m\u00f6glich</strong> \u2014 verschiedene Blickwinkel helfen uns enorm!</li>
          <li>Gew\u00fcnschter Termin f\u00fcr den Service</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${formUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
          Service-Formular \u00f6ffnen
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 24px;">
        Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br/>
        <a href="${formUrl}" style="color:#3b82f6;word-break:break-all;">${formUrl}</a>
      </p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>

      <p style="font-size:14px;color:#475569;line-height:1.6;">
        Sollten Sie Fragen haben, können Sie sich jederzeit telefonisch oder per E-Mail an uns wenden.
      </p>
      <p style="font-size:14px;color:#1e293b;margin:16px 0 4px;">
        Mit freundlichen Grüßen,<br/>
        <strong>Ihr Polendach24 Service-Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">
        &copy; ${new Date().getFullYear()} Polendach24 GmbH &middot; Terrassenüberdachungen &amp; mehr
      </p>
    </div>
  </div>
</body>
</html>`;

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: emailTo.trim(),
                    subject: `Service-Formular — Ticket ${ticketNr} | Polendach24`,
                    html: htmlTemplate
                }
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Email send failed');

            toast.success(`E-Mail gesendet an ${emailTo}`);
            setIsEmailModalOpen(false);

            // Log in history
            await ServiceService.updateTicketWithHistory(
                ticket.id,
                {},
                `Service-Formular per E-Mail gesendet an: ${emailTo}`
            );
            ServiceService.getTicketHistory(ticket.id).then(setHistory).catch(console.error);
        } catch (err: any) {
            console.error('Email send error:', err);
            toast.error(`Błąd wysyłki: ${err.message || 'Nieznany błąd'}`);
        } finally {
            setSendingEmail(false);
        }
    };

    // ======= HELPERS =======
    const getStatusOption = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const getPriorityOption = (priority: string) => PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
    const getTypeOption = (type: string) => TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[4];

    if (loading) return <div className="p-8 text-center text-gray-500">Ładowanie...</div>;
    if (!ticket) return null;

    const statusOpt = getStatusOption(ticket.status);
    const priorityOpt = getPriorityOption(ticket.priority);
    const typeOpt = getTypeOption(ticket.type);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button onClick={() => navigate('/service')} className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 text-sm">
                        ← Powrót do serwisu
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{ticket.ticketNumber}</h1>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusOpt.color}`}>
                            {statusOpt.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityOpt.color}`}>
                            {priorityOpt.icon} {priorityOpt.label}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleOpenEmailModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Wyślij formularz mailem
                    </button>
                    <button
                        onClick={() => {
                            const url = `${window.location.origin}/service-form/${ticket.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Link skopiowany do schowka!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-blue-700 font-medium text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Kopiuj link
                    </button>
                    <button
                        onClick={async () => {
                            toast.loading('Generowanie PDF...', { id: 'pdf' });
                            try {
                                await generateServiceProtocol(ticket);
                                toast.success('PDF wygenerowany', { id: 'pdf' });
                            } catch (err) {
                                console.error('PDF error:', err);
                                toast.error('Błąd generowania PDF', { id: 'pdf' });
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Pobierz Protokół
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ===== LEFT COLUMN: Editable Info ===== */}
                <div className="space-y-5">

                    {/* Status & Priority */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status & Priorytet</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                                <select
                                    value={ticket.status}
                                    onChange={(e) => handleUpdateStatus(e.target.value as ServiceTicketStatus)}
                                    className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                                >
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Priorytet</label>
                                <select
                                    value={ticket.priority}
                                    onChange={(e) => handleFieldUpdate('priority', e.target.value, 'priorytet')}
                                    className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                                >
                                    {PRIORITY_OPTIONS.map(p => (
                                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Typ usterki</label>
                                <select
                                    value={ticket.type}
                                    onChange={(e) => handleFieldUpdate('type', e.target.value, 'typ usterki')}
                                    className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                                >
                                    {TYPE_OPTIONS.map(t => (
                                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Client Info (read-only) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Klient</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {ticket.client ? `${ticket.client.firstName?.[0] || ''}${ticket.client.lastName?.[0] || ''}` : '?'}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                        {ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : 'Brak danych'}
                                    </div>
                                    {ticket.client?.email && (
                                        <div className="text-xs text-gray-500">{ticket.client.email}</div>
                                    )}
                                </div>
                            </div>
                            {ticket.client?.phone && (
                                <a href={`tel:${ticket.client.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                                    📞 {ticket.client.phone}
                                </a>
                            )}
                            {(ticket.client?.street || ticket.client?.city) && (
                                <div className="text-sm text-gray-600 flex items-start gap-2">
                                    <span>📍</span>
                                    <span>{ticket.client?.street} {ticket.client?.houseNumber}, {ticket.client?.postalCode} {ticket.client?.city}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contract & Installation Links */}
                    {(ticket.contractId || ticket.installationId) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Powiązania</h3>
                            <div className="space-y-2">
                                {ticket.contract && (
                                    <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                                        <div>
                                            <div className="text-xs text-blue-500">Umowa</div>
                                            <div className="text-sm font-medium text-blue-800">{ticket.contract.contractNumber}</div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/contracts/${ticket.contractId}`)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Otwórz →
                                        </button>
                                    </div>
                                )}
                                {ticket.installation && (
                                    <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                                        <div>
                                            <div className="text-xs text-green-500">Montaż Źródłowy</div>
                                            <div className="text-sm font-medium text-green-800">{ticket.installation.productSummary}</div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/installations/${ticket.installationId}`)}
                                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                                        >
                                            Otwórz →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Photos */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zdjęcia ({ticket.photos.length})</h3>
                            <div>
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleResolutionPhotoUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="text-xs text-blue-600 font-medium hover:text-blue-800 disabled:opacity-50"
                                >
                                    {uploadingPhoto ? '⏳ Przesyłanie...' : '+ Dodaj zdjęcie'}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {ticket.photos.map((url, i) => (
                                <div key={i} className="group">
                                    <a href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-75 transition-opacity">
                                        <img src={url} className="w-full h-full object-cover" alt={`Zdjęcie ${i + 1}`} />
                                    </a>
                                    <input
                                        type="text"
                                        placeholder={`Opis zdjęcia ${i + 1}...`}
                                        defaultValue={ticket.photoCaptions?.[url] || ''}
                                        onBlur={async (e) => {
                                            const val = e.target.value.trim();
                                            const current = ticket.photoCaptions?.[url] || '';
                                            if (val !== current) {
                                                const updated = { ...(ticket.photoCaptions || {}), [url]: val };
                                                await ServiceService.updateTicketWithHistory(ticket.id, { photoCaptions: updated } as any);
                                                setTicket({ ...ticket, photoCaptions: updated });
                                                toast.success('Opis zapisany', { duration: 1200 });
                                            }
                                        }}
                                        className="mt-1.5 w-full text-xs border-gray-200 rounded-md py-1 px-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600 placeholder:text-gray-300"
                                    />
                                </div>
                            ))}
                            {ticket.photos.length === 0 && (
                                <span className="text-sm text-gray-400 col-span-2 text-center py-4">Brak zdjęć</span>
                            )}
                        </div>
                    </div>

                    {/* Client Notes (from public form) */}
                    {ticket.clientNotes && (
                        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
                            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">📩 Notatki od klienta</h3>
                            <div className="text-sm text-gray-700 whitespace-pre-line bg-blue-50 rounded-lg p-3 border border-blue-100">
                                {ticket.clientNotes}
                            </div>
                        </div>
                    )}

                    {/* Internal Notes (sales rep private) */}
                    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5">
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">📝 Notatki wewnętrzne (przedstawiciel)</h3>
                        <textarea
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 min-h-[100px] resize-y"
                            placeholder="Twoje notatki, obserwacje, ustalenia z klientem..."
                            defaultValue={ticket.internalNotes || ''}
                            onBlur={async (e) => {
                                if (e.target.value !== (ticket.internalNotes || '')) {
                                    await ServiceService.updateTicketWithHistory(ticket.id, { internalNotes: e.target.value } as any, 'Zaktualizowano notatki wewnętrzne');
                                    setTicket({ ...ticket, internalNotes: e.target.value });
                                    toast.success('Zapisano', { duration: 1500 });
                                }
                            }}
                        />
                        <p className="text-[10px] text-amber-500 mt-1">Widoczne tylko dla pracowników — nie trafia do klienta</p>
                    </div>
                </div>

                {/* ===== MIDDLE COLUMN: Description, Tasks & Execution ===== */}
                <div className="space-y-5">

                    {/* Editable Description */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Opis Usterki</h3>
                        <textarea
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y"
                            defaultValue={ticket.description}
                            placeholder="Opisz usterkę..."
                            onBlur={async (e) => {
                                if (e.target.value !== ticket.description) {
                                    await handleFieldUpdate('description', e.target.value, 'opis usterki');
                                }
                            }}
                        />
                    </div>

                    {/* Scheduling Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Planowanie</h3>
                            <button onClick={() => setIsAssignModalOpen(true)} className="text-xs text-blue-600 font-medium hover:text-blue-800">
                                {ticket.assignedTeam ? '✏️ Zmień' : '+ Przypisz'}
                            </button>
                        </div>

                        {/* Manual Contract Number */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nr umowy (ręczny)</label>
                            <input
                                type="text"
                                placeholder="np. PL/0123/01/2025"
                                defaultValue={ticket.contractNumber || ''}
                                onBlur={async (e) => {
                                    const val = e.target.value.trim();
                                    if (val !== (ticket.contractNumber || '')) {
                                        await handleFieldUpdate('contractNumber', val, 'numer umowy');
                                    }
                                }}
                                className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Dla starych zleceń — pojawi się w kalendarzu</p>
                        </div>

                        {ticket.assignedTeam ? (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                                        {ticket.assignedTeam.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-blue-900 text-sm">{ticket.assignedTeam.name}</div>
                                        <div className="text-[11px] text-blue-600">Zespół Serwisowy</div>
                                    </div>
                                </div>
                                <div className="text-sm text-blue-800 flex items-center gap-2 mt-2 bg-white/60 p-2 rounded">
                                    📅 {ticket.scheduledDate ? format(new Date(ticket.scheduledDate), 'EEEE, d MMMM yyyy', { locale: pl }) : 'Nieustalona data'}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <div className="text-gray-400 mb-3 text-sm">Brak przypisanego zespołu</div>
                                <button onClick={() => setIsAssignModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                                    🔧 Przypisz Termin
                                </button>
                            </div>
                        )}

                        {/* Quick date edit */}
                        <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Data serwisu</label>
                            <input
                                type="date"
                                value={ticket.scheduledDate ? ticket.scheduledDate.split('T')[0] : ''}
                                onChange={async (e) => {
                                    await handleFieldUpdate('scheduledDate', e.target.value, 'datę serwisu');
                                }}
                                className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Lista Czynności</h3>

                        <div className="space-y-1 mb-4">
                            {(ticket.tasks || []).map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className={`flex-1 text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {task.label}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {(ticket.tasks || []).length === 0 && <div className="text-sm text-gray-400 italic text-center py-3">Brak zadań</div>}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskLabel}
                                onChange={(e) => setNewTaskLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                placeholder="Dodaj zadanie..."
                                className="flex-1 text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskLabel.trim()}
                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Resolution Notes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notatki z Naprawy</h3>
                        <textarea
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y"
                            placeholder="Wpisz przebieg naprawy..."
                            defaultValue={ticket.resolutionNotes || ''}
                            onBlur={async (e) => {
                                if (e.target.value !== (ticket.resolutionNotes || '')) {
                                    await ServiceService.updateTicketWithHistory(ticket.id, { resolutionNotes: e.target.value }, "Zaktualizowano notatki z naprawy");
                                    setTicket({ ...ticket, resolutionNotes: e.target.value });
                                    toast.success('Zapisano', { duration: 1500 });
                                }
                            }}
                        />
                    </div>
                </div>

                {/* ===== RIGHT COLUMN: Timeline ===== */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Historia Zgłoszenia</h3>
                    <div className="relative border-l-2 border-gray-200 ml-2 space-y-5">
                        {/* Current Status Node */}
                        <div className="mb-4 ml-4">
                            <div className="absolute w-3 h-3 bg-green-500 rounded-full -left-[7px] mt-1.5 border-2 border-white shadow-sm"></div>
                            <span className="text-sm font-bold text-gray-900">Teraz</span>
                        </div>

                        {history.map((entry) => (
                            <div key={entry.id} className="ml-4 relative">
                                <div className="absolute w-2.5 h-2.5 bg-gray-300 rounded-full -left-[6.5px] mt-1.5 border-2 border-white"></div>
                                <div className="text-[11px] text-gray-400 mb-0.5">
                                    {format(entry.createdAt, 'dd.MM HH:mm')} • {entry.user?.firstName || 'System'}
                                </div>
                                <div className="text-sm text-gray-800">
                                    {entry.changeType === 'status' && (
                                        <span>Status: <span className="font-medium">{entry.oldValue}</span> → <span className="font-medium text-blue-700">{entry.newValue}</span></span>
                                    )}
                                    {entry.changeType === 'assignment' && (
                                        <span>Przypisanie: <span className="font-medium">{entry.newValue}</span></span>
                                    )}
                                    {entry.changeType === 'note' && (
                                        <span className="italic text-gray-600">"{entry.newValue}"</span>
                                    )}
                                    {entry.changeType === 'info' && (
                                        <span>{entry.newValue}</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Creation Node */}
                        <div className="ml-4">
                            <div className="absolute w-2.5 h-2.5 bg-gray-300 rounded-full -left-[6.5px] mt-1.5 border-2 border-white"></div>
                            <div className="text-[11px] text-gray-400 mb-0.5">
                                {format(ticket.createdAt, 'dd.MM.yyyy HH:mm')}
                            </div>
                            <div className="text-sm text-gray-800 font-medium">Utworzenie zgłoszenia</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">🔧 Zaplanuj Serwis</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zespół</label>
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Wybierz zespół...</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleAssignTeam}
                                disabled={!selectedTeam || !selectedDate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === EMAIL SEND MODAL === */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Wyślij formularz serwisowy
                            </h3>
                            <p className="text-green-100 text-sm mt-1">Link do formularza zostanie wysłany na podany e-mail</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail klienta *</label>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    placeholder="client@example.de"
                                    className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 text-sm px-3 py-2"
                                />
                                {ticket.client?.email && emailTo !== ticket.client.email && (
                                    <button
                                        type="button"
                                        onClick={() => setEmailTo(ticket.client?.email || '')}
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        Użyj e-mail klienta: {ticket.client.email}
                                    </button>
                                )}
                            </div>

                            {/* Email Preview */}
                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Podgląd wiadomości (DE)</div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p><strong>Temat:</strong> Service-Formular — Ticket {ticket.ticketNumber} | Polendach24</p>
                                    <hr className="border-gray-200" />
                                    <p>
                                        Sehr geehrte/r <strong>{ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : 'Kunde'}</strong>,
                                    </p>
                                    <p className="text-gray-600">
                                        vielen Dank für Ihre Kontaktaufnahme. Wir bitten Sie, das Service-Formular mit einer Problembeschreibung und Fotos auszufüllen.
                                    </p>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                        <p className="font-semibold mb-1">Wir bitten um:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                                            <li>Problembeschreibung</li>
                                            <li>So viele Fotos wie möglich</li>
                                            <li>Kontaktdaten & Wunschtermin</li>
                                        </ul>
                                    </div>
                                    <p className="text-gray-500 italic text-xs">Mit freundlichen Grüßen, Ihr Polendach24 Service-Team</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSendFormEmail}
                                disabled={!emailTo.trim() || sendingEmail}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                            >
                                {sendingEmail ? (
                                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Wysyłanie...</>
                                ) : (
                                    <>Wyślij e-mail</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
