import { supabase } from '../lib/supabase';
import type { Installation } from '../types';

export const EmailService = {
    async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to, subject, html }
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('EmailService Error:', error);
            return { success: false, error: error.message };
        }
    },

    async sendInstallationConfirmation(
        installation: Installation,
        clientEmail: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!installation.scheduledDate) {
            return { success: false, error: 'Brak daty montażu' };
        }

        const date = new Date(installation.scheduledDate).toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const address = `${installation.client.address}, ${installation.client.postalCode || ''} ${installation.client.city}`;
        const contractNo = installation.contractNumber || '---';

        const subject = `Potwierdzenie terminu montażu - Zamówienie ${contractNo}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; color: #334155; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
        .header { background: #f8fafc; padding: 20px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #6366f1; }
        .title { color: #1e293b; font-size: 20px; font-weight: bold; margin: 0; }
        .content { padding: 20px 0; }
        .info-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
        .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .value { font-size: 16px; color: #0f172a; font-weight: 600; margin-bottom: 10px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Potwierdzenie terminu montażu</h1>
            <p style="margin: 5px 0 0 0; color: #64748b;">Zamówienie nr ${contractNo}</p>
        </div>
        
        <div class="content">
            <p>Dzień dobry,</p>
            <p>Dziękujemy za zaufanie. Z przyjemnością potwierdzamy termin montażu Państwa zamówienia.</p>
            
            <div class="info-box">
                <div class="label">Produkt</div>
                <div class="value">${installation.productSummary}</div>
                
                <div class="label">Data Montażu</div>
                <div class="value">📅 ${date}</div>
                
                <div class="label">Adres</div>
                <div class="value">📍 ${address}</div>

                <div class="label">Przewidywany czas prac</div>
                <div class="value">⏱️ ${installation.expectedDuration || 1} dni</div>
            </div>

            <p>Nasza ekipa montażowa przyjedzie w godzinach porannych (zazwyczaj między 8:00 a 10:00).</p>
            <p>W razie jakichkolwiek pytań lub potrzeby zmiany terminu, prosimy o kontakt.</p>
        </div>

        <div class="footer">
            <p>Polendach24</p>
            <p>Wiadomość wygenerowana automatycznie. Prosimy nie odpowiadać na ten adres.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail(clientEmail, subject, html);
    },

    async sendCompletionEmail(
        installation: Installation,
        clientEmail: string
    ): Promise<{ success: boolean; error?: string }> {
        const contractNo = installation.contractNumber || '---';
        const subject = `Dziękujemy! Twój montaż został zakończony - Zamówienie ${contractNo}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; color: #334155; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
        .header { background: #f0fdf4; padding: 20px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #22c55e; }
        .title { color: #166534; font-size: 20px; font-weight: bold; margin: 0; }
        .content { padding: 20px 0; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">✅ Montaż Zakończony</h1>
            <p style="margin: 5px 0 0 0; color: #15803d;">Zamówienie nr ${contractNo}</p>
        </div>
        
        <div class="content">
            <p>Dzień dobry,</p>
            <p>Informujemy, że prace montażowe pod adresem <strong>${installation.client.address}</strong> zostały zakończone.</p>
            
            <p>Dziękujemy za wybór Polendach24. Mamy nadzieję, że są Państwo zadowoleni z efektu.</p>
            <p>Protokół odbioru został zapisany w naszym systemie.</p>
            
            <p>Wkrótce skontaktujemy się w sprawie końcowego rozliczenia.</p>
        </div>

        <div class="footer">
            <p>Polendach24</p>
            <p>Wiadomość wygenerowana automatycznie.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail(clientEmail, subject, html);
    },

    async sendServiceAcknowledgment(email: string, ticketNumber: string, description: string): Promise<{ success: boolean; error?: string }> {
        const subject = `Serviceanfrage erhalten - Ticket ${ticketNumber}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Serviceanfrage erhalten</h2>
                <p>Sehr geehrte Damen und Herren,</p>
                <p>wir haben Ihre Serviceanfrage erhalten. Unsere Technikabteilung wird sich umgehend darum kümmern.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold;">Ticket-Nummer: ${ticketNumber}</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #4b5563;">Beschreibung: ${description}</p>
                </div>

                <p>Wir werden Sie über den Status Ihrer Anfrage informieren.</p>
                
                <p>Mit freundlichen Grüßen,<br>Ihr Polendach24 Team</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="font-size: 12px; color: #9ca3af;">Dies ist eine automatisch generierte Nachricht.</p>
            </div>
        `;

        return this.sendEmail(email, subject, html);
    }
};
