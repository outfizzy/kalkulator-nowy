import type { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from './assets';
import type { BrandConfig } from '../config/brandConfig';

// Logo marki w PDF:
//   • DE (Polendach24): wbudowany LOGO_BASE64.
//   • PL (zadaszto.pl): plik /public/zadaszto-logo.png jeśli istnieje (ładowany w locie),
//     w przeciwnym razie rysowany wordmark „zadaszto.pl" (ciemny + mosiężne „.pl").
// Dzięki temu wystarczy wrzucić plik public/zadaszto-logo.png, by PDF użył prawdziwego logo
// — bez zmian w kodzie.

// Dokładne barwy marki zadaszto.pl (z favicon.svg): atrament #2B2F33, złoto #C4A76A
const BRASS: [number, number, number] = [196, 167, 106];
const INK: [number, number, number] = [43, 47, 51];

let plLogoCache: string | null | undefined; // undefined = nie próbowano, null = brak pliku

/** Wczytuje logo zadaszto.pl z /public/zadaszto-logo.png (data URL) lub null gdy brak. DE → null. */
export async function loadBrandLogo(brand: BrandConfig): Promise<string | null> {
    if (brand.key !== 'pl') return null; // DE używa wbudowanego LOGO_BASE64
    if (plLogoCache !== undefined) return plLogoCache;
    try {
        const res = await fetch('/zadaszto-logo.png');
        if (!res.ok) { plLogoCache = null; return null; }
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) { plLogoCache = null; return null; }
        plLogoCache = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
        return plLogoCache;
    } catch {
        plLogoCache = null;
        return null;
    }
}

/**
 * Rysuje logo marki w prostokącie (x,y,w,h).
 * @param plLogoData data URL logo PL (z loadBrandLogo) albo null → wtedy wordmark.
 */
export function drawBrandLogo(
    doc: jsPDF,
    brand: BrandConfig,
    x: number,
    y: number,
    w: number,
    h: number,
    font: string,
    plLogoData?: string | null,
): void {
    if (brand.key === 'pl') {
        if (plLogoData) {
            try {
                // Zachowaj proporcje logo w ramce (x,y,w,h) — bez zniekształceń
                const dx = x;
                let dw = w, dh = h, dy = y;
                try {
                    const props: any = (doc as any).getImageProperties(plLogoData);
                    if (props?.width && props?.height) {
                        const ratio = props.width / props.height;
                        dh = w / ratio;
                        if (dh > h) { dh = h; dw = h * ratio; }
                        dy = y + (h - dh) / 2; // wyśrodkuj w pionie
                    }
                } catch { /* brak getImageProperties — użyj pełnej ramki */ }
                doc.addImage(plLogoData, 'PNG', dx, dy, dw, dh);
                return;
            } catch { /* fallback na wordmark */ }
        }
        // Wordmark: „zadaszto" (atrament) + „.pl" (mosiądz)
        const size = Math.round(h * 1.35);
        const baseline = y + h * 0.62;
        doc.setFont(font, 'bold');
        doc.setFontSize(size);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text('zadaszto', x, baseline);
        const wWord = doc.getTextWidth('zadaszto');
        doc.setTextColor(BRASS[0], BRASS[1], BRASS[2]);
        doc.text('.pl', x + wWord, baseline);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        return;
    }
    // DE — wbudowane logo Polendach24
    try { doc.addImage(LOGO_BASE64.trim(), 'PNG', x, y, w, h); } catch { /* logo opcjonalne */ }
}
