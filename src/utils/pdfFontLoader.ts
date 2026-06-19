import type jsPDF from 'jspdf';

// Ładuje Roboto (pełne UTF-8: niemieckie umlauty + polskie znaki) do jsPDF
// w locie z /public/fonts — bez wbudowywania ~800 KB base64 w bundel JS.
// Historia: pdfFonts.ts zawierał uszkodzone dane, a jsPDF połyka błędy parsowania
// fontu (PubSub) i wywala się dopiero przy text() — stąd smoke-check poniżej.

let cachedFonts: { regular: string; bold: string } | null = null;

async function fetchFontBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

/**
 * Rejestruje Roboto w dokumencie i ustawia je jako aktywny font.
 * Zwraca nazwę fontu do użycia w setFont: 'Roboto' albo 'helvetica' (fallback,
 * gdy fontów nie udało się załadować — np. brak sieci albo uszkodzony plik).
 */
export async function ensureUnicodeFont(doc: jsPDF): Promise<string> {
    try {
        if (!cachedFonts) {
            const [regular, bold] = await Promise.all([
                fetchFontBase64('/fonts/Roboto-Regular.ttf'),
                fetchFontBase64('/fonts/Roboto-Bold.ttf'),
            ]);
            cachedFonts = { regular, bold };
        }
        doc.addFileToVFS('Roboto-Regular.ttf', cachedFonts.regular);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', cachedFonts.bold);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto', 'normal');
        // Smoke-check: wymusza użycie zarejestrowanego fontu — jeśli dane były
        // uszkodzone, TUTAJ poleci wyjątek zamiast w połowie renderowania
        doc.getTextWidth('äöüßłżą');
        doc.setFont('Roboto', 'bold');
        doc.getTextWidth('äöüßłżą');
        doc.setFont('Roboto', 'normal');
        return 'Roboto';
    } catch (e) {
        console.warn('[pdfFontLoader] Roboto niedostępne, fallback na helvetica:', e);
        cachedFonts = null;
        doc.setFont('helvetica', 'normal');
        return 'helvetica';
    }
}
