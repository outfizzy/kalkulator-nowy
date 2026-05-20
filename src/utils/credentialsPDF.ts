import jsPDF from 'jspdf';

interface CredentialsData {
    firstName: string;
    lastName: string;
    login: string;
    email: string;
    password: string;
    role: string;
    appUrl: string;
    createdAt: string;
}

/**
 * Get business days (Mon-Fri) count in a given month
 */
export function getBusinessDaysInMonth(year: number, month: number): number {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let businessDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dow = new Date(year, month, day).getDay();
        if (dow >= 1 && dow <= 5) businessDays++;
    }
    return businessDays;
}

/**
 * Convert monthly salary to daily rate based on business days in current month
 */
export function monthlyToDailyRate(monthlySalary: number, year?: number, month?: number): {
    dailyRate: number;
    hourlyRate: number;
    businessDays: number;
    monthName: string;
} {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth();
    const businessDays = getBusinessDaysInMonth(y, m);
    const dailyRate = businessDays > 0 ? monthlySalary / businessDays : 0;
    const hourlyRate = dailyRate / 8; // standard 8h workday
    const monthName = new Date(y, m, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

    return {
        dailyRate: Math.round(dailyRate * 100) / 100,
        hourlyRate: Math.round(hourlyRate * 100) / 100,
        businessDays,
        monthName,
    };
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    sales_rep: 'Przedstawiciel Handlowy',
    sales_rep_pl: 'Przedstawiciel Handlowy PL',
    installer: 'Monter',
    b2b_partner: 'Partner B2B',
    b2b_manager: 'Manager B2B',
};

/**
 * Generate a professional PDF with login credentials for a new employee
 */
export function generateCredentialsPDF(data: CredentialsData): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageW = 210;
    const marginX = 25;
    const contentW = pageW - marginX * 2;
    let y = 25;

    // ─── Header bar ───────────────────────────────────
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageW, 45, 'F');

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('POLENDACH24', marginX, 22);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Dane dostępowe do systemu CRM', marginX, 33);

    y = 60;

    // ─── Welcome section ──────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`Witaj, ${data.firstName}!`, marginX, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    const welcomeLines = doc.splitTextToSize(
        'Poniżej znajdziesz swoje dane do logowania. Prosimy o zmianę hasła przy pierwszym logowaniu. Zachowaj ten dokument w bezpiecznym miejscu.',
        contentW
    );
    doc.text(welcomeLines, marginX, y);
    y += welcomeLines.length * 5 + 12;

    // ─── Credentials card ─────────────────────────────
    const cardY = y;
    const cardH = 85;

    // Card background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(marginX, cardY, contentW, cardH, 4, 4, 'FD');

    // Card title
    y = cardY + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('🔐  Dane logowania', marginX + 10, y);
    y += 3;

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX + 10, y, marginX + contentW - 10, y);
    y += 10;

    // Credential rows
    const drawRow = (label: string, value: string, isHighlight = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(label, marginX + 12, y);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        if (isHighlight) {
            doc.setTextColor(37, 99, 235); // blue-600
        } else {
            doc.setTextColor(15, 23, 42);
        }
        doc.text(value, marginX + 55, y);
        y += 11;
    };

    drawRow('Login:', data.login);
    drawRow('E-mail:', data.email, true);
    drawRow('Hasło:', data.password);
    drawRow('Rola:', ROLE_LABELS[data.role] || data.role);
    drawRow('Data utworzenia:', data.createdAt);

    y = cardY + cardH + 15;

    // ─── App URL section ──────────────────────────────
    // URL card
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(marginX, y, contentW, 25, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text('🌐  Adres aplikacji:', marginX + 10, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.textWithLink(data.appUrl, marginX + 55, y + 10, { url: data.appUrl });

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Otwórz powyższy link w przeglądarce i zaloguj się używając danych powyżej.', marginX + 10, y + 19);

    y += 35;

    // ─── Instructions ─────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('📋  Instrukcja logowania', marginX, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const instructions = [
        '1.  Otwórz stronę ' + data.appUrl + ' w przeglądarce',
        '2.  Wpisz swój login (e-mail): ' + data.email,
        '3.  Wpisz hasło podane powyżej',
        '4.  Po zalogowaniu zmień hasło w Ustawieniach → Zmiana hasła',
        '5.  W razie problemów skontaktuj się z administratorem systemu',
    ];

    instructions.forEach(line => {
        doc.text(line, marginX + 5, y);
        y += 7;
    });

    y += 8;

    // ─── Warning box ──────────────────────────────────
    doc.setFillColor(254, 243, 199); // yellow-100
    doc.setDrawColor(252, 211, 77); // yellow-300
    doc.roundedRect(marginX, y, contentW, 20, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14); // yellow-800
    doc.text('⚠️  WAŻNE', marginX + 10, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 63, 18);
    doc.text('Zmień hasło przy pierwszym logowaniu! Nie udostępniaj danych do logowania osobom trzecim.', marginX + 10, y + 15);

    // ─── Footer ───────────────────────────────────────
    const footerY = 282;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, footerY - 5, marginX + contentW, footerY - 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Dokument wygenerowany automatycznie przez system POLENDACH24 CRM', marginX, footerY);
    doc.text(`© ${new Date().getFullYear()} Polendach24.de — Wszystkie prawa zastrzeżone`, marginX, footerY + 4);
    doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, pageW - marginX, footerY, { align: 'right' });

    // ─── Save ─────────────────────────────────────────
    const filename = `dane_logowania_${data.firstName}_${data.lastName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename.replace(/\s+/g, '_'));
}
