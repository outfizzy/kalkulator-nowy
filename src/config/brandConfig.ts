/**
 * Centralna konfiguracja marek (single source of truth).
 *
 * Aplikacja sprzedaje aluminiowe zadaszenia pod dwiema markami tej samej firmy
 * (Polendach24 s.c.):
 *   • 'de' = Polendach24 (polendach24.de) — rynek niemiecki, EUR, język DE, VAT 19%.
 *   • 'pl' = zadaszto.pl — rynek polski, PLN, język PL, VAT 8%/23%.
 *
 * To TEN SAM podmiot prawny (NIP PL9261695520, to samo konto) — zmienia się
 * jedynie branding (nazwa handlowa, www, kontakt), język i waluta dokumentów.
 *
 * Wcześniej dane firmowe były rozproszone i zaszyte na sztywno w kilku plikach
 * (contractPDF, bestellscheinPDF, pdfGenerator, emailBrandKit). Generatory umów
 * korzystają teraz z tego configu.
 *
 * ⚠️ DO POTWIERDZENIA dla marki 'pl' (zadaszto.pl): telefon, e-mail oraz czy do
 *    płatności w PLN obowiązuje to samo (niemieckie) konto bankowe, czy osobne
 *    konto złotówkowe. Popraw poniżej — to jedyne miejsce, które trzeba zmienić.
 */

export type BrandKey = 'de' | 'pl';

export interface BrandCompany {
    /** Pełna nazwa prawna na dokumentach */
    legalName: string;
    /** Nazwa handlowa / marka w nagłówku */
    tradeName: string;
    address: string;
    /** NIP w formacie pokazywanym na dokumencie (DE: z prefiksem PL, PL: krajowy) */
    nip: string;
    phone: string;
    email: string;
    website: string;
    bank: string;
    iban: string;
    bic?: string;
    owners: string;
}

export interface BrandConfig {
    key: BrandKey;
    /** Etykieta w UI przełącznika */
    label: string;
    flag: string;
    language: 'de' | 'pl';
    currency: 'EUR' | 'PLN';
    /** Symbol waluty na dokumentach */
    currencySymbol: string;
    /** Locale do formatowania liczb/dat */
    locale: string;
    /** Dozwolone stawki VAT (ułamek). Pierwsza = domyślna. */
    vatRates: number[];
    defaultVatRate: number;
    /** Prefiks numeracji umów, np. UM/2026/001 albo ZAD/2026/001 */
    numberPrefix: string;
    company: BrandCompany;
}

export const BRANDS: Record<BrandKey, BrandConfig> = {
    de: {
        key: 'de',
        label: 'Polendach24',
        flag: '🇩🇪',
        language: 'de',
        currency: 'EUR',
        currencySymbol: '€',
        locale: 'de-DE',
        vatRates: [0.19],
        defaultVatRate: 0.19,
        numberPrefix: 'UM',
        company: {
            legalName: 'PolenDach24 S.C.',
            tradeName: 'Polendach24',
            address: 'Kolonia Walowice 221/33, 66-620 Gubin, Polen',
            nip: 'PL9261695520',
            phone: '+49 157 5064 6936',
            email: 'buero@polendach24.de',
            website: 'polendach24.de',
            bank: 'Sparkasse Spree-Neisse',
            iban: 'DE79 1805 0000 0190 1228 89',
            bic: 'WELADED1CBN',
            owners: 'Tomasz Fijołek, Mariusz Duź',
        },
    },
    pl: {
        key: 'pl',
        label: 'zadaszto.pl',
        flag: '🇵🇱',
        language: 'pl',
        currency: 'PLN',
        currencySymbol: 'zł',
        locale: 'pl-PL',
        vatRates: [0.23, 0.08],
        defaultVatRate: 0.23,
        numberPrefix: 'ZAD',
        company: {
            legalName: 'Polendach24 s.c.',
            tradeName: 'Zadaszto.pl',
            // Ten sam podmiot co Polendach24 s.c. (spółka cywilna z siedzibą w Gubinie).
            address: 'Kolonia Wałowice, Dz. Nr 221/33, 66-620 Gubin, Polska',
            nip: '9261695520',
            phone: '+48 533 459 475',
            email: 'biuro@zadaszto.pl',
            website: 'zadaszto.pl',
            // TODO(zadaszto.pl): potwierdź, czy płatności PLN idą na osobne konto złotówkowe.
            bank: 'Sparkasse Spree-Neisse',
            iban: 'DE79 1805 0000 0190 1228 89',
            bic: 'WELADED1CBN',
            owners: 'Tomasz Fijołek, Mariusz Duź',
        },
    },
};

/** Zwraca konfigurację marki; domyślnie 'de' dla zgodności wstecznej. */
export function getBrand(key?: string | null): BrandConfig {
    return key === 'pl' ? BRANDS.pl : BRANDS.de;
}

/** Normalizuje stawkę VAT do ułamka (0.19). Akceptuje 0.19, 1.19, 19, null. */
export function normalizeVat(raw: number | null | undefined, fallback = 0.19): number {
    if (raw == null || isNaN(raw) || raw <= 0) return fallback;
    if (raw >= 1 && raw < 2) return raw - 1; // mnożnik 1.19 → 0.19
    if (raw >= 2) return raw / 100;          // procent 19 → 0.19
    return raw;                              // już ułamek
}

/** Formatuje kwotę w walucie marki, np. "12 345,67 zł" lub "12.345,67 €". */
export function formatMoney(value: number, brand: BrandConfig): string {
    const n = (value || 0).toLocaleString(brand.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${n} ${brand.currencySymbol}`;
}
